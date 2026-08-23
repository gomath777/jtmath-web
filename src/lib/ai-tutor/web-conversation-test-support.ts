import type { WebSupabaseDataClient } from './web-conversation-supabase';
import {
  conversationValue,
  error,
  filterValue,
  isRecord,
  isWebStoredTurn,
  nullableStringField,
  processingTurn,
  rowMatches,
  selectColumns,
  stringField,
  webAssignmentId,
  webConversationId,
  webConversationInput,
  webModeField,
  webOtherProfileId,
  webProfileId,
  webTurnClaimInput,
  type WebDbResult,
  type WebOperation,
  type WebStoredConversation,
  type WebStoredTurn,
} from './web-conversation-test-data';

export {
  webAssignmentId,
  webConversationId,
  webConversationInput,
  webOtherProfileId,
  webProfileId,
  webTurnClaimInput,
};

type QueryInput = {
  readonly table: string;
  readonly action: string;
  readonly filters: readonly { readonly column: string; readonly value: unknown }[];
  readonly payload?: unknown;
  readonly selectedColumns?: string;
  readonly maybeSingle?: boolean;
  readonly single?: boolean;
  readonly limit?: number;
};

export function createFakeWebConversationSupabase(): FakeWebConversationSupabase {
  return new FakeWebConversationSupabase();
}

export class FakeWebConversationSupabase {
  readonly operations: WebOperation[] = [];
  readonly client: WebSupabaseDataClient = { from: (table) => new FakeWebQuery(this, table) };
  providerEligibleClaimCount = 0;
  private readonly conversations = new Map<string, WebStoredConversation>();
  private readonly turns = new Map<string, WebStoredTurn>();
  private nextTurnNumber = 1;

  execute(input: QueryInput): WebDbResult {
    this.operations.push({
      table: input.table,
      action: input.action,
      filters: input.filters,
      payload: input.payload,
    });
    if (input.table === 'ai_tutor_web_conversations' && input.action === 'upsert') return this.upsertConversation(input.payload);
    if (input.table === 'ai_tutor_web_conversations' && input.action === 'select') return this.selectConversations(input.filters, input.maybeSingle);
    if (input.table === 'ai_tutor_web_turns' && input.action === 'insert') return this.insertTurn(input.payload, input.selectedColumns);
    if (input.table === 'ai_tutor_web_turns' && input.action === 'update') return this.updateTurn(input.payload, input.filters, input.selectedColumns);
    if (input.table === 'ai_tutor_web_turns' && input.action === 'select') return this.selectTurns(input.filters, input.selectedColumns, input.maybeSingle, input.limit);
    return { data: input.maybeSingle || input.single ? null : [], error: null, count: 0 };
  }

  seedRetentionRows(): void {
    this.turns.set('turn-retention-raw', {
      ...processingTurn({ id: 'turn-retention-raw', receivedAt: '2026-07-01T00:00:00.000Z' }),
      status: 'completed',
      answer_text: 'raw cleanup candidate',
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
    });
    this.turns.set('turn-retention-metadata-future', {
      ...processingTurn({ id: 'turn-retention-metadata-future', receivedAt: '2026-08-23T00:00:00.000Z' }),
      raw_content_deleted_at: '2026-08-24T00:00:00.000Z',
      input_tokens: 1,
      output_tokens: 2,
      total_tokens: 3,
    });
  }

  containsRawContentInReceipts(): boolean {
    return this.operations.some((operation) => JSON.stringify(operation).includes('raw cleanup candidate'));
  }

  private upsertConversation(payload: unknown): WebDbResult {
    if (!isRecord(payload)) return error('400', 'bad payload');
    const profileId = stringField(payload, 'profile_id');
    const assignmentId = stringField(payload, 'assignment_id');
    const conversation = {
      id: webConversationId,
      profile_id: profileId,
      assignment_id: assignmentId,
      context_key: stringField(payload, 'context_key'),
      active_material_key: nullableStringField(payload, 'active_material_key'),
      active_problem_key: nullableStringField(payload, 'active_problem_key'),
      active_stage: nullableStringField(payload, 'active_stage'),
    } satisfies WebStoredConversation;
    this.conversations.set(`${profileId}:${assignmentId}`, conversation);
    return { data: conversation, error: null };
  }

  private selectConversations(
    filters: readonly { readonly column: string; readonly value: unknown }[],
    maybeSingle: boolean | undefined,
  ): WebDbResult {
    const rows = Array.from(this.conversations.values()).filter((conversation) =>
      filters.every((filter) => conversationValue(conversation, filter.column) === filter.value),
    );
    return maybeSingle ? { data: rows[0] ?? null, error: null } : { data: rows, error: null };
  }

