import { JWT } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';
import { downloadSingleChatImage, type ChatMediaDownloadPort, type ChatMediaTokenPort } from './chat-media';
import { resolveTutorContext } from './context';
import { createTutorEngine } from './engine';
import { createGeminiTutorProvider } from './gemini-provider';
import { normalizeTutorImage } from './image-pipeline';
import { storePrivateTutorImage, type PrivateImageMetadataPort, type PrivateImageStoragePort } from './private-storage';
import type { GoogleChatAiTutorDependenciesInput, GoogleChatAiTutorDependenciesResult } from './runtime';
import { createSupabaseAiTutorContextSource, type SupabaseAiTutorClient, type SupabaseAiTutorQueryStart } from './supabase-context-source';
import { createSupabaseAiTutorRepository, type SupabaseDataClient, type SupabaseQueryStarter } from './supabase-repository';

type RequiredRuntimeEnv = {
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
  readonly geminiApiKey: string;
  readonly pairingHmacSecret: string;
  readonly mediaClientEmail: string;
  readonly mediaPrivateKey: string;
};

class GoogleChatMediaDownloadError extends Error {
  readonly name = 'GoogleChatMediaDownloadError';
}

export function createGoogleChatAiTutorDependencies(
  input: GoogleChatAiTutorDependenciesInput,
): GoogleChatAiTutorDependenciesResult {
  if (input.config.status !== 'enabled') return { ok: false };
  const env = readRuntimeEnv(input.env);
  if (env === null) return { ok: false };

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const dataClient: SupabaseDataClient = { from: createFromPort(supabase) };
  const contextClient: SupabaseAiTutorClient = { from: createContextFromPort(supabase) };
  const repository = createSupabaseAiTutorRepository(dataClient);
  const source = createSupabaseAiTutorContextSource({ supabase: contextClient });
  const storagePort = createSupabasePrivateImageStoragePort(supabase);
  const metadataPort = createRepositoryImageMetadataPort(repository);
  const provider = createGeminiTutorProvider({ config: input.config, apiKey: env.geminiApiKey });

  return {
    ok: true,
    value: {
      repository,
      hmacSecret: env.pairingHmacSecret,
      engine: createTutorEngine({ provider }),
      contextProvider: {
        load: async (profileId) => {
          const result = await resolveTutorContext({
            profileId,
            source,
            caps: input.config.caps,
          });
          return result.context;
        },
      },
      imageProcessor: {
        process: async (event, profileId, turnId) => {
          const downloaded = await downloadSingleChatImage({
            attachments: event.attachments,
            maxBytes: input.config.image.maxBytes,
            tokenPort: createGoogleChatMediaTokenPort(env),
            mediaPort: createGoogleChatMediaDownloadPort(),
          });
          if (!downloaded.ok) return { ok: false, outcome: downloaded.outcome };
          const normalized = await normalizeTutorImage({
            bytes: downloaded.value.bytes,
            declaredMimeType: downloaded.value.declaredMimeType,
            maxBytes: input.config.image.maxBytes,
          });
          if (!normalized.ok) return { ok: false, outcome: normalized.outcome };
          const stored = await storePrivateTutorImage({
            profileId,
            turnId,
            attachmentResourceName: downloaded.value.resourceName,
            declaredMimeType: downloaded.value.declaredMimeType,
            normalized: normalized.value,
            storagePort,
            metadataPort,
          });
          return stored.ok ? { ok: true, image: stored.value.image } : { ok: false, outcome: stored.outcome };
        },
      },
    },
  };
}

function readRuntimeEnv(env: GoogleChatAiTutorDependenciesInput['env']): RequiredRuntimeEnv | null {
  const values = {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceKey: env.SUPABASE_SERVICE_KEY,
    geminiApiKey: env.GEMINI_API_KEY,
    pairingHmacSecret: env.AI_TUTOR_PAIRING_HMAC_SECRET,
    mediaClientEmail: env.GOOGLE_CHAT_MEDIA_CLIENT_EMAIL,
    mediaPrivateKey: env.GOOGLE_CHAT_MEDIA_PRIVATE_KEY,
  };
  return Object.values(values).every(hasText)
    ? {
        supabaseUrl: values.supabaseUrl ?? '',
        supabaseServiceKey: values.supabaseServiceKey ?? '',
        geminiApiKey: values.geminiApiKey ?? '',
        pairingHmacSecret: values.pairingHmacSecret ?? '',
        mediaClientEmail: values.mediaClientEmail ?? '',
        mediaPrivateKey: normalizePrivateKey(values.mediaPrivateKey ?? ''),
      }
    : null;
}

function createGoogleChatMediaTokenPort(env: RequiredRuntimeEnv): ChatMediaTokenPort {
  return {
    getAppAccessToken: async (input) => {
      const client = new JWT({
        email: env.mediaClientEmail,
        key: env.mediaPrivateKey,
        scopes: [...input.scopes],
      });
      const credentials = await client.authorize();
      return credentials.access_token
        ? { ok: true, value: { accessToken: credentials.access_token } }
        : { ok: false, error: { code: 'unavailable' } };
    },
  };
}

function createGoogleChatMediaDownloadPort(): ChatMediaDownloadPort {
  return {
    downloadAttachment: async function* (input) {
      const response = await fetch(`https://chat.googleapis.com/v1/${input.resourceName}?alt=media`, {
        headers: { authorization: `Bearer ${input.accessToken}` },
      });
      if (!response.ok || response.body === null) throw new GoogleChatMediaDownloadError();
      const reader = response.body.getReader();
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) return;
        yield chunk.value;
      }
    },
  };
}

function createSupabasePrivateImageStoragePort(supabase: Pick<ReturnType<typeof createClient>, 'storage'>): PrivateImageStoragePort {
  return {
    uploadPrivateObject: async (input) => {
      const { error } = await supabase.storage
        .from(input.bucket)
        .upload(input.objectPath, input.bytes, { contentType: input.contentType, upsert: input.upsert });
      return error ? { ok: false, error: { code: 'storage_unavailable' } } : { ok: true };
    },
  };
}

function createFromPort(supabase: Pick<ReturnType<typeof createClient>, 'from'>): (table: string) => SupabaseQueryStarter {
  return (table) => supabase.from(table);
}

function createContextFromPort(supabase: Pick<ReturnType<typeof createClient>, 'from'>): (table: string) => SupabaseAiTutorQueryStart<unknown> {
  return (table) => supabase.from(table);
}

function createRepositoryImageMetadataPort(
  repository: ReturnType<typeof createSupabaseAiTutorRepository>,
): PrivateImageMetadataPort {
  return {
    recordPrivateImage: async (input) => {
      const result = await repository.recordAttachment(input);
      return result.ok ? { ok: true } : { ok: false, error: { code: 'metadata_unavailable' } };
    },
  };
}

function hasText(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, '\n');
}
