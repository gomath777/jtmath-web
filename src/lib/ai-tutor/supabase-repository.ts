import { z } from 'zod';
import {
  duplicateFallbackResult,
  storedAnswerFromTurn,
  type AiTutorClaimResult,
  type AiTutorConversation,
  type AiTutorRepository,
  type AiTutorRepositoryErrorCode,
  type AiTutorRepositoryResult,
  type AiTutorRetentionCandidates,
} from './repository';
import {
  AttachmentRow,
  ConversationRow,
  IdRow,
  IdentityRow,
  RecentTurnRow,
  ReviewRow,
  TurnRow,
  toAttachment,
  toConversation,
  toIdentity,
  toRecentTurns,
  toReviewTurns,
  toTurn,
  turnColumns,
} from './supabase-repository-rows';

type SupabaseDbError = {
  readonly code?: string;
  readonly message?: string;
};
type SupabaseResult<Row> = {
  readonly data: Row | null;
  readonly error: SupabaseDbError | null;
  readonly count?: number | null;
};
export interface SupabaseQueryStarter {
  select(columns: string, options?: { readonly count?: 'exact'; readonly head?: boolean }): SupabaseQueryBuilder;
  insert(payload: unknown): SupabaseQueryBuilder;
  upsert(payload: unknown, options?: { readonly onConflict?: string }): SupabaseQueryBuilder;
  update(payload: unknown): SupabaseQueryBuilder;
}
export interface SupabaseQueryBuilder extends PromiseLike<SupabaseResult<unknown>> {
  select(columns: string, options?: { readonly count?: 'exact'; readonly head?: boolean }): SupabaseQueryBuilder;
  eq(column: string, value: unknown): SupabaseQueryBuilder;
  overlaps(column: string, value: readonly string[]): SupabaseQueryBuilder;
  gte(column: string, value: string): SupabaseQueryBuilder;
  lt(column: string, value: string): SupabaseQueryBuilder;
  is(column: string, value: null): SupabaseQueryBuilder;
  order(column: string, options?: { readonly ascending?: boolean }): SupabaseQueryBuilder;
  limit(count: number): SupabaseQueryBuilder;
  maybeSingle(): PromiseLike<SupabaseResult<unknown>>;
  single(): PromiseLike<SupabaseResult<unknown>>;
}
export type SupabaseDataClient = {
  readonly from: (table: string) => SupabaseQueryStarter;
};

export function createSupabaseAiTutorRepository(client: SupabaseDataClient): AiTutorRepository {
  return {
    lookupIdentity: async ({ chatUserName }) => readMaybe('lookup_identity', IdentityRow, client.from('ai_tutor_identities').select('id, chat_user_name, profile_id, status').eq('chat_user_name', chatUserName).maybeSingle(), toIdentity),
    createPendingIdentity: async (input) => readOne('create_pending_identity', IdentityRow, client.from('ai_tutor_identities').insert({
      chat_user_name: input.chatUserName,
      pairing_code_hash: input.pairingCodeHash,
      pairing_code_expires_at: input.pairingCodeExpiresAt,
      status: 'pending',
    }).select('id, chat_user_name, profile_id, status').single(), toIdentity),
    upsertConversation: async (input) => upsertConversation(client, input),
    claimInboundTurn: async (input) => claimInboundTurn(client, input),
    getCompletedAnswer: async (input) => getCompletedAnswer(client, input.profileId, input.inboundMessageName),
    markTurnCompleted: async (input) => readOne('mark_turn_completed', TurnRow, client.from('ai_tutor_turns').update({
      status: 'completed',
      answer_text: input.result.answerText,
      confidence: input.result.confidence,
      subject_slug: input.result.subjectSlug,
      concept_tags: input.result.conceptTags,
      error_tags: input.result.errorType === null ? [] : [input.result.errorType],
      needs_teacher_review: input.result.needsTeacherReview,
      escalation_reason: input.result.escalationReason,
      provider: input.provider,
      model_alias: input.modelAlias,
      prompt_version: input.promptVersion,
      latency_ms: input.latencyMs,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      completed_at: input.completedAt,
    }).eq('profile_id', input.profileId).eq('id', input.turnId).select(turnColumns).single(), toTurn),
    markTurnFailed: async (input) => readOne('mark_turn_failed', TurnRow, client.from('ai_tutor_turns').update({
      status: 'failed',
      answer_text: input.answerText,
      error_tags: [input.errorType],
      needs_teacher_review: true,
      escalation_reason: input.escalationReason,
      completed_at: input.completedAt,
    }).eq('profile_id', input.profileId).eq('id', input.turnId).select(turnColumns).single(), toTurn),
    readRecentTurns: async (input) => readMany('read_recent_turns', RecentTurnRow, client.from('ai_tutor_turns').select('question_text, answer_text, concept_tags').eq('profile_id', input.profileId).eq('conversation_id', input.conversationId).order('received_at', { ascending: false }).limit(input.limit), toRecentTurns),
    countRecentConceptRepeats: async (input) => readCount('count_concept_repeats', client.from('ai_tutor_turns').select('id', { count: 'exact', head: true }).eq('profile_id', input.profileId).overlaps('concept_tags', input.conceptTags).gte('received_at', input.since)),
    recordAttachment: async (input) => readOne('record_attachment', AttachmentRow, client.from('ai_tutor_attachments').insert({
      profile_id: input.profileId,
      turn_id: input.turnId,
      attachment_resource_name: input.attachmentResourceName,
      declared_mime_type: input.declaredMimeType,
      normalized_mime_type: input.normalizedMimeType,
      size_bytes: input.sizeBytes,
      sha256: input.sha256,
      private_storage_path: input.privateStoragePath,
      status: input.status,
    }).select('id, turn_id, profile_id, status').eq('profile_id', input.profileId).single(), toAttachment),
    listTeacherReviewTurns: async (input) => readMany('list_review_turns', ReviewRow, client.from('ai_tutor_turns').select('id, profile_id, received_at, subject_slug, concept_tags, confidence, escalation_reason').eq('profile_id', input.profileId).eq('needs_teacher_review', true).order('received_at', { ascending: false }).limit(input.limit), toReviewTurns),
    listRetentionCandidates: async (input) => listRetentionCandidates(client, input),
  };
}

