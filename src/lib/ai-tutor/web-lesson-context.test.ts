import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWebLessonContext } from './web-lesson-context';
import {
  activeToken,
  baseIdentity,
  blocks,
  fakePort,
  lesson,
  now,
  releasedAssignment,
} from './web-lesson-context.test-support';

test('resolveWebLessonContext accepts empty title fallback to label like the lesson page', async () => {
  // Given
  const port = fakePort({
    lesson: { ...lesson, title: '', label: '삼각함수' },
    token: activeToken,
    assignments: [releasedAssignment],
    blocksByVariant: { honors: blocks },
  });

  // When
  const result = await resolveWebLessonContext({ port, identity: baseIdentity, lessonSlug: lesson.publicSlug, now });

  // Then
  assert.equal(result.ok, true);
});

test('resolveWebLessonContext rejects a dynamic DS2 lesson when the assignment is for another lesson', async () => {
  // Given
  const port = fakePort({
    lesson: { ...lesson, title: '등비수열', publicSlug: 'ds2-geom-seq' },
    token: activeToken,
    assignments: [{ ...releasedAssignment, curriculumItemId: 'item-other' }],
    blocksByVariant: { honors: blocks },
  });

  // When
  const result = await resolveWebLessonContext({ port, identity: baseIdentity, lessonSlug: 'ds2-geom-seq', now });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'unassigned' });
  assert.deepEqual(port.calls, ['curriculum_items', 'student_tokens', 'student_lesson_assignments']);
});

test('resolveWebLessonContext rejects revoked expired missing and mismatched token records', async () => {
  // Given
  const cases = [
    { token: { ...activeToken, isActive: false }, reason: 'revoked_token' },
    { token: { ...activeToken, portalExpiresAt: '2026-08-21T02:59:00.000Z' }, reason: 'expired_token' },
    { token: null, reason: 'revoked_token' },
    { token: { ...activeToken, slug: 'jt-other' }, reason: 'revoked_token' },
    { token: { ...activeToken, profileId: 'profile-other' }, reason: 'revoked_token' },
  ] as const;

  for (const item of cases) {
    // When
    const result = await resolveWebLessonContext({
      port: fakePort({ lesson, token: item.token, assignments: [releasedAssignment], blocksByVariant: { honors: blocks } }),
      identity: baseIdentity,
      lessonSlug: lesson.publicSlug,
      now,
    });

    // Then
    assert.deepEqual(result, { ok: false, reason: item.reason });
  }
});

test('resolveWebLessonContext returns not_found and unassigned before block lookup', async () => {
  // Given
  const missingItem = fakePort({ lesson: null, token: activeToken, assignments: [releasedAssignment], blocksByVariant: { honors: blocks } });
  const unassigned = fakePort({ lesson, token: activeToken, assignments: [], blocksByVariant: { honors: blocks } });

  // When
  const notFoundResult = await resolveWebLessonContext({ port: missingItem, identity: baseIdentity, lessonSlug: lesson.publicSlug, now });
  const unassignedResult = await resolveWebLessonContext({ port: unassigned, identity: baseIdentity, lessonSlug: lesson.publicSlug, now });

  // Then
  assert.deepEqual(notFoundResult, { ok: false, reason: 'not_found' });
  assert.deepEqual(unassignedResult, { ok: false, reason: 'unassigned' });
  assert.equal(unassigned.calls.includes('session_blocks:honors'), false);
});

test('resolveWebLessonContext selects the latest released assignment and supports completed status', async () => {
  // Given
  const olderReleased = { ...releasedAssignment, id: 'sla-old', scheduledDate: '2026-08-19', variant: 'older' };
  const latestCompleted = {
    ...releasedAssignment,
    id: 'sla-completed',
    status: 'completed',
    scheduledDate: '2026-08-21',
    variant: 'completed',
  } as const;
  const port = fakePort({
    lesson,
    token: activeToken,
    assignments: [olderReleased, latestCompleted],
    blocksByVariant: { completed: blocks },
  });

  // When
  const result = await resolveWebLessonContext({ port, identity: baseIdentity, lessonSlug: lesson.publicSlug, now });

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail('Expected latest completed assignment to resolve');
  assert.equal(result.context.variant, 'completed');
  assert.deepEqual(port.calls.slice(-1), ['session_blocks:completed']);
});

test('resolveWebLessonContext fails closed for duplicate latest scheduled_date rows in both input orders', async () => {
  // Given
  const first = { ...releasedAssignment, id: 'sla-a', variant: 'a' };
  const second = { ...releasedAssignment, id: 'sla-b', variant: 'b' };
  const portA = fakePort({ lesson, token: activeToken, assignments: [first, second], blocksByVariant: { a: blocks, b: blocks } });
  const portB = fakePort({ lesson, token: activeToken, assignments: [second, first], blocksByVariant: { a: blocks, b: blocks } });

  // When
  const resultA = await resolveWebLessonContext({ port: portA, identity: baseIdentity, lessonSlug: lesson.publicSlug, now });
  const resultB = await resolveWebLessonContext({ port: portB, identity: baseIdentity, lessonSlug: lesson.publicSlug, now });

  // Then
  assert.deepEqual(resultA, { ok: false, reason: 'source_error' });
  assert.deepEqual(resultB, { ok: false, reason: 'source_error' });
  assert.equal(portA.calls.some((call) => call.startsWith('session_blocks:')), false);
  assert.equal(portB.calls.some((call) => call.startsWith('session_blocks:')), false);
});

test('resolveWebLessonContext enforces assignment release and lesson eligibility boundaries', async () => {
  // Given
  const cases = [
    { lesson, identity: baseIdentity, assignment: { ...releasedAssignment, releasedAt: null }, reason: 'unreleased' },
    { lesson, identity: baseIdentity, assignment: { ...releasedAssignment, releasedAt: '2026-08-21T03:00:01.000Z' }, reason: 'unreleased' },
    { lesson, identity: baseIdentity, assignment: { ...releasedAssignment, releasedAt: 'not-a-date' }, reason: 'unreleased' },
    {
      lesson: { ...lesson, curricula: { subjectSlug: 'gs1', title: '공통수학1' } },
      identity: baseIdentity,
      assignment: releasedAssignment,
      reason: 'wrong_lesson',
    },
    { lesson, identity: { ...baseIdentity, isMaster: true }, assignment: releasedAssignment, reason: 'wrong_lesson' },
    {
      lesson,
      identity: baseIdentity,
      assignment: { ...releasedAssignment, id: 'sla-pending', scheduledDate: '2026-08-22', status: 'pending', releasedAt: null },
      reason: 'unreleased',
    },
  ] as const;

  for (const item of cases) {
    // When
    const result = await resolveWebLessonContext({
      port: fakePort({ lesson: item.lesson, token: activeToken, assignments: [item.assignment], blocksByVariant: { honors: blocks } }),
      identity: item.identity,
      lessonSlug: item.lesson.publicSlug,
      now,
    });

    // Then
    assert.deepEqual(result, { ok: false, reason: item.reason });
  }
});
