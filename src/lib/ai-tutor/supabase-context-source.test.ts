import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSupabaseAiTutorContextSource,
  type SupabaseAiTutorQueryResult,
} from './supabase-context-source';

type QueryOperation =
  | { readonly op: 'select'; readonly columns: string }
  | { readonly op: 'eq'; readonly column: string; readonly value: unknown }
  | { readonly op: 'in'; readonly column: string; readonly values: readonly unknown[] }
  | { readonly op: 'not'; readonly column: string; readonly operator: string; readonly value: unknown }
  | { readonly op: 'is'; readonly column: string; readonly value: unknown }
  | { readonly op: 'lte'; readonly column: string; readonly value: unknown }
  | { readonly op: 'gte'; readonly column: string; readonly value: unknown }
  | { readonly op: 'order'; readonly column: string; readonly ascending: boolean }
  | { readonly op: 'limit'; readonly count: number }
  | { readonly op: 'single' };

type QueryRecord = {
  readonly table: string;
  readonly operations: QueryOperation[];
};

type Fixture = {
  readonly data: unknown;
  readonly error: SupabaseAiTutorQueryResult<unknown>['error'];
};

class RecordingQuery implements PromiseLike<SupabaseAiTutorQueryResult<unknown>> {
  readonly operations: QueryOperation[] = [];

  constructor(private readonly fixture: Fixture) {}

  select(columns: string): this {
    this.operations.push({ op: 'select', columns });
    return this;
  }

  eq(column: string, value: unknown): this {
    this.operations.push({ op: 'eq', column, value });
    return this;
  }

  in(column: string, values: readonly unknown[]): this {
    this.operations.push({ op: 'in', column, values });
    return this;
  }

  not(column: string, operator: string, value: unknown): this {
    this.operations.push({ op: 'not', column, operator, value });
    return this;
  }

  is(column: string, value: unknown): this {
    this.operations.push({ op: 'is', column, value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.operations.push({ op: 'lte', column, value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.operations.push({ op: 'gte', column, value });
    return this;
  }

  order(column: string, options: { readonly ascending: boolean }): this {
    this.operations.push({ op: 'order', column, ascending: options.ascending });
    return this;
  }

  limit(count: number): this {
    this.operations.push({ op: 'limit', count });
    return this;
  }

  single(): this {
    this.operations.push({ op: 'single' });
    return this;
  }

  then<TResult1 = SupabaseAiTutorQueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: SupabaseAiTutorQueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: this.fixture.data, error: this.fixture.error }).then(onfulfilled, onrejected);
  }
}

class RecordingSupabase {
  readonly records: QueryRecord[] = [];

  constructor(private readonly fixtures: Readonly<Record<string, Fixture>>) {}

