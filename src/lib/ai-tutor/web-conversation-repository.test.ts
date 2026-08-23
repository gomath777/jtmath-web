import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFakeWebConversationSupabase,
  webAssignmentId,
  webConversationInput,
  webOtherProfileId,
  webProfileId,
  webTurnClaimInput,
} from './web-conversation-test-support';
import { createSupabaseWebConversationRepository } from './web-conversation-supabase';

test('claimRequest returns one provider-eligible turn when the same request is claimed concurrently', async () => {
  // Given
  const fake = createFakeWebConversationSupabase();
  const repository = createSupabaseWebConversationRepository(fake.client);
  const conversation = await repository.upsertConversation(webConversationInput());
  assert.equal(conversation.ok, true);
  if (!conversation.ok) return;

  // When
  const claims = await Promise.all(
    Array.from({ length: 50 }, () =>
      repository.claimRequest(webTurnClaimInput({ conversationId: conversation.value.id })),
    ),
  );

  // Then
  const claimedCount = claims.filter((claim) => claim.ok && claim.value.kind === 'claimed').length;
  assert.equal(claimedCount, 1);
  assert.equal(fake.providerEligibleClaimCount, 1);
});

test('claimRequest denies duplicate request reads across profile scope', async () => {
  // Given
  const fake = createFakeWebConversationSupabase();
  const repository = createSupabaseWebConversationRepository(fake.client);
  const conversation = await repository.upsertConversation(webConversationInput());
  assert.equal(conversation.ok, true);
  if (!conversation.ok) return;
  const firstClaim = await repository.claimRequest(webTurnClaimInput({ conversationId: conversation.value.id }));
  assert.equal(firstClaim.ok, true);

  // When
  const crossProfile = await repository.claimRequest(
    webTurnClaimInput({
      conversationId: conversation.value.id,
      profileId: webOtherProfileId,
    }),
  );

  // Then
  assert.equal(crossProfile.ok, false);
  if (crossProfile.ok) assert.fail('cross-profile claim unexpectedly succeeded');
  assert.equal(crossProfile.error.code, 'permission_denied');
});

test('markCompleted stores token metadata and readRecentTurns returns bounded scoped history', async () => {
  // Given
  const fake = createFakeWebConversationSupabase();
  const repository = createSupabaseWebConversationRepository(fake.client);
  const conversation = await repository.upsertConversation(webConversationInput());
  assert.equal(conversation.ok, true);
  if (!conversation.ok) return;
  const claim = await repository.claimRequest(webTurnClaimInput({ conversationId: conversation.value.id }));
  assert.equal(claim.ok, true);
  if (!claim.ok || claim.value.kind !== 'claimed') return;

  // When
  const completed = await repository.markCompleted({
    profileId: webProfileId,
    assignmentId: webAssignmentId,
    turnId: claim.value.turn.id,
    answerText: '단계형 힌트 답변',
    provider: 'gemini',
    modelAlias: 'fast',
    promptVersion: 'web-v1',
    inputTokens: 123,
    outputTokens: 45,
    totalTokens: 168,
    latencyMs: 321,
    completedAt: '2026-08-23T00:00:02.000Z',
  });
  const recent = await repository.readRecentTurns({
    profileId: webProfileId,
    assignmentId: webAssignmentId,
    conversationId: conversation.value.id,
    limit: 1,
  });

  // Then
  assert.equal(completed.ok, true);
  assert.equal(recent.ok, true);
  if (!completed.ok || !recent.ok) return;
  assert.equal(completed.value.inputTokens, 123);
  assert.equal(completed.value.totalTokens, 168);
  assert.deepEqual(recent.value, [
    { role: 'student', text: '도와주세요', targetMaterialKey: 'material:gs2:line' },
    { role: 'tutor', text: '단계형 힌트 답변', targetMaterialKey: 'material:gs2:line' },
  ]);
});

test('listRetentionCandidates keeps metadata after raw content becomes eligible', async () => {
  // Given
  const fake = createFakeWebConversationSupabase();
  const repository = createSupabaseWebConversationRepository(fake.client);
  fake.seedRetentionRows();

  // When
  const candidates = await repository.listRetentionCandidates({
    profileId: webProfileId,
    rawContentCutoff: '2026-08-24T00:00:00.000Z',
    metadataCutoff: '2026-01-01T00:00:00.000Z',
    limit: 10,
  });

  // Then
  assert.equal(candidates.ok, true);
  if (!candidates.ok) return;
  assert.deepEqual(candidates.value.rawContentTurnIds, ['turn-retention-raw']);
  assert.deepEqual(candidates.value.metadataTurnIds, []);
  assert.equal(fake.containsRawContentInReceipts(), false);
});
