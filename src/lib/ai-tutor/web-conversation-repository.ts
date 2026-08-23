import type {
  ClaimWebTurnInput,
  CompleteWebTurnInput,
  FailWebTurnInput,
  RecentWebTurnsInput,
  UpsertWebConversationInput,
  WebConversationRow,
  WebRetentionInput,
  WebTurnRow,
  WEB_TUTOR_MODES,
  WEB_TUTOR_TURN_STATUSES,
} from './web-conversation-contracts';

export type WebTutorTurnStatus = (typeof WEB_TUTOR_TURN_STATUSES)[number];
export type WebTutorMode = (typeof WEB_TUTOR_MODES)[number];

export type WebConversationRepositoryErrorCode =
  | 'conflict'
  | 'invalid_response'
  | 'not_found'
  | 'permission_denied'
  | 'unavailable'
  | 'unknown';

export type WebConversationRepositoryError = {
  readonly code: WebConversationRepositoryErrorCode;
  readonly operation: string;
};

export type WebConversationRepositoryResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: WebConversationRepositoryError };

export type WebConversation = {
  readonly id: string;
  readonly profileId: string;
  readonly assignmentId: string;
  readonly contextKey: string;
  readonly activeMaterialKey: string | null;
  readonly activeProblemKey: string | null;
  readonly activeStage: string | null;
};

export type WebTurn = {
  readonly id: string;
  readonly conversationId: string;
  readonly profileId: string;
  readonly assignmentId: string;
  readonly requestId: string;
  readonly targetMaterialKey: string;
  readonly targetProblemKey: string | null;
  readonly targetStage: string | null;
  readonly mode: WebTutorMode;
  readonly status: WebTutorTurnStatus;
  readonly questionText: string | null;
  readonly answerText: string | null;
  readonly provider: string | null;
  readonly modelAlias: string | null;
  readonly promptVersion: string | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly totalTokens: number | null;
  readonly attemptCount: number;
  readonly latencyMs: number | null;
  readonly needsTeacherReview: boolean;
  readonly errorCategory: string | null;
  readonly receivedAt: string;
  readonly completedAt: string | null;
};

export type WebTurnClaim =
  | { readonly kind: 'claimed'; readonly turn: WebTurn }
  | { readonly kind: 'duplicate'; readonly turn: WebTurn };

export type WebRecentTurn = {
  readonly role: 'student' | 'tutor';
  readonly text: string;
  readonly targetMaterialKey: string;
};

export type WebRetentionCandidates = {
  readonly rawContentTurnIds: readonly string[];
  readonly metadataTurnIds: readonly string[];
};

export interface WebConversationRepository {
  upsertConversation(
    input: UpsertWebConversationInput,
  ): Promise<WebConversationRepositoryResult<WebConversation>>;
  claimRequest(
    input: ClaimWebTurnInput,
  ): Promise<WebConversationRepositoryResult<WebTurnClaim>>;
  readRecentTurns(
    input: RecentWebTurnsInput,
  ): Promise<WebConversationRepositoryResult<readonly WebRecentTurn[]>>;
  markCompleted(
    input: CompleteWebTurnInput,
  ): Promise<WebConversationRepositoryResult<WebTurn>>;
  markFailed(
    input: FailWebTurnInput,
  ): Promise<WebConversationRepositoryResult<WebTurn>>;
  listRetentionCandidates(
    input: WebRetentionInput,
  ): Promise<WebConversationRepositoryResult<WebRetentionCandidates>>;
}

export function toWebConversation(
  row: WebConversationRow,
): WebConversation {
  return {
    id: row.id,
    profileId: row.profile_id,
    assignmentId: row.assignment_id,
    contextKey: row.context_key,
    activeMaterialKey: row.active_material_key,
    activeProblemKey: row.active_problem_key,
    activeStage: row.active_stage,
  };
}

export function toWebTurn(
  row: WebTurnRow,
): WebTurn {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    profileId: row.profile_id,
    assignmentId: row.assignment_id,
    requestId: row.request_id,
    targetMaterialKey: row.target_material_key,
    targetProblemKey: row.target_problem_key,
    targetStage: row.target_stage,
    mode: row.mode,
    status: row.status,
    questionText: row.question_text,
    answerText: row.answer_text,
    provider: row.provider,
    modelAlias: row.model_alias,
    promptVersion: row.prompt_version,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    attemptCount: row.attempt_count,
    latencyMs: row.latency_ms,
    needsTeacherReview: row.needs_teacher_review,
    errorCategory: row.error_category,
    receivedAt: row.received_at,
    completedAt: row.completed_at,
  };
}
