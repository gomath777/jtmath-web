import 'server-only';

import type { PrivateTutorGuideObjectPort } from './private-tutor-guide-asset-store';
import type { WebSupabaseDataClient } from './web-conversation-supabase';
import type { SupabaseResult, WebSupabaseQueryBuilder, WebSupabaseQueryStarter } from './web-conversation-supabase-core';

export type WebSupabaseReadinessResult = {
  readonly data: unknown;
  readonly error: { readonly code?: string; readonly message?: string } | null;
};

export interface WebSupabaseReadinessClient {
  readonly from: (table: string) => {
    readonly select: (columns: string) => {
      readonly limit: (count: number) => PromiseLike<WebSupabaseReadinessResult>;
    };
  };
}

export async function verifyWebConversationPersistenceReady(
  client: WebSupabaseReadinessClient,
): Promise<boolean> {
  const results = await Promise.all([
    checkTable(client, 'ai_tutor_web_conversations'),
    checkTable(client, 'ai_tutor_web_turns'),
  ]);
  return results.every((ready) => ready);
}

export function toWebSupabaseDataClient(client: unknown): WebSupabaseDataClient {
  return { from: (table) => queryStarter(callMethod(client, 'from', table)) };
}

export function toWebSupabaseReadinessClient(client: unknown): WebSupabaseReadinessClient {
  return {
    from: (table) => ({
      select: (columns) => ({
        limit: (count) => queryBuilder(callMethod(callMethod(client, 'from', table), 'select', columns)).limit(count),
      }),
    }),
  };
}

export function createSupabasePrivateTutorGuideObjectPort(client: unknown): PrivateTutorGuideObjectPort {
  return {
    readPrivateObject: async (input) => {
      const bucket = storageBucket(client, input.bucket);
      if (bucket === null) return { ok: false, reason: 'not_found' };
      const result = await bucket.download(input.objectKey);
      if (result.error !== null) return { ok: false, reason: 'not_found' };
      const bytes = await bytesFromDownloadedObject(result.data);
      return bytes === null
        ? { ok: false, reason: 'not_found' }
        : { ok: true, bytes, mimeType: mimeTypeFor(input.objectKey) };
    },
  };
}

async function checkTable(client: WebSupabaseReadinessClient, table: string): Promise<boolean> {
  const result = await client.from(table).select('id').limit(1);
  return result.error === null;
}

type StorageBucket = {
  readonly download: (path: string) => PromiseLike<{ readonly data: unknown; readonly error: unknown }>;
};

function storageBucket(client: unknown, bucket: string): StorageBucket | null {
  const root = record(client);
  const storage = record(root?.['storage']);
  const from = storage?.['from'];
  if (typeof from !== 'function') return null;
  const source = from.call(storage, bucket);
  const download = record(source)?.['download'];
  return typeof download === 'function' ? { download: (path) => download.call(source, path) } : null;
}

async function bytesFromDownloadedObject(value: unknown): Promise<Uint8Array | null> {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  return null;
}

function mimeTypeFor(objectKey: string): string {
  return objectKey.endsWith('.json') ? 'application/json' : 'image/png';
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function queryStarter(source: unknown): WebSupabaseQueryStarter {
  return {
    select: (columns, options) => queryBuilder(callMethod(source, 'select', columns, options)),
    insert: (payload) => queryBuilder(callMethod(source, 'insert', payload)),
    upsert: (payload, options) => queryBuilder(callMethod(source, 'upsert', payload, options)),
    update: (payload) => queryBuilder(callMethod(source, 'update', payload)),
  };
}

function queryBuilder(source: unknown): WebSupabaseQueryBuilder {
  return {
    select: (columns, options) => queryBuilder(callMethod(source, 'select', columns, options)),
    eq: (column, value) => queryBuilder(callMethod(source, 'eq', column, value)),
    is: (column, value) => queryBuilder(callMethod(source, 'is', column, value)),
    lt: (column, value) => queryBuilder(callMethod(source, 'lt', column, value)),
    order: (column, options) => queryBuilder(callMethod(source, 'order', column, options)),
    limit: (count) => queryBuilder(callMethod(source, 'limit', count)),
    maybeSingle: () => Promise.resolve(callMethod(source, 'maybeSingle')).then(parseSupabaseResult),
    single: () => Promise.resolve(callMethod(source, 'single')).then(parseSupabaseResult),
    then: (onfulfilled, onrejected) => Promise.resolve(source).then(parseSupabaseResult).then(onfulfilled, onrejected),
  };
}

function callMethod(source: unknown, name: string, ...args: readonly unknown[]): unknown {
  const method = record(source)?.[name];
  return typeof method === 'function' ? method.call(source, ...args) : { data: null, error: { code: 'adapter_shape' } };
}

function parseSupabaseResult(value: unknown): SupabaseResult<unknown> {
  const result = record(value);
  const error = result === null ? { code: 'adapter_shape' } : parseError(result['error']);
  return {
    data: result?.['data'] ?? null,
    error,
    count: typeof result?.['count'] === 'number' ? result['count'] : null,
  };
}

function parseError(value: unknown): SupabaseResult<unknown>['error'] {
  if (value === null) return null;
  const error = record(value);
  return error === null
    ? { code: 'adapter_shape' }
    : {
        code: typeof error['code'] === 'string' ? error['code'] : undefined,
        message: typeof error['message'] === 'string' ? error['message'] : undefined,
      };
}
