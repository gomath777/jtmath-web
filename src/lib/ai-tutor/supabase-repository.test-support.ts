import type { SupabaseDataClient } from './supabase-repository';

export type DbError = { readonly code: string; readonly message: string };
export type DbResult = { readonly data: unknown; readonly error: DbError | null; readonly count?: number | null };
export type Operation = {
  readonly table: string;
  readonly action: string;
  readonly filters: readonly { readonly column: string; readonly value: unknown }[];
  readonly payload?: unknown;
};

export const profileId = '00000000-0000-4000-8000-000000000001';
export const otherProfileId = '00000000-0000-4000-8000-000000000002';
export const conversationId = '10000000-0000-4000-8000-000000000001';

export class FakeSupabase {
  readonly operations: Operation[] = [];
  readonly client: SupabaseDataClient = { from: (table) => new FakeQuery(this, table) };
  readonly failReads: boolean;
  turnInsertCount = 0;
  private readonly turns = new Map<string, Record<string, unknown>>();

  constructor(options: { readonly failReads?: boolean } = {}) {
    this.failReads = options.failReads ?? false;
  }

  seedCompletedTurn(): void {
    this.turns.set('spaces/AAA/messages/completed', completedTurn(profileId));
    this.turnInsertCount = 1;
  }

  seedOtherProfileTurn(): void {
    this.turns.set('spaces/AAA/messages/other-profile', processingTurn(otherProfileId));
    this.turnInsertCount = 1;
  }

  execute(input: {
    readonly table: string;
    readonly action: string;
    readonly filters: readonly { readonly column: string; readonly value: unknown }[];
    readonly payload?: unknown;
    readonly countHead?: boolean;
  }): DbResult {
    this.operations.push(input);
    if (this.failReads) return { data: null, error: { code: '503', message: 'secret-db-detail' } };
    if (input.table === 'ai_tutor_turns' && input.action === 'insert') return this.insertTurn(input.payload);
    if (input.table === 'ai_tutor_turns' && input.action === 'select') return this.selectTurn(input.filters, input.countHead);
    if (input.action === 'insert' || input.action === 'upsert' || input.action === 'update') return { data: input.payload ?? null, error: null };
    return { data: [], error: null, count: 0 };
  }

  private insertTurn(payload: unknown): DbResult {
    const row = Array.isArray(payload) ? payload[0] : payload;
    if (!isRecord(row)) return { data: null, error: { code: '400', message: 'bad payload' } };
    const inbound = row.inbound_message_name;
    if (typeof inbound !== 'string') return { data: null, error: { code: '400', message: 'bad inbound' } };
    if (this.turns.has(inbound)) return { data: null, error: { code: '23505', message: 'duplicate secret-db-detail' } };
    const turn = processingTurn(
      String(row.profile_id),
      inbound,
      String(row.conversation_id),
      String(row.question_text),
      String(row.received_at),
    );
    this.turns.set(inbound, turn);
    this.turnInsertCount += 1;
    return { data: turn, error: null };
  }

  private selectTurn(
    filters: readonly { readonly column: string; readonly value: unknown }[],
    countHead: boolean | undefined,
  ): DbResult {
    if (countHead) return { data: null, error: null, count: 2 };
    const inbound = filters.find((filter) => filter.column === 'inbound_message_name')?.value;
    const profile = filters.find((filter) => filter.column === 'profile_id')?.value;
    const turn = typeof inbound === 'string' ? this.turns.get(inbound) : undefined;
    if (!turn || turn.profile_id !== profile) return { data: null, error: null };
    return { data: turn, error: null };
  }
}

class FakeQuery implements PromiseLike<DbResult> {
  private action = 'select';
  private payload: unknown;
  private readonly filters: { readonly column: string; readonly value: unknown }[] = [];
  private countHead = false;

  constructor(private readonly owner: FakeSupabase, private readonly table: string) {}

  select(_columns: string, options?: { readonly count?: 'exact'; readonly head?: boolean }): this {
    this.countHead = options?.head ?? false;
    return this;
  }

  insert(payload: unknown): this { this.action = 'insert'; this.payload = payload; return this; }
  upsert(payload: unknown): this { this.action = 'upsert'; this.payload = payload; return this; }
  update(payload: unknown): this { this.action = 'update'; this.payload = payload; return this; }
  eq(column: string, value: unknown): this { this.filters.push({ column, value }); return this; }
  order(): this { return this; }
  limit(): this { return this; }
  maybeSingle(): PromiseLike<DbResult> { return this; }
  single(): PromiseLike<DbResult> { return this; }
  overlaps(column: string, value: readonly string[]): this { this.filters.push({ column, value }); return this; }
  gte(column: string, value: string): this { this.filters.push({ column, value }); return this; }
  lt(column: string, value: string): this { this.filters.push({ column, value }); return this; }
  is(column: string, value: null): this { this.filters.push({ column, value }); return this; }

  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.owner.execute({
      table: this.table,
      action: this.action,
      filters: this.filters,
      payload: this.payload,
      countHead: this.countHead,
    })).then(onfulfilled);
  }
}

function processingTurn(
  rowProfileId: string,
  inboundMessageName = 'spaces/AAA/messages/BBB',
  rowConversationId = conversationId,
  questionText = '질문',
  receivedAt = '2026-08-19T00:00:00.000Z',
): Record<string, unknown> {
  return {
    id: 'turn-processing',
    profile_id: rowProfileId,
    conversation_id: rowConversationId,
    inbound_message_name: inboundMessageName,
    status: 'processing',
    question_text: questionText,
    answer_text: null,
    confidence: null,
    subject_slug: null,
    concept_tags: [],
    error_tags: [],
    needs_teacher_review: false,
    escalation_reason: null,
    received_at: receivedAt,
  };
}

function completedTurn(rowProfileId: string): Record<string, unknown> {
  return {
    ...processingTurn(rowProfileId, 'spaces/AAA/messages/completed'),
    id: 'turn-completed',
    status: 'completed',
    answer_text: '저장된 힌트입니다.',
    confidence: 0.91,
    subject_slug: 'gs1',
    concept_tags: ['quadratic'],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
