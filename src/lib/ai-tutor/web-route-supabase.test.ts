import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWebLessonContext } from './web-lesson-context';
import { createSupabaseWebLessonPort, type SupabaseWebLessonClient } from './web-route-supabase';

type Fixture = {
  readonly single?: unknown;
  readonly list?: unknown;
  readonly error?: unknown;
};

test('Given malformed curriculum rows When loading by slug Then the adapter rejects instead of coercing', async () => {
  // Given
  const malformedRows = [
    { ...validCurriculumRow(), id: 1 },
    { ...validCurriculumRow(), public_slug: 1 },
    { ...validCurriculumRow(), curricula: { subject_slug: null, title: 'Synthetic subject' } },
  ] as const;

  for (const row of malformedRows) {
    const port = createSupabaseWebLessonPort(fakeSupabase({ curriculum_items: { single: row } }));

    // When / Then
    await assert.rejects(() => port.loadCurriculumItemBySlug('synthetic-lesson'), /web lesson source unavailable/);
  }
});

test('Given malformed token rows When loading a token Then the adapter rejects instead of coercing', async () => {
  // Given
  const malformedRows = [
    { ...validTokenRow(), id: 1 },
    { ...validTokenRow(), profile_id: 1 },
    { ...validTokenRow(), slug: 1 },
    { ...validTokenRow(), is_active: 'true' },
    { ...validTokenRow(), portal_expires_at: 1 },
  ] as const;

  for (const row of malformedRows) {
    const port = createSupabaseWebLessonPort(fakeSupabase({ student_tokens: { single: row } }));

    // When / Then
    await assert.rejects(
      () => port.loadStudentToken({ profileId: 'profile-synthetic', slug: 'student-synthetic' }),
      /web token source unavailable/,
    );
  }
});

test('Given malformed assignment rows When loading assignments Then the adapter rejects instead of coercing', async () => {
  // Given
  const malformedRows = [
    { ...validAssignmentRow(), id: 1 },
    { ...validAssignmentRow(), curriculum_item_id: 1 },
    { ...validAssignmentRow(), profile_id: 1 },
    { ...validAssignmentRow(), status: 'unexpected' },
    { ...validAssignmentRow(), scheduled_date: 1 },
    { ...validAssignmentRow(), released_at: 1 },
    { ...validAssignmentRow(), variant: 1 },
  ] as const;

  for (const row of malformedRows) {
    const port = createSupabaseWebLessonPort(fakeSupabase({ student_lesson_assignments: { list: [row] } }));

    // When / Then
    await assert.rejects(
      () => port.loadStudentLessonAssignments({ profileId: 'profile-synthetic', curriculumItemId: 'item-synthetic' }),
      /web assignment source unavailable/,
    );
  }
});

test('Given malformed session block rows When loading blocks Then the adapter rejects instead of coercing', async () => {
  // Given
  const malformedRows = [
    { ...validSessionBlockRow(), id: 1 },
    { ...validSessionBlockRow(), block_type: 1 },
    { ...validSessionBlockRow(), order_index: '1' },
    { ...validSessionBlockRow(), order_index: 1.5 },
    { ...validSessionBlockRow(), variant: null },
    { ...validSessionBlockRow(), content: [] },
  ] as const;

  for (const row of malformedRows) {
    const port = createSupabaseWebLessonPort(fakeSupabase({ session_blocks: { list: [row] } }));

    // When / Then
    await assert.rejects(
      () => port.loadSessionBlocks({ curriculumItemId: 'item-synthetic', variant: 'default' }),
      /web block source unavailable/,
    );
  }
});

test('Given a valid session block row When loading blocks Then the database id is preserved', async () => {
  // Given
  const port = createSupabaseWebLessonPort(fakeSupabase({ session_blocks: { list: [validSessionBlockRow()] } }));

  // When
  const blocks = await port.loadSessionBlocks({ curriculumItemId: 'item-synthetic', variant: 'default' });

  // Then
  assert.deepEqual(blocks, [
    {
      id: 'block-synthetic-valid',
      blockType: 'content_group',
      orderIndex: 2,
      variant: 'default',
      content: { label: 'Synthetic material' },
    },
  ]);
});

test('Given a malformed Supabase block row When resolving lesson context Then it fails closed as source_error', async () => {
  // Given
  const port = createSupabaseWebLessonPort(fakeSupabase({
    curriculum_items: { single: validCurriculumRow() },
    student_tokens: { single: validTokenRow() },
    student_lesson_assignments: { list: [validAssignmentRow()] },
    session_blocks: { list: [{ ...validSessionBlockRow(), order_index: '2' }] },
  }));

  // When
  const result = await resolveWebLessonContext({
    port,
    identity: { profileId: 'profile-synthetic', slug: 'student-synthetic' },
    lessonSlug: 'lesson-synthetic',
    now: new Date('2026-08-24T01:00:00.000Z'),
  });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'source_error' });
});

function fakeSupabase(fixtures: Readonly<Record<string, Fixture>>): SupabaseWebLessonClient {
  return {
    from: (table) => new FakeQuery(fixtures[table] ?? {}),
  };
}

class FakeQuery {
  readonly #fixture: Fixture;

  constructor(fixture: Fixture) {
    this.#fixture = fixture;
  }

  select(_columns: string): FakeQuery {
    return this;
  }

  eq(_column: string, _value: string): FakeQuery {
    return this;
  }

  async maybeSingle(): Promise<{ readonly data: unknown; readonly error: unknown }> {
    return { data: this.#fixture.single ?? null, error: this.#fixture.error ?? null };
  }

  async order(_column: string, _options: { readonly ascending: boolean }): Promise<{ readonly data: unknown; readonly error: unknown }> {
    return { data: this.#fixture.list ?? [], error: this.#fixture.error ?? null };
  }
}

function validCurriculumRow() {
  return {
    id: 'item-synthetic',
    public_slug: 'lesson-synthetic',
    title: 'Synthetic unit',
    label: null,
    curricula: { subject_slug: 'ds2', title: 'Synthetic subject' },
  };
}

function validTokenRow() {
  return {
    id: 'token-synthetic',
    profile_id: 'profile-synthetic',
    slug: 'student-synthetic',
    is_active: true,
    portal_expires_at: null,
  };
}

function validAssignmentRow() {
  return {
    id: 'assignment-synthetic',
    curriculum_item_id: 'item-synthetic',
    profile_id: 'profile-synthetic',
    status: 'released',
    scheduled_date: '2026-08-24',
    released_at: '2026-08-23T00:00:00.000Z',
    variant: 'default',
  };
}

function validSessionBlockRow() {
  return {
    id: 'block-synthetic-valid',
    block_type: 'content_group',
    order_index: 2,
    variant: 'default',
    content: { label: 'Synthetic material' },
  };
}
