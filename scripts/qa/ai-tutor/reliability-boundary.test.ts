import assert from 'node:assert/strict';
import test from 'node:test';
import { createTutorEngine } from '../../../src/lib/ai-tutor/engine';
import { normalizeTutorImage } from '../../../src/lib/ai-tutor/image-pipeline';
import { createGoogleChatAiTutorOrchestrator } from '../../../src/lib/ai-tutor/orchestrator';
import { duplicateFallbackResult } from '../../../src/lib/ai-tutor/repository';
import type { TutorContext, TutorProviderResult } from '../../../src/lib/ai-tutor/contracts';
import type { AiTutorRepository, AiTutorRepositoryResult, AiTutorTurnSnapshot } from '../../../src/lib/ai-tutor/repository';

const profileId = '00000000-0000-4000-8000-000000000001';
const turnId = '20000000-0000-4000-8000-000000000001';

test('reliability boundary maps provider schema corruption and throws to review fallbacks', async () => {
  const corrupt = createTutorEngine({
    provider: { answer: async () => ({ answerText: '', confidence: 2, subjectSlug: 'GS 1', conceptTags: [], errorType: null, needsTeacherReview: false, escalationReason: null }) },
  });
  const thrown = createTutorEngine({
    provider: { answer: async () => { throw new Error('quota exceeded with raw request'); } },
  });

  assert.equal((await corrupt.answer(providerRequest())).errorType, 'provider_error');
  assert.equal((await thrown.answer(providerRequest())).needsTeacherReview, true);
});

test('reliability boundary rejects spoofed or corrupt images before storage/model use', async () => {
  const result = await normalizeTutorImage({
    bytes: new TextEncoder().encode('%PDF-1.7 not an image'),
    declaredMimeType: 'image/png',
    maxBytes: 8 * 1024 * 1024,
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.outcome.reviewResult.errorType, 'unsupported_attachment');
});

test('reliability boundary returns deterministic duplicate fallbacks without provider calls', () => {
  const processing = duplicateFallbackResult('processing');
  const failed = duplicateFallbackResult('failed');

  assert.equal(processing.errorType, 'provider_error');
  assert.equal(duplicateFallbackResult('expired').errorType, 'timeout');
  assert.equal(failed.needsTeacherReview, true);
});

test('reliability boundary returns stored duplicate answers without a second model call', async () => {
  const deps = createDeps();
  const handler = createGoogleChatAiTutorOrchestrator(deps);

  const response = await handler(messageEvent());

  assert.match(JSON.stringify(response), /이미 저장된 답변/);
  assert.equal(deps.calls.includes('engine'), false);
});

function providerRequest() {
  return {
    input: { kind: 'text' as const, messageText: 'x^2=1' },
    context: context(),
  };
}

function messageEvent() {
  return {
    kind: 'message' as const,
    userName: 'users/synthetic-chat-user',
    messageName: 'spaces/dm/messages/synthetic-duplicate',
    space: { name: 'spaces/dm', type: 'DM', channel: 'direct_message' as const },
    text: 'x^2=1',
    annotations: [],
    attachments: [],
    hasAttachment: false,
  };
}

function createDeps() {
  const calls: string[] = [];
  const storedAnswer: TutorProviderResult = {
    answerText: '이미 저장된 답변입니다.',
    confidence: 0.8,
    subjectSlug: 'gs1',
    conceptTags: ['equation'],
    errorType: null,
    needsTeacherReview: false,
    escalationReason: null,
  };
  const repository: AiTutorRepository = {
    lookupIdentity: async () => ok({ id: 'identity-1', chatUserName: 'users/synthetic-chat-user', profileId, status: 'active' }),
    createPendingIdentity: async () => ok({ id: 'identity-1', chatUserName: 'users/synthetic-chat-user', profileId: null, status: 'pending' }),
    upsertConversation: async () => ok({ id: 'conversation-1', profileId, channelType: 'dm' }),
    claimInboundTurn: async () => ok({ kind: 'duplicate_completed', turnId, answer: storedAnswer }),
    getCompletedAnswer: async () => ok(storedAnswer),
    markTurnCompleted: async () => ok(turnSnapshot('completed')),
    markTurnFailed: async () => ok(turnSnapshot('failed')),
    readRecentTurns: async () => ok([]),
    countRecentConceptRepeats: async () => ok(0),
    recordAttachment: async () => ok({ id: 'attachment-1', turnId, profileId, status: 'stored' }),
    listTeacherReviewTurns: async () => ok([]),
    listRetentionCandidates: async () => ok({ rawContentTurnIds: [], imageAttachmentIds: [], metadataTurnIds: [] }),
  };
  return {
    calls,
    repository,
    hmacSecret: 'secret',
    now: () => new Date('2026-08-19T00:00:00.000Z'),
    contextProvider: { load: async (): Promise<TutorContext> => context() },
    engine: { answer: async (): Promise<TutorProviderResult> => { calls.push('engine'); return storedAnswer; } },
    imageProcessor: { process: async () => ({ ok: true as const }) },
  };
}

function context(): TutorContext {
  return { gradeLabel: '고2', releasedCurriculum: [], recentTurns: [], repeatedConceptSignal: false };
}

function turnSnapshot(status: AiTutorTurnSnapshot['status']): AiTutorTurnSnapshot {
  return { id: turnId, status, answerText: null, confidence: null, subjectSlug: null, conceptTags: [], errorTags: [], needsTeacherReview: false, escalationReason: null };
}

function ok<Value>(value: Value): AiTutorRepositoryResult<Value> {
  return { ok: true, value };
}
