import assert from 'node:assert/strict';
import test from 'node:test';
import { createFixtures, validBody } from './web-handler.test-support';
import { GUIDE_LESSON_SLUG, guideLesson, unavailableRegisteredGuideStore, verifiedGuideStore } from './web-handler-guide.test-support';
import { createSupabaseWebConversationRepository } from './web-conversation-supabase';
import { createFakeWebConversationSupabase, webAssignmentId, webProfileId } from './web-conversation-test-support';
import './web-handler-graph.cases';

const guideMaterialKey = 'm-1-content-pdfs-3';
const persistedLesson = { ...guideLesson, id: '00000000-0000-4000-8000-000000000401' } as const;
const persistedIdentity = { profileId: webProfileId, slug: 'persisted-profile', isMaster: false } as const;
const persistedToken = { id: 'token-persisted', profileId: webProfileId, slug: persistedIdentity.slug, isActive: true, portalExpiresAt: null } as const;
const persistedAssignment = {
  id: webAssignmentId,
  curriculumItemId: persistedLesson.id,
  profileId: webProfileId,
  status: 'released',
  scheduledDate: '2026-08-20',
  releasedAt: '2026-08-20T09:00:00.000Z',
  variant: 'honors',
} as const;

test('Given disabled web tutor config When posting Then the handler returns 404 before provider work', async () => {
  const fixtures = createFixtures({ env: { AI_TUTOR_WEB_ENABLED: 'false' } });
  const response = await fixtures.post(validBody());

  assert.equal(response.status, 404);
  assert.equal(fixtures.providerRequests.length, 0);
});

