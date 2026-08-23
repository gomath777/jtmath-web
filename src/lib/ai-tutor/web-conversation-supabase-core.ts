import { z } from 'zod';
import type {
  WebConversationRepositoryErrorCode,
  WebConversationRepositoryResult,
} from './web-conversation-repository';

export type SupabaseDbError = {
  readonly code?: string;
  readonly message?: string;
};

export type SupabaseResult<Row> = {
  readonly data: Row | null;
  readonly error: SupabaseDbError | null;
  readonly count?: number | null;
};

export interface WebSupabaseQueryStarter {
  select(columns: string, options?: { readonly count?: 'exact'; readonly head?: boolean }): WebSupabaseQueryBuilder;
  insert(payload: unknown): WebSupabaseQueryBuilder;
  upsert(payload: unknown, options?: { readonly onConflict?: string }): WebSupabaseQueryBuilder;
  update(payload: unknown): WebSupabaseQueryBuilder;
}

export interface WebSupabaseQueryBuilder extends PromiseLike<SupabaseResult<unknown>> {
  select(columns: string, options?: { readonly count?: 'exact'; readonly head?: boolean }): WebSupabaseQueryBuilder;
  eq(column: string, value: unknown): WebSupabaseQueryBuilder;
  is(column: string, value: null): WebSupabaseQueryBuilder;
  lt(column: string, value: string): WebSupabaseQueryBuilder;
  order(column: string, options?: { readonly ascending?: boolean }): WebSupabaseQueryBuilder;
  limit(count: number): WebSupabaseQueryBuilder;
  maybeSingle(): PromiseLike<SupabaseResult<unknown>>;
  single(): PromiseLike<SupabaseResult<unknown>>;
}

export type WebSupabaseDataClient = {
  readonly from: (table: string) => WebSupabaseQueryStarter;
};

export async function readOne<Parsed, Value>(
  operation: string,
  schema: z.ZodType<Parsed>,
  query: PromiseLike<SupabaseResult<unknown>>,
  map: (row: Parsed) => Value,
): Promise<WebConversationRepositoryResult<Value>> {
  const result = await query;
  if (result.error !== null) return fail(operation, result.error);
  return parseOne(operation, schema, result.data, map);
}

export async function readMaybe<Parsed, Value>(
  operation: string,
  schema: z.ZodType<Parsed>,
  query: PromiseLike<SupabaseResult<unknown>>,
  map: (row: Parsed) => Value,
): Promise<WebConversationRepositoryResult<Value | null>> {
  const result = await query;
  if (result.error !== null) return fail(operation, result.error);
  if (result.data === null) return { ok: true, value: null };
  return parseOne(operation, schema, result.data, map);
}

export async function readMany<Parsed, Value>(
  operation: string,
  schema: z.ZodType<Parsed>,
  query: PromiseLike<SupabaseResult<unknown>>,
  map: (rows: readonly Parsed[]) => Value,
): Promise<WebConversationRepositoryResult<Value>> {
  const result = await query;
  if (result.error !== null) return fail(operation, result.error);
  const parsed = z.array(schema).safeParse(result.data ?? []);
  return parsed.success ? { ok: true, value: map(parsed.data) } : invalid(operation);
}

export function parseOne<Parsed, Value>(
  operation: string,
  schema: z.ZodType<Parsed>,
  data: unknown,
  map: (row: Parsed) => Value,
): WebConversationRepositoryResult<Value> {
  const parsed = schema.safeParse(data);
  return parsed.success ? { ok: true, value: map(parsed.data) } : invalid(operation);
}

export function invalid(operation: string): WebConversationRepositoryResult<never> {
  return { ok: false, error: { code: 'invalid_response', operation } };
}

export function fail(operation: string, error: SupabaseDbError): WebConversationRepositoryResult<never> {
  return { ok: false, error: { code: mapDbError(error), operation } };
}

export function mapDbError(error: SupabaseDbError): WebConversationRepositoryErrorCode {
  switch (error.code) {
    case '23505':
      return 'conflict';
    case '23503':
    case '42501':
      return 'permission_denied';
    case 'PGRST116':
      return 'not_found';
    case '503':
    case '57014':
      return 'unavailable';
    default:
      return 'unknown';
  }
}
