export type WebDbError = { readonly code: string; readonly message: string };
export type WebDbResult = { readonly data: unknown; readonly error: WebDbError | null; readonly count?: number | null };
export type WebOperation = {
  readonly table: string;
  readonly action: string;
  readonly filters: readonly { readonly column: string; readonly value: unknown }[];
  readonly payload?: unknown;
};

export const webProfileId = '00000000-0000-4000-8000-000000000101';
export const webOtherProfileId = '00000000-0000-4000-8000-000000000102';
export const webAssignmentId = '00000000-0000-4000-8000-000000000201';
export const webConversationId = '00000000-0000-4000-8000-000000000301';

export type WebStoredConversation = {
  readonly id: string;
  readonly profile_id: string;
  readonly assignment_id: string;
  readonly context_key: string;
  readonly active_material_key: string | null;
  readonly active_problem_key: string | null;
  readonly active_stage: string | null;
};

export type WebStoredTurn = {
  readonly id: string;
  readonly conversation_id: string;
  readonly profile_id: string;
  readonly assignment_id: string;
  readonly request_id: string;
  readonly target_material_key: string;
  readonly target_problem_key: string | null;
  readonly target_stage: string | null;
  readonly mode: 'hint' | 'start' | 'decisive' | 'solution' | 'followup' | 'alternate';
  readonly status: 'processing' | 'completed' | 'failed';
  readonly question_text: string | null;
  readonly answer_text: string | null;
  readonly provider: string | null;
  readonly model_alias: string | null;
  readonly prompt_version: string | null;
  readonly input_tokens: number | null;
  readonly output_tokens: number | null;
  readonly total_tokens: number | null;
  readonly attempt_count: number;
  readonly latency_ms: number | null;
  readonly needs_teacher_review: boolean;
  readonly error_category: string | null;
  readonly raw_content_deleted_at: string | null;
  readonly metadata_deleted_at: string | null;
  readonly received_at: string;
  readonly completed_at: string | null;
};

export function webConversationInput(
  overrides: Partial<Parameters<import('./web-conversation-repository').WebConversationRepository['upsertConversation']>[0]> = {},
): Parameters<import('./web-conversation-repository').WebConversationRepository['upsertConversation']>[0] {
  return {
    profileId: webProfileId,
    assignmentId: webAssignmentId,
    contextKey: 'context:gs2:line:session-2',
    activeMaterialKey: 'material:gs2:line',
    activeProblemKey: 'problem:1',
    activeStage: 'hint',
    seenAt: '2026-08-23T00:00:00.000Z',
    ...overrides,
  };
}

export function webTurnClaimInput(
  overrides: Partial<Parameters<import('./web-conversation-repository').WebConversationRepository['claimRequest']>[0]> = {},
): Parameters<import('./web-conversation-repository').WebConversationRepository['claimRequest']>[0] {
  return {
    profileId: webProfileId,
    assignmentId: webAssignmentId,
    conversationId: webConversationId,
    requestId: 'request-001',
    questionText: '도와주세요',
    targetMaterialKey: 'material:gs2:line',
    targetProblemKey: 'problem:1',
    targetStage: 'hint',
    mode: 'hint',
    receivedAt: '2026-08-23T00:00:01.000Z',
    ...overrides,
  };
}

