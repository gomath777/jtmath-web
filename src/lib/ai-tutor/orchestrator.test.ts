import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoogleChatAiTutorOrchestrator } from './orchestrator';
import type { AiTutorMediaOutcomeCode } from './chat-media';
import type { TutorContext, TutorProviderResult } from './contracts';
import type { AiTutorRepository, AiTutorRepositoryResult, AiTutorTurnSnapshot } from './repository';

const profileId = '00000000-0000-4000-8000-000000000001';
const identityId = '10000000-0000-4000-8000-000000000001';
const turnId = '20000000-0000-4000-8000-000000000001';
const context: TutorContext = { gradeLabel: '고2', releasedCurriculum: [], recentTurns: [], repeatedConceptSignal: false };
const answer: TutorProviderResult = {
  answerText: '먼저 식을 한쪽으로 정리해볼까요?',
  confidence: 0.9,
  subjectSlug: 'gs1',
  conceptTags: ['quadratic'],
  errorType: null,
  needsTeacherReview: false,
  escalationReason: null,
};

test('orchestrator returns DM-only response without repository or model calls for named spaces', async () => {
  const deps = createDeps();
  const handler = createGoogleChatAiTutorOrchestrator(deps);

  const response = await handler(messageEvent({ channel: 'named_space' }));

  assert.match(JSON.stringify(response), /1:1 DM/);
  assert.deepEqual(deps.calls, []);
});

test('orchestrator issues one pairing code for an unlinked stable Chat user', async () => {
  const deps = createDeps({ identity: null });
  const handler = createGoogleChatAiTutorOrchestrator(deps);

  const response = await handler(messageEvent());

  assert.match(JSON.stringify(response), /연결 코드/);
  assert.equal(deps.calls.includes('createPendingIdentity'), true);
  assert.equal(deps.calls.includes('engine'), false);
});

test('orchestrator answers a linked DM after claim context engine and persistence', async () => {
  const deps = createDeps();
  const handler = createGoogleChatAiTutorOrchestrator(deps);

  const response = await handler(messageEvent());

  assert.match(JSON.stringify(response), /먼저 식/);
  assert.deepEqual(deps.calls, ['lookupIdentity', 'upsertConversation', 'claimInboundTurn', 'context', 'engine', 'markTurnCompleted']);
});

test('orchestrator returns stored duplicate answer without a second model call', async () => {
  const deps = createDeps({ duplicateAnswer: answer });
  const handler = createGoogleChatAiTutorOrchestrator(deps);

  const response = await handler(messageEvent());

  assert.match(JSON.stringify(response), /먼저 식/);
  assert.equal(deps.calls.includes('engine'), false);
});

test('orchestrator persists unsupported image fallback without calling the model', async () => {
  const deps = createDeps({ imageFails: 'unsupported_mime' });
  const handler = createGoogleChatAiTutorOrchestrator(deps);

  const response = await handler(messageEvent({ hasAttachment: true }));

  assert.match(JSON.stringify(response), /이미지는 JPEG/);
  assert.equal(deps.calls.includes('markTurnFailed'), true);
  assert.equal(deps.calls.includes('engine'), false);
});

function messageEvent(options: { readonly channel?: 'direct_message' | 'named_space'; readonly hasAttachment?: boolean } = {}) {
  return {
    kind: 'message' as const,
    userName: 'users/test-chat-user',
    messageName: 'spaces/dm/messages/message-1',
    space: { name: 'spaces/dm', type: options.channel === 'named_space' ? 'SPACE' : 'DM', channel: options.channel ?? 'direct_message' },
    text: 'x^2-5x+6=0',
    annotations: [],
    attachments: options.hasAttachment
      ? [{ contentType: 'image/png', attachmentDataRef: { resourceName: 'attachments/image-data' } }]
      : [],
    hasAttachment: options.hasAttachment ?? false,
  };
}

function createDeps(options: {
  readonly identity?: null;
  readonly duplicateAnswer?: TutorProviderResult;
  readonly imageFails?: AiTutorMediaOutcomeCode;
} = {}) {
  const calls: string[] = [];
  const turn = turnSnapshot('processing');
  const repository: AiTutorRepository = {
    lookupIdentity: async () => {
      calls.push('lookupIdentity');
      return ok(options.identity === null ? null : { id: identityId, chatUserName: 'users/test-chat-user', profileId, status: 'active' });
    },
    createPendingIdentity: async () => {
      calls.push('createPendingIdentity');
      return ok({ id: identityId, chatUserName: 'users/test-chat-user', profileId: null, status: 'pending' });
    },
    upsertConversation: async () => { calls.push('upsertConversation'); return ok({ id: 'conversation-1', profileId, channelType: 'dm' }); },
    claimInboundTurn: async () => {
      calls.push('claimInboundTurn');
      return ok(options.duplicateAnswer === undefined ? { kind: 'claimed', turn } : { kind: 'duplicate_completed', turnId, answer: options.duplicateAnswer });
    },
    getCompletedAnswer: async () => ok(null),
    markTurnCompleted: async () => { calls.push('markTurnCompleted'); return ok(turnSnapshot('completed')); },
    markTurnFailed: async () => { calls.push('markTurnFailed'); return ok(turnSnapshot('failed')); },
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
    contextProvider: { load: async () => { calls.push('context'); return context; } },
    engine: { answer: async () => { calls.push('engine'); return answer; } },
    imageProcessor: {
      process: async () => {
        calls.push('image');
        return options.imageFails
          ? { ok: false as const, outcome: { code: options.imageFails, reviewResult: unsupportedImage() } }
          : { ok: true as const };
      },
    },
  };
}

function turnSnapshot(status: AiTutorTurnSnapshot['status']): AiTutorTurnSnapshot {
  return { id: turnId, status, answerText: null, confidence: null, subjectSlug: null, conceptTags: [], errorTags: [], needsTeacherReview: false, escalationReason: null };
}

function unsupportedImage(): TutorProviderResult {
  return { answerText: '이미지는 JPEG, PNG, WebP 한 장만 받을 수 있어요.', confidence: 0, subjectSlug: null, conceptTags: [], errorType: 'unsupported_attachment', needsTeacherReview: true, escalationReason: 'unsupported_attachment' };
}

function ok<Value>(value: Value): AiTutorRepositoryResult<Value> {
  return { ok: true, value };
}