test('Given a verified standard guide stage When posting Then the handler answers without provider tokens or graph fields', async () => {
  const fixtures = createFixtures({ lesson: guideLesson, guideStore: verifiedGuideStore([]) });
  const response = await fixtures.post({
    lessonSlug: GUIDE_LESSON_SLUG,
    selectedMaterialKey: guideMaterialKey,
    message: '3번 결정적 힌트 줘',
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'answered');
  assert.match(body.message, /synthetic decisive hint/);
  assert.equal(fixtures.providerRequests.length, 0);
  assert.equal(body.meta.provider.attemptCount, 0);
  assert.equal(body.meta.provider.tokenCounts.total, 0);
  assert.equal('visualSpec' in body, false);
  assert.equal('presentation' in body, false);
  assert.deepEqual(body.resolvedTarget, {
    contextKey: body.resolvedTarget.contextKey,
    materialKey: guideMaterialKey,
    problemNumber: 3,
  });
});

test('Given a verified free-form clarification and provider failure When posting Then the handler returns the nearest guide stage with failure metadata', async () => {
  const fixtures = createFixtures({
    lesson: guideLesson,
    guideStore: verifiedGuideStore([]),
    providerResult: {
      answerText: 'synthetic failed answer',
      confidence: 0,
      subjectSlug: null,
      conceptTags: [],
      errorType: 'provider_error',
      needsTeacherReview: true,
      escalationReason: 'provider_error',
    },
  });
  const response = await fixtures.post({
    lessonSlug: GUIDE_LESSON_SLUG,
    selectedMaterialKey: guideMaterialKey,
    message: '3번에서 이 조건을 왜 정리하는지 설명해 줘',
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'answered');
  assert.match(body.message, /synthetic concept hint/);
  assert.match(body.message, /synthetic start hint/);
  assert.doesNotMatch(body.message, /synthetic decisive hint/);
  assert.equal(fixtures.providerRequests.length, 1);
  assert.equal(fixtures.fetchCalls, 0);
  const providerRequest = fixtures.providerRequests[0];
  assert.ok(providerRequest !== undefined);
  assert.equal(providerRequest.image?.mimeType, 'image/png');
  assert.equal(providerRequest.document, undefined);
  assert.equal(body.meta.provider.failureCategory, 'provider_error');
});

test('Given a registered guide that cannot be verified When posting Then the handler fails closed without provider work', async () => {
  const fixtures = createFixtures({
    lesson: guideLesson,
    guideStore: unavailableRegisteredGuideStore('hash_mismatch'),
  });
  const response = await fixtures.post({ lessonSlug: GUIDE_LESSON_SLUG, selectedMaterialKey: guideMaterialKey, message: '3번 힌트 줘' });

  assert.equal(response.status, 503);
  assert.equal(fixtures.providerRequests.length, 0);
});

test('Given malformed or forged web material selection When posting Then the handler rejects it before provider work', async () => {
  const fixtures = createFixtures();
  const response = await fixtures.post({ lessonSlug: 'ds2-trig', selectedMaterialKey: 'forged_material', message: '2번 힌트 줘' });

  assert.equal(response.status, 422);
  assert.equal(fixtures.providerRequests.length, 0);
});

test('Given a server-owned active material When a client sends a follow-up Then the handler uses server continuity rather than client history', async () => {
  const fixtures = createFixtures({
    lesson: guideLesson,
    guideStore: verifiedGuideStore([]),
    serverContinuity: ({ contextKey }) => ({
      activeTarget: { contextKey, materialKey: guideMaterialKey, problemNumber: 3 },
      recentTurns: [{ role: 'tutor', text: 'server-only turn' }],
    }),
  });
  const response = await fixtures.post({ lessonSlug: GUIDE_LESSON_SLUG, message: '다음 단계' });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.resolvedTarget.materialKey, guideMaterialKey);
  assert.equal(body.resolvedTarget.problemNumber, 3);
  assert.equal(fixtures.providerRequests.length, 0);
});

test('Given web conversation persistence When a duplicate free-form request is posted Then the provider is called once and token metadata is stored', async () => {
  // Given
  const fake = createFakeWebConversationSupabase();
  const repository = createSupabaseWebConversationRepository(fake.client);
  let providerCalls = 0;
  const fixtures = createFixtures({
    identity: persistedIdentity,
    tokenRow: persistedToken,
    lesson: persistedLesson,
    assignments: [persistedAssignment],
    guideStore: verifiedGuideStore([]),
    conversationRepository: repository,
    requestIdFactory: () => 'request-fixed',
    provider: {
      answer: async () => {
        throw new Error('answerWithRoute should be used');
      },
      answerWithRoute: async () => {
        providerCalls += 1;
        return {
          result: {
            answerText: '저장된 제공자 답변입니다.',
            confidence: 0.9,
            subjectSlug: 'ds2',
            conceptTags: [],
            errorType: null,
            needsTeacherReview: false,
            escalationReason: null,
          },
          metadata: {
            modelId: 'fast-model',
            modelAlias: 'fast',
            promptVersion: 'web-tutor-v1',
            latencyMs: 12,
            tokenCounts: { input: 7, output: 11, total: 18 },
            attemptCount: 1,
            failureCategory: null,
          },
        };
      },
    },
  });

  // When
  const first = await fixtures.post({ lessonSlug: GUIDE_LESSON_SLUG, selectedMaterialKey: guideMaterialKey, message: '3번에서 왜 이렇게 시작해?' });
  const duplicate = await fixtures.post({ lessonSlug: GUIDE_LESSON_SLUG, selectedMaterialKey: guideMaterialKey, message: '3번에서 왜 이렇게 시작해?' });

  // Then
  assert.equal(first.status, 200);
  assert.equal(duplicate.status, 200);
  assert.equal(providerCalls, 1);
  assert.equal(fake.providerEligibleClaimCount, 1);
  assert.equal(fake.operations.some((operation) => operation.table === 'ai_tutor_web_conversations' && operation.action === 'upsert'), true);
  assert.equal(fake.operations.some((operation) => JSON.stringify(operation.payload ?? {}).includes('"input_tokens":7')), true);
  assert.equal(fake.operations.some((operation) => JSON.stringify(operation.payload ?? {}).includes('"total_tokens":18')), true);
});
