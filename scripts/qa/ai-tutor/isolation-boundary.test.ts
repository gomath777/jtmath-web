import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoogleChatAiTutorOrchestrator } from '../../../src/lib/ai-tutor/orchestrator';
import { createGoogleChatAiTutorRuntime } from '../../../src/lib/ai-tutor/runtime';
import { resolveTutorContext, type AiTutorContextSource } from '../../../src/lib/ai-tutor/context';
import type { TutorContext, TutorProviderResult } from '../../../src/lib/ai-tutor/contracts';
import type { AiTutorRepository, AiTutorRepositoryResult, AiTutorTurnSnapshot } from '../../../src/lib/ai-tutor/repository';
import { createGoogleChatPost } from '../../../src/lib/google-chat/http';

const profileId = '00000000-0000-4000-8000-000000000001';
const turnId = '20000000-0000-4000-8000-000000000001';

test('isolation boundary authenticates before parsing malformed bodies', async () => {
  let handlerCalled = false;
  const post = createGoogleChatPost(
    { verify: async () => false },
    async () => {
      handlerCalled = true;
      return {};
    },
  );

  const response = await post(new Request('https://example.test/google-chat', { method: 'POST', body: '{' }));

  assert.equal(response.status, 401);
  assert.equal(handlerCalled, false);
});

test('isolation boundary loads context only for the linked profile id', async () => {
  const seen: string[] = [];
  const source: AiTutorContextSource = {
    loadProfileGrade: async (id) => { seen.push(`grade:${id}`); return { kind: 'ok', data: 2 }; },
    loadReleasedLessonItems: async (id) => { seen.push(`lesson:${id}`); return { kind: 'ok', data: [] }; },
    loadPublishedConceptItems: async (id) => { seen.push(`concept:${id}`); return { kind: 'ok', data: [] }; },
    loadRecentCompletedTutorTurns: async (input) => {
      seen.push(`turn:${input.profileId}`);
      return { kind: 'ok', data: [] };
    },
  };

  const result = await resolveTutorContext({
    profileId,
    source,
    caps: { recentTurnCount: 3, recentTurnCharacters: 200, recentTotalCharacters: 600 },
    now: new Date('2026-08-19T00:00:00.000Z'),
  });

  assert.equal(result.kind, 'resolved');
  assert.deepEqual(seen, [`grade:${profileId}`, `lesson:${profileId}`, `concept:${profileId}`, `turn:${profileId}`]);
});

test('isolation boundary fails closed when source schema is unavailable', async () => {
  const result = await resolveTutorContext({
    profileId,
    source: {
      loadProfileGrade: async () => ({ kind: 'schema_missing', table: 'profiles' }),
      loadReleasedLessonItems: async () => ({ kind: 'ok', data: [] }),
      loadPublishedConceptItems: async () => ({ kind: 'ok', data: [] }),
      loadRecentCompletedTutorTurns: async () => ({ kind: 'ok', data: [] }),
    },
    caps: { recentTurnCount: 3, recentTurnCharacters: 200, recentTotalCharacters: 600 },
  });

  assert.equal(result.kind, 'no_context');
  assert.deepEqual(result.context.releasedCurriculum, []);
});

test('isolation boundary preserves feature-disabled compatibility without enabled dependencies', async () => {
  const runtime = createGoogleChatAiTutorRuntime({ env: { AI_TUTOR_ENABLED: 'false' } });

  assert.equal(runtime.ok, true);
  if (runtime.ok) {
    const response = await runtime.handler(messageEvent());
    assert.match(JSON.stringify(response), /연결 테스트 성공/);
  }
});

test('isolation boundary prevents non-DM and unlinked users from reaching provider calls', async () => {
  const deps = createDeps({ identity: null });
  const handler = createGoogleChatAiTutorOrchestrator(deps);

  const namedSpace = await handler(messageEvent('named_space'));
  const unlinked = await handler(messageEvent('direct_message'));

  assert.match(JSON.stringify(namedSpace), /1:1 DM/);
  assert.match(JSON.stringify(unlinked), /연결 코드/);
  assert.equal(deps.calls.includes('engine'), false);
});

function messageEvent(channel: 'direct_message' | 'named_space' = 'direct_message') {
  return {
    kind: 'message' as const,
    userName: 'users/synthetic-chat-user',
    messageName: 'spaces/dm/messages/synthetic-1',
    space: { name: 'spaces/dm', type: channel === 'named_space' ? 'SPACE' : 'DM', channel },
    text: 'x^2-1=0',
    annotations: [],
    attachments: [],
    hasAttachment: false,
  };
}

function createDeps(options: { readonly identity?: null } = {}) {
  const calls: string[] = [];
  const repository: AiTutorRepository = {
    lookupIdentity: async () => {
      calls.push('lookupIdentity');
      return ok(options.identity === null ? null : { id: 'identity-1', chatUserName: 'users/synthetic-chat-user', profileId, status: 'active' });
    },
    createPendingIdentity: async () => { calls.push('createPendingIdentity'); return ok({ id: 'identity-1', chatUserName: 'users/synthetic-chat-user', profileId: null, status: 'pending' }); },
    upsertConversation: async () => { calls.push('upsertConversation'); return ok({ id: 'conversation-1', profileId, channelType: 'dm' }); },
    claimInboundTurn: async () => ok({ kind: 'claimed', turn: turnSnapshot('processing') }),
    getCompletedAnswer: async () => ok(null),
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
    contextProvider: { load: async (): Promise<TutorContext> => ({ gradeLabel: '고2', releasedCurriculum: [], recentTurns: [], repeatedConceptSignal: false }) },
    engine: { answer: async (): Promise<TutorProviderResult> => { calls.push('engine'); return safeResult(); } },
    imageProcessor: { process: async () => ({ ok: true as const }) },
  };
}

function turnSnapshot(status: AiTutorTurnSnapshot['status']): AiTutorTurnSnapshot {
  return { id: turnId, status, answerText: null, confidence: null, subjectSlug: null, conceptTags: [], errorTags: [], needsTeacherReview: false, escalationReason: null };
}

function safeResult(): TutorProviderResult {
  return { answerText: '양변을 인수분해해볼까요?', confidence: 0.9, subjectSlug: 'gs1', conceptTags: ['factor'], errorType: null, needsTeacherReview: false, escalationReason: null };
}

function ok<Value>(value: Value): AiTutorRepositoryResult<Value> {
  return { ok: true, value };
}