async function upsertConversation(
  client: SupabaseDataClient,
  input: Parameters<AiTutorRepository['upsertConversation']>[0],
): Promise<AiTutorRepositoryResult<AiTutorConversation>> {
  const inserted = await client.from('ai_tutor_conversations').insert({
    profile_id: input.profileId,
    identity_id: input.identityId,
    chat_space_name: input.chatSpaceName,
    chat_thread_name: input.chatThreadName,
    channel_type: input.channelType,
    last_seen_at: input.seenAt,
  }).select('id, profile_id, channel_type').eq('profile_id', input.profileId).single();
  if (inserted.error === null) {
    return parseOne('upsert_conversation', ConversationRow, inserted.data, toConversation);
  }
  if (mapDbError(inserted.error) !== 'conflict') return fail('upsert_conversation', inserted.error);

  let existingQuery = client.from('ai_tutor_conversations')
    .select('id, profile_id, channel_type')
    .eq('profile_id', input.profileId)
    .eq('chat_space_name', input.chatSpaceName)
    .eq('channel_type', input.channelType);
  existingQuery = input.chatThreadName === null
    ? existingQuery.is('chat_thread_name', null)
    : existingQuery.eq('chat_thread_name', input.chatThreadName);

  const existing = await readMaybe(
    'upsert_conversation_conflict',
    ConversationRow,
    existingQuery.maybeSingle(),
    toConversation,
  );
  if (!existing.ok) return existing;
  return existing.value === null
    ? { ok: false, error: { code: 'not_found', operation: 'upsert_conversation_conflict' } }
    : { ok: true, value: existing.value };
}

async function claimInboundTurn(client: SupabaseDataClient, input: Parameters<AiTutorRepository['claimInboundTurn']>[0]): Promise<AiTutorRepositoryResult<AiTutorClaimResult>> {
  const inserted = await client.from('ai_tutor_turns').insert({
    profile_id: input.profileId,
    conversation_id: input.conversationId,
    inbound_message_name: input.inboundMessageName,
    status: 'processing',
    question_text: input.questionText,
    received_at: input.receivedAt,
  }).select(turnColumns).single();
  if (inserted.error === null) return parseOne('claim_inbound_turn', TurnRow, inserted.data, (row) => ({ kind: 'claimed', turn: toTurn(row) }));
  if (mapDbError(inserted.error) !== 'conflict') return fail('claim_inbound_turn', inserted.error);
  const existing = await client.from('ai_tutor_turns').select(turnColumns).eq('profile_id', input.profileId).eq('inbound_message_name', input.inboundMessageName).maybeSingle();
  const read = parseMaybe('claim_inbound_duplicate', TurnRow, existing, toTurn);
  if (!read.ok) return read;
  if (read.value === null) return { ok: false, error: { code: 'not_found', operation: 'claim_inbound_duplicate' } };
  if (read.value.status === 'completed') {
    const answer = storedAnswerFromTurn(read.value);
    return answer
      ? { ok: true, value: { kind: 'duplicate_completed', turnId: read.value.id, answer } }
      : invalid('claim_inbound_completed_answer');
  }
  return {
    ok: true,
    value: {
      kind: 'duplicate_fallback',
      turnId: read.value.id,
      status: read.value.status,
      fallback: duplicateFallbackResult(read.value.status),
    },
  };
}