export function processingTurn(input: {
  readonly id: string;
  readonly profileId?: string;
  readonly assignmentId?: string;
  readonly conversationId?: string;
  readonly requestId?: string;
  readonly questionText?: string;
  readonly targetMaterialKey?: string;
  readonly targetProblemKey?: string | null;
  readonly targetStage?: string | null;
  readonly mode?: WebStoredTurn['mode'];
  readonly receivedAt?: string;
}): WebStoredTurn {
  return {
    id: input.id,
    conversation_id: input.conversationId ?? webConversationId,
    profile_id: input.profileId ?? webProfileId,
    assignment_id: input.assignmentId ?? webAssignmentId,
    request_id: input.requestId ?? 'request-001',
    target_material_key: input.targetMaterialKey ?? 'material:gs2:line',
    target_problem_key: input.targetProblemKey ?? 'problem:1',
    target_stage: input.targetStage ?? 'hint',
    mode: input.mode ?? 'hint',
    status: 'processing',
    question_text: input.questionText ?? '도와주세요',
    answer_text: null,
    provider: null,
    model_alias: null,
    prompt_version: null,
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
    attempt_count: 1,
    latency_ms: null,
    needs_teacher_review: false,
    error_category: null,
    raw_content_deleted_at: null,
    metadata_deleted_at: null,
    received_at: input.receivedAt ?? '2026-08-23T00:00:01.000Z',
    completed_at: null,
  };
}

export function selectColumns(row: WebStoredTurn, selectedColumns: string | undefined): Record<string, unknown> {
  if (selectedColumns?.trim() === 'id') return { id: row.id };
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    profile_id: row.profile_id,
    assignment_id: row.assignment_id,
    request_id: row.request_id,
    target_material_key: row.target_material_key,
    target_problem_key: row.target_problem_key,
    target_stage: row.target_stage,
    mode: row.mode,
    status: row.status,
    question_text: row.question_text,
    answer_text: row.answer_text,
    provider: row.provider,
    model_alias: row.model_alias,
    prompt_version: row.prompt_version,
    input_tokens: row.input_tokens,
    output_tokens: row.output_tokens,
    total_tokens: row.total_tokens,
    attempt_count: row.attempt_count,
    latency_ms: row.latency_ms,
    needs_teacher_review: row.needs_teacher_review,
    error_category: row.error_category,
    received_at: row.received_at,
    completed_at: row.completed_at,
  };
}

export function filterValue(filters: readonly { readonly column: string; readonly value: unknown }[], column: string): unknown {
  return filters.find((filter) => filter.column === column)?.value;
}

export function rowMatches(row: WebStoredTurn, filter: { readonly column: string; readonly value: unknown }): boolean {
  const value = turnValue(row, filter.column);
  if (filter.column === 'received_at' && typeof value === 'string' && typeof filter.value === 'string') {
    return value < filter.value;
  }
  return value === filter.value;
}

export function conversationValue(row: WebStoredConversation, column: string): unknown {
  switch (column) {
    case 'id':
      return row.id;
    case 'profile_id':
      return row.profile_id;
    case 'assignment_id':
      return row.assignment_id;
    case 'context_key':
      return row.context_key;
    case 'active_material_key':
      return row.active_material_key;
    case 'active_problem_key':
      return row.active_problem_key;
    case 'active_stage':
      return row.active_stage;
    default:
      return undefined;
  }
}

export function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? value : '';
}

export function nullableStringField(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export function webModeField(row: Record<string, unknown>, key: string): WebStoredTurn['mode'] {
  const value = row[key];
  switch (value) {
    case 'hint':
    case 'start':
    case 'decisive':
    case 'solution':
    case 'followup':
    case 'alternate':
      return value;
    default:
      return 'hint';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isWebStoredTurn(value: Record<string, unknown>): value is WebStoredTurn {
  return typeof value.id === 'string' && typeof value.profile_id === 'string';
}

export function error(code: string, message: string): WebDbResult {
  return { data: null, error: { code, message } };
}

function turnValue(row: WebStoredTurn, column: string): unknown {
  switch (column) {
    case 'id':
      return row.id;
    case 'conversation_id':
      return row.conversation_id;
    case 'profile_id':
      return row.profile_id;
    case 'assignment_id':
      return row.assignment_id;
    case 'request_id':
      return row.request_id;
    case 'raw_content_deleted_at':
      return row.raw_content_deleted_at;
    case 'metadata_deleted_at':
      return row.metadata_deleted_at;
    case 'received_at':
      return row.received_at;
    default:
      return undefined;
  }
}
