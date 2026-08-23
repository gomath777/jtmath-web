import {
  WebIdRowSchema,
  WebRetentionInputSchema,
} from './web-conversation-contracts';
import type {
  WebConversationRepository,
  WebConversationRepositoryResult,
  WebRetentionCandidates,
} from './web-conversation-repository';
import {
  invalid,
  readMany,
  type WebSupabaseDataClient,
} from './web-conversation-supabase-core';

type RetentionInput = Parameters<WebConversationRepository['listRetentionCandidates']>[0];

export async function listRetentionCandidates(
  client: WebSupabaseDataClient,
  input: RetentionInput,
): Promise<WebConversationRepositoryResult<WebRetentionCandidates>> {
  const parsed = WebRetentionInputSchema.safeParse(input);
  if (!parsed.success) return invalid('web_retention_candidates');
  const row = parsed.data;
  const raw = await readMany(
    'web_retention_raw',
    WebIdRowSchema,
    client
      .from('ai_tutor_web_turns')
      .select('id')
      .eq('profile_id', row.profileId)
      .is('raw_content_deleted_at', null)
      .lt('received_at', row.rawContentCutoff)
      .limit(row.limit),
    (rows) => rows.map((candidate) => candidate.id),
  );
  if (raw.ok === false) return { ok: false, error: raw.error };
  const metadata = await readMany(
    'web_retention_metadata',
    WebIdRowSchema,
    client
      .from('ai_tutor_web_turns')
      .select('id')
      .eq('profile_id', row.profileId)
      .is('metadata_deleted_at', null)
      .lt('received_at', row.metadataCutoff)
      .limit(row.limit),
    (rows) => rows.map((candidate) => candidate.id),
  );
  return metadata.ok
    ? { ok: true, value: { rawContentTurnIds: raw.value, metadataTurnIds: metadata.value } }
    : { ok: false, error: metadata.error };
}
