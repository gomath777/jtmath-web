import {
  CompleteWebTurnInputSchema,
  FailWebTurnInputSchema,
  WebTurnRowSchema,
} from './web-conversation-contracts';
import {
  toWebTurn,
  type WebConversationRepository,
  type WebConversationRepositoryResult,
  type WebTurn,
} from './web-conversation-repository';
import { webTurnColumns } from './web-conversation-supabase-columns';
import {
  invalid,
  readOne,
  type WebSupabaseDataClient,
} from './web-conversation-supabase-core';

type CompleteTurnInput = Parameters<WebConversationRepository['markCompleted']>[0];
type FailTurnInput = Parameters<WebConversationRepository['markFailed']>[0];

export function markCompleted(
  client: WebSupabaseDataClient,
  input: CompleteTurnInput,
): Promise<WebConversationRepositoryResult<WebTurn>> {
  const parsed = CompleteWebTurnInputSchema.safeParse(input);
  if (!parsed.success) return Promise.resolve(invalid('complete_web_turn'));
  const row = parsed.data;
  return readOne(
    'complete_web_turn',
    WebTurnRowSchema,
    client
      .from('ai_tutor_web_turns')
      .update({
        status: 'completed',
        answer_text: row.answerText,
        provider: row.provider,
        model_alias: row.modelAlias,
        prompt_version: row.promptVersion,
        input_tokens: row.inputTokens,
        output_tokens: row.outputTokens,
        total_tokens: row.totalTokens,
        latency_ms: row.latencyMs,
        completed_at: row.completedAt,
      })
      .eq('profile_id', row.profileId)
      .eq('assignment_id', row.assignmentId)
      .eq('id', row.turnId)
      .select(webTurnColumns)
      .single(),
    toWebTurn,
  );
}

export function markFailed(
  client: WebSupabaseDataClient,
  input: FailTurnInput,
): Promise<WebConversationRepositoryResult<WebTurn>> {
  const parsed = FailWebTurnInputSchema.safeParse(input);
  if (!parsed.success) return Promise.resolve(invalid('fail_web_turn'));
  const row = parsed.data;
  return readOne(
    'fail_web_turn',
    WebTurnRowSchema,
    client
      .from('ai_tutor_web_turns')
      .update({
        status: 'failed',
        answer_text: row.answerText,
        needs_teacher_review: true,
        error_category: row.errorCategory,
        completed_at: row.completedAt,
      })
      .eq('profile_id', row.profileId)
      .eq('assignment_id', row.assignmentId)
      .eq('id', row.turnId)
      .select(webTurnColumns)
      .single(),
    toWebTurn,
  );
}
