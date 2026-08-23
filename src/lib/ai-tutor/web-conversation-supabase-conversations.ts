import {
  ClaimWebTurnInputSchema,
  RecentWebTurnsInputSchema,
  UpsertWebConversationInputSchema,
  WebConversationRowSchema,
  WebTurnRowSchema,
} from './web-conversation-contracts';
import {
  toWebConversation,
  toWebTurn,
  type WebConversation,
  type WebConversationRepository,
  type WebConversationRepositoryResult,
  type WebRecentTurn,
  type WebTurn,
  type WebTurnClaim,
} from './web-conversation-repository';
import { webConversationColumns, webTurnColumns } from './web-conversation-supabase-columns';
import {
  fail,
  invalid,
  mapDbError,
  parseOne,
  readMany,
  readMaybe,
  readOne,
  type WebSupabaseDataClient,
} from './web-conversation-supabase-core';

type UpsertConversationInput = Parameters<WebConversationRepository['upsertConversation']>[0];
type ClaimRequestInput = Parameters<WebConversationRepository['claimRequest']>[0];
type RecentTurnsInput = Parameters<WebConversationRepository['readRecentTurns']>[0];

export function upsertConversation(
  client: WebSupabaseDataClient,
  input: UpsertConversationInput,
): Promise<WebConversationRepositoryResult<WebConversation>> {
  const parsed = UpsertWebConversationInputSchema.safeParse(input);
  if (!parsed.success) return Promise.resolve(invalid('upsert_web_conversation'));
  const row = parsed.data;
  return readOne(
    'upsert_web_conversation',
    WebConversationRowSchema,
    client
      .from('ai_tutor_web_conversations')
      .upsert(
        {
          profile_id: row.profileId,
          assignment_id: row.assignmentId,
          context_key: row.contextKey,
          active_material_key: row.activeMaterialKey,
          active_problem_key: row.activeProblemKey,
          active_stage: row.activeStage,
          last_seen_at: row.seenAt,
        },
        { onConflict: 'profile_id,assignment_id' },
      )
      .select(webConversationColumns)
      .eq('profile_id', row.profileId)
      .eq('assignment_id', row.assignmentId)
      .single(),
    toWebConversation,
  );
}

export async function claimRequest(
  client: WebSupabaseDataClient,
  input: ClaimRequestInput,
): Promise<WebConversationRepositoryResult<WebTurnClaim>> {
  const parsed = ClaimWebTurnInputSchema.safeParse(input);
  if (!parsed.success) return invalid('claim_web_turn');
  const row = parsed.data;
  const conversation = await readMaybe(
    'claim_web_conversation_scope',
    WebConversationRowSchema,
    client
      .from('ai_tutor_web_conversations')
      .select(webConversationColumns)
      .eq('profile_id', row.profileId)
      .eq('assignment_id', row.assignmentId)
      .eq('id', row.conversationId)
      .maybeSingle(),
    toWebConversation,
  );
  if (conversation.ok === false) return { ok: false, error: conversation.error };
  if (conversation.value === null) {
    return { ok: false, error: { code: 'permission_denied', operation: 'claim_web_conversation_scope' } };
  }
  const inserted = await client
    .from('ai_tutor_web_turns')
    .insert({
      profile_id: row.profileId,
      assignment_id: row.assignmentId,
      conversation_id: row.conversationId,
      request_id: row.requestId,
      target_material_key: row.targetMaterialKey,
      target_problem_key: row.targetProblemKey,
      target_stage: row.targetStage,
      mode: row.mode,
      status: 'processing',
      question_text: row.questionText,
      received_at: row.receivedAt,
    })
    .select(webTurnColumns)
    .single();
  if (inserted.error === null) {
    return parseOne('claim_web_turn', WebTurnRowSchema, inserted.data, (turnRow) => ({
      kind: 'claimed',
      turn: toWebTurn(turnRow),
    }));
  }
  if (mapDbError(inserted.error) !== 'conflict') return fail('claim_web_turn', inserted.error);
  return readDuplicateTurn(client, row);
}

export function readRecentTurns(
  client: WebSupabaseDataClient,
  input: RecentTurnsInput,
): Promise<WebConversationRepositoryResult<readonly WebRecentTurn[]>> {
  const parsed = RecentWebTurnsInputSchema.safeParse(input);
  if (!parsed.success) return Promise.resolve(invalid('read_recent_web_turns'));
  const row = parsed.data;
  return readMany(
    'read_recent_web_turns',
    WebTurnRowSchema,
    client
      .from('ai_tutor_web_turns')
      .select(webTurnColumns)
      .eq('profile_id', row.profileId)
      .eq('assignment_id', row.assignmentId)
      .eq('conversation_id', row.conversationId)
      .order('received_at', { ascending: false })
      .limit(row.limit),
    (rows) => toRecentTurns(rows.map(toWebTurn)),
  );
}

async function readDuplicateTurn(
  client: WebSupabaseDataClient,
  row: ClaimRequestInput,
): Promise<WebConversationRepositoryResult<WebTurnClaim>> {
  const existing = await readMaybe(
    'claim_web_turn_duplicate',
    WebTurnRowSchema,
    client
      .from('ai_tutor_web_turns')
      .select(webTurnColumns)
      .eq('profile_id', row.profileId)
      .eq('assignment_id', row.assignmentId)
      .eq('request_id', row.requestId)
      .maybeSingle(),
    toWebTurn,
  );
  if (existing.ok === false) return { ok: false, error: existing.error };
  return existing.value === null
    ? { ok: false, error: { code: 'not_found', operation: 'claim_web_turn_duplicate' } }
    : { ok: true, value: { kind: 'duplicate', turn: existing.value } };
}

function toRecentTurns(rows: readonly WebTurn[]): readonly WebRecentTurn[] {
  return [...rows].reverse().flatMap((turn) => {
    const student = turn.questionText === null
      ? []
      : [{ role: 'student' as const, text: turn.questionText, targetMaterialKey: turn.targetMaterialKey }];
    const tutor = turn.answerText === null
      ? []
      : [{ role: 'tutor' as const, text: turn.answerText, targetMaterialKey: turn.targetMaterialKey }];
    return [...student, ...tutor];
  });
}