  private insertTurn(payload: unknown, selectedColumns: string | undefined): WebDbResult {
    if (!isRecord(payload)) return error('400', 'bad payload');
    const profileId = stringField(payload, 'profile_id');
    const assignmentId = stringField(payload, 'assignment_id');
    const conversationId = stringField(payload, 'conversation_id');
    const requestId = stringField(payload, 'request_id');
    const conversation = this.conversations.get(`${profileId}:${assignmentId}`);
    if (conversation?.id !== conversationId) return error('23503', 'conversation scope mismatch');
    const key = `${profileId}:${assignmentId}:${requestId}`;
    if (this.turns.has(key)) return error('23505', 'duplicate request');
    const turn = processingTurn({
      id: `00000000-0000-4000-8000-${String(this.nextTurnNumber).padStart(12, '0')}`,
      profileId,
      assignmentId,
      conversationId,
      requestId,
      questionText: stringField(payload, 'question_text'),
      targetMaterialKey: stringField(payload, 'target_material_key'),
      targetProblemKey: nullableStringField(payload, 'target_problem_key'),
      targetStage: nullableStringField(payload, 'target_stage'),
      mode: webModeField(payload, 'mode'),
      receivedAt: stringField(payload, 'received_at'),
    });
    this.nextTurnNumber += 1;
    this.turns.set(key, turn);
    this.providerEligibleClaimCount += 1;
    return { data: selectColumns(turn, selectedColumns), error: null };
  }

  private updateTurn(
    payload: unknown,
    filters: readonly { readonly column: string; readonly value: unknown }[],
    selectedColumns: string | undefined,
  ): WebDbResult {
    if (!isRecord(payload)) return error('400', 'bad payload');
    const id = filterValue(filters, 'id');
    const profileId = filterValue(filters, 'profile_id');
    const assignmentId = filterValue(filters, 'assignment_id');
    const entry = Array.from(this.turns.entries()).find((item) => {
      const turn = item[1];
      return turn.id === id && turn.profile_id === profileId && turn.assignment_id === assignmentId;
    });
    if (entry === undefined) return error('PGRST116', 'not found');
    const updated = { ...entry[1], ...payload };
    if (!isWebStoredTurn(updated)) return error('400', 'bad update');
    this.turns.set(entry[0], updated);
    return { data: selectColumns(updated, selectedColumns), error: null };
  }

  private selectTurns(
    filters: readonly { readonly column: string; readonly value: unknown }[],
    selectedColumns: string | undefined,
    maybeSingle: boolean | undefined,
    limit: number | undefined,
  ): WebDbResult {
    const rows = Array.from(this.turns.values())
      .filter((turn) => filters.every((filter) => rowMatches(turn, filter)))
      .sort((left, right) => right.received_at.localeCompare(left.received_at))
      .slice(0, limit ?? undefined)
      .map((turn) => selectColumns(turn, selectedColumns));
    return maybeSingle ? { data: rows[0] ?? null, error: null } : { data: rows, error: null };
  }
}

class FakeWebQuery implements PromiseLike<WebDbResult> {
  private action = 'select';
  private payload: unknown;
  private selectedColumns: string | undefined;
  private maybe = false;
  private one = false;
  private take: number | undefined;
  private readonly filters: { readonly column: string; readonly value: unknown }[] = [];

  constructor(private readonly owner: FakeWebConversationSupabase, private readonly table: string) {}

  select(columns: string): this { this.selectedColumns = columns; return this; }
  insert(payload: unknown): this { this.action = 'insert'; this.payload = payload; return this; }
  upsert(payload: unknown): this { this.action = 'upsert'; this.payload = payload; return this; }
  update(payload: unknown): this { this.action = 'update'; this.payload = payload; return this; }
  eq(column: string, value: unknown): this { this.filters.push({ column, value }); return this; }
  lt(column: string, value: string): this { this.filters.push({ column, value }); return this; }
  is(column: string, value: null): this { this.filters.push({ column, value }); return this; }
  order(): this { return this; }
  limit(count: number): this { this.take = count; return this; }
  maybeSingle(): PromiseLike<WebDbResult> { this.maybe = true; return this; }
  single(): PromiseLike<WebDbResult> { this.one = true; return this; }

  then<TResult1 = WebDbResult, TResult2 = never>(
    onfulfilled?: ((value: WebDbResult) => TResult1 | PromiseLike<TResult1>) | null,
    _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.owner.execute({
      table: this.table,
      action: this.action,
      filters: this.filters,
      payload: this.payload,
      selectedColumns: this.selectedColumns,
      maybeSingle: this.maybe,
      single: this.one,
      limit: this.take,
    })).then(onfulfilled);
  }
}
