import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { AiTutorConfig } from './config';
import { createGeminiTutorProvider } from './gemini-provider';
import { createPreviewWebAdmission, type PreviewWebAdmission } from './web-admission';
import { readWebStudentCookie, verifyStrictWebStudentToken } from './web-auth';
import { parseWebAiTutorConfig, type EnabledWebAiTutorConfig, type WebAiTutorEnvironment } from './web-config';
import { createWebAiTutorPost } from './web-handler';
import type { WebLessonContextQueryPort } from './web-lesson-context';
import type { WebPdfFetchPort } from './web-material';
import { WebTutorRequestSchema } from './web-input';
import { createSupabaseWebLessonPort } from './web-route-supabase';
import type { WebTutorRoutedProvider } from './web-provider-routing';
import { createSupabaseWebConversationRepository } from './web-conversation-supabase';
import type { WebConversationRepository } from './web-conversation-repository';
import {
  createDefaultWebAiTutorRuntimeDependencies,
  type WebAiTutorRuntimeDependencies,
  type WebAiTutorRuntimeDependenciesResult,
} from './web-runtime-readiness';
import { toWebSupabaseDataClient } from './web-runtime-supabase-adapter';

export type WebAiTutorRouteEnvironment = WebAiTutorEnvironment & Readonly<Record<string, string | undefined>>;

export type WebAiTutorRouteConstructors = {
  readonly createRuntimeDependencies?: (config: EnabledWebAiTutorConfig) => Promise<WebAiTutorRuntimeDependenciesResult>;
  readonly createLessonPort: () => WebLessonContextQueryPort;
  readonly createConversationRepository?: () => WebConversationRepository;
  readonly createAdmission: (secret: string) => PreviewWebAdmission;
  readonly createProvider: (config: EnabledWebAiTutorConfig) => WebTutorRoutedProvider;
};

export type WebAiTutorRouteOptions = {
  readonly env: WebAiTutorRouteEnvironment;
  readonly constructors?: WebAiTutorRouteConstructors;
  readonly fetchPort?: WebPdfFetchPort;
  readonly now?: () => Date;
};

export function createWebAiTutorRoutePost(options: WebAiTutorRouteOptions): (request: Request) => Promise<Response> {
  let cachedAdmission: Readonly<{ secret: string; admission: PreviewWebAdmission }> | undefined;
  let cachedRuntimeDependencies: Readonly<{ key: string; dependencies: WebAiTutorRuntimeDependencies }> | undefined;
  return async (request) => {
    const env = options.env;
    const config = parseWebAiTutorConfig(env);
    if (!config.ok || config.config.status !== 'enabled') {
      return Response.json({ status: 'disabled', message: 'AI 튜터를 사용할 수 없습니다.' }, { status: 404 });
    }
    const secret = env.STUDENT_TOKEN_SECRET ?? '';
    const token = readWebStudentCookie(request.headers.get('cookie'));
    if (token === null) return Response.json({ status: 'unauthorized', message: '다시 로그인해 주세요.' }, { status: 401 });
    const now = options.now?.() ?? new Date();
    const identity = await verifyStrictWebStudentToken({
      token,
      secret,
      nowSeconds: Math.floor(now.getTime() / 1000),
    });
    if (identity === null) return Response.json({ status: 'unauthorized', message: '다시 로그인해 주세요.' }, { status: 401 });
    const body = await readJson(request);
    if (body === invalidJson || !WebTutorRequestSchema.safeParse(body).success) {
      return Response.json({ status: 'invalid_request', message: '요청 형식이 올바르지 않습니다.' }, { status: 422 });
    }

    const constructors = options.constructors ?? defaultConstructors(env);
    const runtimeDependencies = await getCachedRuntimeDependencies({
      constructors,
      config: config.config,
      env,
      cached: cachedRuntimeDependencies,
      update: (next) => {
        cachedRuntimeDependencies = next;
      },
    });
    if (!runtimeDependencies.ok) {
      return Response.json({ status: 'disabled', message: 'AI 튜터를 사용할 수 없습니다.' }, { status: 404 });
    }
    const provider = constructors.createProvider(config.config);
    const handler = createWebAiTutorPost({
      env,
      studentTokenSecret: secret,
      lessonPort: runtimeDependencies.dependencies.lessonPort,
      conversationRepository: runtimeDependencies.dependencies.conversationRepository,
      admission: getRouteAdmission({ constructors, secret, cached: cachedAdmission, update: (next) => {
        cachedAdmission = next;
      } }),
      provider,
      fetchPort: options.fetchPort,
      guideStore: runtimeDependencies.dependencies.guideStore,
      problemImageStore: runtimeDependencies.dependencies.problemImageStore,
      secureCookie: process.env.NODE_ENV === 'production',
      now: () => now,
    });
    return handler(replayJsonRequest(request, body));
  };
}