  from(table: string): RecordingQuery {
    const query = new RecordingQuery(this.fixtures[table] ?? { data: [], error: null });
    this.records.push({ table, operations: query.operations });
    return query;
  }
}

function selectedColumns(record: QueryRecord): string {
  const selectOp = record.operations.find((operation) => operation.op === 'select');
  assert.ok(selectOp && selectOp.op === 'select');
  return selectOp.columns;
}

test('loadProfileGrade selects only grade and filters by the linked profile id', async () => {
  // Given
  const supabase = new RecordingSupabase({
    profiles: { data: { grade: 2, name: 'must-not-read' }, error: null },
  });
  const source = createSupabaseAiTutorContextSource({ supabase, now: () => new Date('2026-08-19T00:00:00.000Z') });

  // When
  const result = await source.loadProfileGrade('profile-1');

  // Then
  assert.deepEqual(result, { kind: 'ok', data: 2 });
  assert.equal(supabase.records[0]?.table, 'profiles');
  assert.equal(selectedColumns(supabase.records[0]!), 'grade');
  assert.ok(supabase.records[0]?.operations.some((operation) => operation.op === 'eq' && operation.column === 'id' && operation.value === 'profile-1'));
});

test('loadReleasedLessonItems uses only SLA curriculum joins with explicit profile and release filters', async () => {
  // Given
  const supabase = new RecordingSupabase({
    student_lesson_assignments: { data: [], error: null },
  });
  const source = createSupabaseAiTutorContextSource({ supabase, now: () => new Date('2026-08-19T00:00:00.000Z') });

  // When
  await source.loadReleasedLessonItems('profile-1');

  // Then
  const record = supabase.records[0]!;
  assert.equal(record.table, 'student_lesson_assignments');
  assert.match(selectedColumns(record), /curriculum_items!inner/);
  assert.match(selectedColumns(record), /curricula/);
  assert.doesNotMatch(selectedColumns(record), /public_slug|pdf|url|name|school|email|birth|phone|student_sessions|block_assignments/i);
  assert.ok(record.operations.some((operation) => operation.op === 'eq' && operation.column === 'profile_id' && operation.value === 'profile-1'));
  assert.ok(record.operations.some((operation) => operation.op === 'in' && operation.column === 'status' && operation.values.join(',') === 'released,completed'));
  assert.ok(record.operations.some((operation) => operation.op === 'not' && operation.column === 'released_at' && operation.operator === 'is' && operation.value === null));
  assert.ok(record.operations.some((operation) => operation.op === 'order' && operation.column === 'scheduled_date' && operation.ascending === false));
});

test('loadPublishedConceptItems uses assignments joined to concept learning sets and published filters', async () => {
  // Given
  const supabase = new RecordingSupabase({
    assignments: { data: [], error: null },
  });
  const source = createSupabaseAiTutorContextSource({ supabase, now: () => new Date('2026-08-19T00:00:00.000Z') });

  // When
  await source.loadPublishedConceptItems('profile-1');

  // Then
  const record = supabase.records[0]!;
  assert.equal(record.table, 'assignments');
  assert.match(selectedColumns(record), /learning_sets!inner/);
  assert.doesNotMatch(selectedColumns(record), /pdf|url|filename|name|school|email|birth|phone|student_sessions|block_assignments/i);
  assert.ok(record.operations.some((operation) => operation.op === 'eq' && operation.column === 'user_id' && operation.value === 'profile-1'));
  assert.ok(record.operations.some((operation) => operation.op === 'not' && operation.column === 'published_at' && operation.operator === 'is' && operation.value === null));
  assert.ok(record.operations.some((operation) => operation.op === 'lte' && operation.column === 'published_at'));
  assert.ok(record.operations.some((operation) => operation.op === 'eq' && operation.column === 'learning_sets.kind' && operation.value === 'concept'));
  assert.ok(record.operations.some((operation) => operation.op === 'order' && operation.column === 'published_at' && operation.ascending === false));
});

test('loadRecentCompletedTutorTurns scopes to profile, completed status, recency, raw retention, and caller limit', async () => {
  // Given
  const supabase = new RecordingSupabase({
    ai_tutor_turns: { data: [], error: null },
  });
  const source = createSupabaseAiTutorContextSource({ supabase, now: () => new Date('2026-08-19T00:00:00.000Z') });

  // When
  await source.loadRecentCompletedTutorTurns({
    profileId: 'profile-1',
    since: new Date('2026-07-20T00:00:00.000Z'),
    limit: 40,
  });

  // Then
  const record = supabase.records[0]!;
  assert.equal(record.table, 'ai_tutor_turns');
  assert.equal(selectedColumns(record), 'received_at, question_text, answer_text, concept_tags');
  assert.ok(record.operations.some((operation) => operation.op === 'eq' && operation.column === 'profile_id' && operation.value === 'profile-1'));
  assert.ok(record.operations.some((operation) => operation.op === 'eq' && operation.column === 'status' && operation.value === 'completed'));
  assert.ok(record.operations.some((operation) => operation.op === 'is' && operation.column === 'raw_content_deleted_at' && operation.value === null));
  assert.ok(record.operations.some((operation) => operation.op === 'gte' && operation.column === 'received_at' && operation.value === '2026-07-20T00:00:00.000Z'));
  assert.ok(record.operations.some((operation) => operation.op === 'limit' && operation.count === 40));
});

test('supabase context source converts missing schema errors into redacted schema_missing results', async () => {
  // Given
  const supabase = new RecordingSupabase({
    student_lesson_assignments: {
      data: null,
      error: { code: '42P01', message: 'relation does not exist' },
    },
  });
  const source = createSupabaseAiTutorContextSource({ supabase, now: () => new Date('2026-08-19T00:00:00.000Z') });

  // When
  const result = await source.loadReleasedLessonItems('profile-1');

  // Then
  assert.deepEqual(result, { kind: 'schema_missing', table: 'student_lesson_assignments' });
  assert.equal(JSON.stringify(result).includes('relation does not exist'), false);
});
