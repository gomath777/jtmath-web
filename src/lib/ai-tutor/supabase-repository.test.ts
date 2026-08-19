import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSupabaseAiTutorRepository,
} from './supabase-repository';
import { FakeSupabase, conversationId, profileId } from './supabase-repository.test-support';

test('claimInboundTurn creates one new turn and classifies 49 concurrent duplicates', async () => {
  // Given
  const fake = new FakeSupabase();
  const repository = createSupabaseAiTutorRepository(fake.client);
  const input = {
    profileId,
    conversationId,
    inboundMessageName: 'spaces/AAA/messages/BBB',
    questionText: 'x^2-5x+6=0 질문',
    receivedAt: '2026-08-19T00:00:00.000Z',
  };

  // When
  const results = await Promise.all(
    Array.from({ length: 50 }, () => repository.claimInboundTurn(input)),
  );

  // Then
  const okResults = results.filter((result) => result.ok).map((result) => result.value);
  assert.equal(okResults.filter((result) => result.kind === 'claimed').length, 1);
  assert.equal(okResults.filter((result) => result.kind === 'duplicate_fallback').length, 49);
  assert.equal(fake.turnInsertCount, 1);
});

test('claimInboundTurn returns a stored answer for completed duplicates', async () => {
  // Given
  const fake = new FakeSupabase();
  fake.seedCompletedTurn();
  const repository = createSupabaseAiTutorRepository(fake.client);

  // When
  const result = await repository.claimInboundTurn({
    profileId,
    conversationId,
    inboundMessageName: 'spaces/AAA/messages/completed',
    questionText: '이미 답한 질문',
    receivedAt: '2026-08-19T00:01:00.000Z',
  });

  // Then
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.value.kind : 'error', 'duplicate_completed');
  assert.equal(result.ok && result.value.kind === 'duplicate_completed' ? result.value.answer.answerText : '', '저장된 힌트입니다.');
  assert.equal(fake.turnInsertCount, 1);
});

test('upsertConversation creates a DM conversation without PostgREST onConflict upsert', async () => {
  // Given
  const fake = new FakeSupabase();
  const repository = createSupabaseAiTutorRepository(fake.client);

  // When
  const result = await repository.upsertConversation({
    profileId,
    identityId: '20000000-0000-4000-8000-000000000001',
    chatSpaceName: 'spaces/AAA',
    chatThreadName: null,
    channelType: 'dm',
    seenAt: '2026-08-19T00:00:00.000Z',
  });

  // Then
  assert.equal(result.ok, true);
  assert.equal(
    fake.operations.some((operation) => operation.table === 'ai_tutor_conversations' && operation.action === 'upsert'),
    false,
  );
  assert.equal(
    fake.operations.some((operation) => operation.table === 'ai_tutor_conversations' && operation.action === 'insert'),
    true,
  );
});

test('student-scoped methods always add a profile_id predicate', async () => {
  // Given
  const fake = new FakeSupabase();
  const repository = createSupabaseAiTutorRepository(fake.client);

  // When
  await repository.upsertConversation({
    profileId,
    identityId: '20000000-0000-4000-8000-000000000001',
    chatSpaceName: 'spaces/AAA',
    chatThreadName: null,
    channelType: 'dm',
    seenAt: '2026-08-19T00:00:00.000Z',
  });
  await repository.getCompletedAnswer({ profileId, inboundMessageName: 'spaces/AAA/messages/none' });
  await repository.markTurnFailed({
    profileId,
    turnId: 'turn-failed',
    errorType: 'provider_error',
    escalationReason: 'provider_error',
    answerText: '선생님 확인이 필요합니다.',
    completedAt: '2026-08-19T00:02:00.000Z',
  });
  await repository.readRecentTurns({ profileId, conversationId, limit: 3 });
  await repository.countRecentConceptRepeats({
    profileId,
    conceptTags: ['quadratic'],
    since: '2026-08-18T00:00:00.000Z',
  });
  await repository.recordAttachment({
    profileId,
    turnId: 'turn-attachment',
    attachmentResourceName: 'attachment/1',
    declaredMimeType: 'image/png',
    normalizedMimeType: 'image/jpeg',
    sizeBytes: 123,
    sha256: 'a'.repeat(64),
    privateStoragePath: 'ai-tutor-private/hash/turn/a.jpg',
    status: 'stored',
  });
  await repository.listTeacherReviewTurns({ profileId, limit: 5 });
  await repository.listRetentionCandidates({
    profileId,
    rawContentCutoff: '2026-05-01T00:00:00.000Z',
    imageCutoff: '2026-07-01T00:00:00.000Z',
    metadataCutoff: '2025-08-19T00:00:00.000Z',
    limit: 10,
  });

  // Then
  const scoped = fake.operations.filter((operation) => operation.table !== 'ai_tutor_identities');
  assert.equal(scoped.length > 0, true);
  assert.equal(
    scoped.every((operation) =>
      operation.filters.some((filter) => filter.column === 'profile_id' && filter.value === profileId),
    ),
    true,
  );
});

test('repository errors are redacted into domain codes', async () => {
  // Given
  const fake = new FakeSupabase({ failReads: true });
  const repository = createSupabaseAiTutorRepository(fake.client);

  // When
  const result = await repository.lookupIdentity({ chatUserName: 'users/synthetic' });

  // Then
  assert.equal(result.ok, false);
  assert.equal(result.ok ? '' : result.error.code, 'unavailable');
  assert.equal(JSON.stringify(result).includes('secret-db-detail'), false);
  assert.equal(JSON.stringify(result).includes('synthetic'), false);
});

test('claimInboundTurn prevents cross-profile duplicate reads after a conflict', async () => {
  // Given
  const fake = new FakeSupabase();
  fake.seedOtherProfileTurn();
  const repository = createSupabaseAiTutorRepository(fake.client);

  // When
  const result = await repository.claimInboundTurn({
    profileId,
    conversationId,
    inboundMessageName: 'spaces/AAA/messages/other-profile',
    questionText: '다른 학생 질문',
    receivedAt: '2026-08-19T00:03:00.000Z',
  });

  // Then
  assert.equal(result.ok, false);
  assert.equal(result.ok ? '' : result.error.code, 'not_found');
});