async function getCachedRuntimeDependencies(input: Readonly<{
  readonly constructors: WebAiTutorRouteConstructors;
  readonly config: EnabledWebAiTutorConfig;
  readonly env: WebAiTutorRouteEnvironment;
  readonly cached: Readonly<{ key: string; dependencies: WebAiTutorRuntimeDependencies }> | undefined;
  readonly update: (next: Readonly<{ key: string; dependencies: WebAiTutorRuntimeDependencies }>) => void;
}>): Promise<WebAiTutorRuntimeDependenciesResult> {
  const key = runtimeDependenciesCacheKey(input.env, input.config);
  if (input.cached?.key === key) return { ok: true, dependencies: input.cached.dependencies };
  const result = await getRuntimeDependencies(input.constructors, input.config);
  if (result.ok) input.update({ key, dependencies: result.dependencies });
  return result;
}

function runtimeDependenciesCacheKey(
  env: WebAiTutorRouteEnvironment,
  config: EnabledWebAiTutorConfig,
): string {
  return JSON.stringify({
    runtime: config.runtime,
    supabaseUrlFingerprint: fingerprint(env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceKeyFingerprint: fingerprint(env.SUPABASE_SERVICE_KEY),
  });
}

function fingerprint(value: string | undefined): string {
  return createHash('sha256').update(value ?? '').digest('base64url');
}

async function getRuntimeDependencies(
  constructors: WebAiTutorRouteConstructors,
  config: EnabledWebAiTutorConfig,
): Promise<WebAiTutorRuntimeDependenciesResult> {
  if (constructors.createRuntimeDependencies !== undefined) {
    return constructors.createRuntimeDependencies(config);
  }
  return {
    ok: true,
    dependencies: {
      lessonPort: constructors.createLessonPort(),
      conversationRepository: constructors.createConversationRepository?.(),
      guideStore: undefined,
      problemImageStore: undefined,
    },
  };
}

function getRouteAdmission(input: {
  readonly constructors: WebAiTutorRouteConstructors;
  readonly secret: string;
  readonly cached: Readonly<{ secret: string; admission: PreviewWebAdmission }> | undefined;
  readonly update: (next: Readonly<{ secret: string; admission: PreviewWebAdmission }>) => void;
}): PreviewWebAdmission {
  if (input.cached !== undefined && input.cached.secret === input.secret) return input.cached.admission;
  const admission = input.constructors.createAdmission(input.secret);
  input.update({ secret: input.secret, admission });
  return admission;
}

const defaultRetentionDays = { rawContent: 90, image: 30, metadata: 365 } as const;

function defaultConstructors(env: WebAiTutorRouteEnvironment): WebAiTutorRouteConstructors {
  return {
    createRuntimeDependencies: (config) => createDefaultWebAiTutorRuntimeDependencies(env, config),
    createLessonPort: () => {
      const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL ?? '', env.SUPABASE_SERVICE_KEY ?? '', {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      return createSupabaseWebLessonPort(supabase);
    },
    createConversationRepository: () => {
      const supabase: unknown = createClient(env.NEXT_PUBLIC_SUPABASE_URL ?? '', env.SUPABASE_SERVICE_KEY ?? '', {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      return createSupabaseWebConversationRepository(toWebSupabaseDataClient(supabase));
    },
    createAdmission: (secret) => createPreviewWebAdmission({ secret }),
    createProvider: (config) => createGeminiTutorProvider({ config: toGeminiConfig(config), apiKey: env.GEMINI_API_KEY ?? '' }),
  };
}

function toGeminiConfig(config: EnabledWebAiTutorConfig): AiTutorConfig {
  return {
    status: 'enabled',
    enabled: true,
    paidBillingConfirmed: true,
    textModel: { id: config.models.fast.id, alias: 'text' },
    visionModel: { id: config.models.fast.id, alias: 'vision' },
    fallbackModel: { id: config.models.fallback.id, alias: 'fallback' },
    modelTimeoutMs: config.modelTimeoutMs,
    caps: config.caps,
    image: { maxBytes: 5 * 1024 * 1024 },
    retentionDays: defaultRetentionDays,
    geminiApiKey: { present: true },
    pairingHmacSecret: { present: true },
  };
}

async function readJson(request: Request): Promise<unknown | typeof invalidJson> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof Error) return invalidJson;
    throw error;
  }
}

const invalidJson = Symbol('invalidJson');

function replayJsonRequest(request: Request, body: unknown): Request {
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(body),
  });
}