async function getCompletedAnswer(client: SupabaseDataClient, profileId: string, inboundMessageName: string): Promise<AiTutorRepositoryResult<ReturnType<typeof storedAnswerFromTurn>>> {
  const read = await readMaybe('get_completed_answer', TurnRow, client.from('ai_tutor_turns').select(turnColumns).eq('profile_id', profileId).eq('inbound_message_name', inboundMessageName).eq('status', 'completed').maybeSingle(), toTurn);
  return read.ok ? { ok: true, value: read.value === null ? null : storedAnswerFromTurn(read.value) } : read;
}

async function listRetentionCandidates(client: SupabaseDataClient, input: Parameters<AiTutorRepository['listRetentionCandidates']>[0]): Promise<AiTutorRepositoryResult<AiTutorRetentionCandidates>> {
  const raw = await readMany('retention_raw', IdRow, client.from('ai_tutor_turns').select('id').eq('profile_id', input.profileId).is('raw_content_deleted_at', null).lt('received_at', input.rawContentCutoff).limit(input.limit), (rows) => rows.map((row) => row.id));
  if (!raw.ok) return raw;
  const image = await readMany('retention_image', IdRow, client.from('ai_tutor_attachments').select('id').eq('profile_id', input.profileId).is('image_deleted_at', null).lt('created_at', input.imageCutoff).limit(input.limit), (rows) => rows.map((row) => row.id));
  if (!image.ok) return image;
  const metadata = await readMany('retention_metadata', IdRow, client.from('ai_tutor_turns').select('id').eq('profile_id', input.profileId).is('metadata_deleted_at', null).lt('received_at', input.metadataCutoff).limit(input.limit), (rows) => rows.map((row) => row.id));
  return metadata.ok ? { ok: true, value: { rawContentTurnIds: raw.value, imageAttachmentIds: image.value, metadataTurnIds: metadata.value } } : metadata;
}

async function readOne<Parsed, Value>(operation: string, schema: z.ZodType<Parsed>, query: PromiseLike<SupabaseResult<unknown>>, map: (row: Parsed) => Value): Promise<AiTutorRepositoryResult<Value>> {
  const result = await query;
  if (result.error !== null) return fail(operation, result.error);
  return parseOne(operation, schema, result.data, map);
}

async function readMaybe<Parsed, Value>(operation: string, schema: z.ZodType<Parsed>, query: PromiseLike<SupabaseResult<unknown>>, map: (row: Parsed) => Value): Promise<AiTutorRepositoryResult<Value | null>> {
  return parseMaybe(operation, schema, await query, map);
}

async function readMany<Parsed, Value>(operation: string, schema: z.ZodType<Parsed>, query: PromiseLike<SupabaseResult<unknown>>, map: (rows: readonly Parsed[]) => Value): Promise<AiTutorRepositoryResult<Value>> {
  const result = await query;
  if (result.error !== null) return fail(operation, result.error);
  const parsed = z.array(schema).safeParse(result.data ?? []);
  return parsed.success ? { ok: true, value: map(parsed.data) } : invalid(operation);
}

async function readCount(operation: string, query: PromiseLike<SupabaseResult<unknown>>): Promise<AiTutorRepositoryResult<number>> {
  const result = await query;
  if (result.error !== null) return fail(operation, result.error);
  return { ok: true, value: result.count ?? 0 };
}

function parseOne<Parsed, Value>(operation: string, schema: z.ZodType<Parsed>, data: unknown, map: (row: Parsed) => Value): AiTutorRepositoryResult<Value> {
  const parsed = schema.safeParse(data);
  return parsed.success ? { ok: true, value: map(parsed.data) } : invalid(operation);
}

function parseMaybe<Parsed, Value>(operation: string, schema: z.ZodType<Parsed>, result: SupabaseResult<unknown>, map: (row: Parsed) => Value): AiTutorRepositoryResult<Value | null> {
  if (result.error !== null) return fail(operation, result.error);
  if (result.data === null) return { ok: true, value: null };
  return parseOne(operation, schema, result.data, map);
}

function invalid(operation: string): AiTutorRepositoryResult<never> {
  return { ok: false, error: { code: 'invalid_response', operation } };
}

function fail(operation: string, error: SupabaseDbError): AiTutorRepositoryResult<never> {
  return { ok: false, error: { code: mapDbError(error), operation } };
}

function mapDbError(error: SupabaseDbError): AiTutorRepositoryErrorCode {
  switch (error.code) {
    case '23505':
      return 'conflict';
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
