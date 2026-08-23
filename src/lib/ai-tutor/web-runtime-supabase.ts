import type { PrivateTutorGuideObjectPort, PrivateTutorGuideObjectRead } from './private-tutor-guide-asset-store';
import type {
  WebSupabaseDataClient,
  WebSupabaseQueryStarter,
} from './web-conversation-supabase-core';

export type WebSupabaseReadinessRow = {
  readonly data: unknown;
  readonly error: Readonly<{ code?: string }> | null;
};

export type WebSupabaseReadinessResult = {
  readonly then: (resolve: (value: WebSupabaseReadinessRow) => void) => void;
};

export type WebSupabaseReadinessClient = {
  readonly from: (table: string) => {
    readonly select: (columns: string) => {
      readonly limit: (count: number) => WebSupabaseReadinessResult;
    };
  };
};

type SupabaseStorageClient = {
  readonly storage: {
    readonly from: (bucket: string) => {
      readonly download: (objectKey: string) => PromiseLike<Readonly<{ data: Blob | null; error: unknown | null }>>;
    };
  };
};

export function toWebSupabaseDataClient(client: unknown): WebSupabaseDataClient {
  const narrowed = client as { readonly from: (table: string) => WebSupabaseQueryStarter };
  return { from: (table) => narrowed.from(table) };
}

export async function verifyWebConversationPersistenceReady(client: WebSupabaseReadinessClient): Promise<boolean> {
  const conversations = await client.from('ai_tutor_web_conversations').select('id').limit(1);
  if (conversations.error !== null) return false;
  const turns = await client.from('ai_tutor_web_turns').select('id').limit(1);
  return turns.error === null;
}

export function createSupabasePrivateTutorGuideObjectPort(client: unknown): PrivateTutorGuideObjectPort {
  const narrowed = client as SupabaseStorageClient;
  return {
    readPrivateObject: async ({ bucket, objectKey }) => {
      const result = await narrowed.storage.from(bucket).download(objectKey);
      if (result.error !== null || result.data === null) return { ok: false, reason: 'not_found' };
      return blobToPrivateObject(result.data);
    },
  };
}

function blobToPrivateObject(blob: Blob): Promise<PrivateTutorGuideObjectRead> {
  return blob.arrayBuffer().then((buffer) => ({
    ok: true,
    bytes: new Uint8Array(buffer),
    mimeType: blob.type,
  }));
}

export type { WebSupabaseDataClient, WebSupabaseQueryStarter };
