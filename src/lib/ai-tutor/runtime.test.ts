import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoogleChatAiTutorRuntime } from './runtime';

test('createGoogleChatAiTutorRuntime preserves connection-test handler when disabled', async () => {
  const runtime = createGoogleChatAiTutorRuntime({ env: { AI_TUTOR_ENABLED: 'false' } });
  assert.equal(runtime.ok, true);
  if (!runtime.ok) return;

  const response = await runtime.handler({
    kind: 'message',
    userName: 'users/test',
    messageName: 'spaces/dm/messages/1',
    space: { name: 'spaces/dm', type: 'DM', channel: 'direct_message' },
    text: '테스트',
    annotations: [],
    attachments: [],
    hasAttachment: false,
  });

  assert.match(JSON.stringify(response), /연결 테스트 성공/);
});

test('createGoogleChatAiTutorRuntime fails closed when enabled pairing secret is absent', () => {
  const runtime = createGoogleChatAiTutorRuntime({
    env: {
      AI_TUTOR_ENABLED: 'true',
      AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
      GEMINI_API_KEY: 'present',
      AI_TUTOR_GEMINI_TEXT_MODEL: 'gemini-2.5-flash',
      AI_TUTOR_GEMINI_VISION_MODEL: 'gemini-2.5-flash',
    },
  });

  assert.deepEqual(runtime, { ok: false, reason: 'invalid_config' });
});

test('createGoogleChatAiTutorRuntime fails closed when enabled runtime dependencies are absent', () => {
  const runtime = createGoogleChatAiTutorRuntime({
    env: enabledEnv(),
  });

  assert.deepEqual(runtime, { ok: false, reason: 'enabled_runtime_unavailable' });
});

test('createGoogleChatAiTutorRuntime accepts an injected enabled handler for preview wiring tests', async () => {
  const runtime = createGoogleChatAiTutorRuntime({
    env: enabledEnv(),
    enabledHandler: () => ({}),
  });

  assert.equal(runtime.ok, true);
  if (runtime.ok) assert.deepEqual(await runtime.handler({ kind: 'removed_from_space', space: { name: 'spaces/x', channel: 'named_space' } }), {});
});

test('createGoogleChatAiTutorRuntime wires injected dependency factory into orchestrator', async () => {
  const runtime = createGoogleChatAiTutorRuntime({
    env: enabledEnv(),
    dependenciesFactory: () => ({
      ok: true,
      value: {
        hmacSecret: 'secret',
        repository: {
          lookupIdentity: async () => ({ ok: true, value: null }),
          createPendingIdentity: async () => ({ ok: true, value: { id: 'identity-1', chatUserName: 'users/test', profileId: null, status: 'pending' } }),
          upsertConversation: async () => ({ ok: false, error: { code: 'unavailable', operation: 'unused' } }),
          claimInboundTurn: async () => ({ ok: false, error: { code: 'unavailable', operation: 'unused' } }),
          getCompletedAnswer: async () => ({ ok: true, value: null }),
          markTurnCompleted: async () => ({ ok: false, error: { code: 'unavailable', operation: 'unused' } }),
          markTurnFailed: async () => ({ ok: false, error: { code: 'unavailable', operation: 'unused' } }),
          readRecentTurns: async () => ({ ok: true, value: [] }),
          countRecentConceptRepeats: async () => ({ ok: true, value: 0 }),
          recordAttachment: async () => ({ ok: false, error: { code: 'unavailable', operation: 'unused' } }),
          listTeacherReviewTurns: async () => ({ ok: true, value: [] }),
          listRetentionCandidates: async () => ({ ok: true, value: { rawContentTurnIds: [], imageAttachmentIds: [], metadataTurnIds: [] } }),
        },
        engine: {
          answer: async () => ({ answerText: 'unused', confidence: 0, subjectSlug: null, conceptTags: [], errorType: null, needsTeacherReview: false, escalationReason: null }),
          answerWithMetadata: async () => ({
            result: { answerText: 'unused', confidence: 0, subjectSlug: null, conceptTags: [], errorType: null, needsTeacherReview: false, escalationReason: null },
            metadata: null,
          }),
        },
        contextProvider: { load: async () => ({ gradeLabel: '고2', releasedCurriculum: [], recentTurns: [], repeatedConceptSignal: false }) },
        imageProcessor: { process: async () => ({ ok: true }) },
      },
    }),
  });

  assert.equal(runtime.ok, true);
  if (!runtime.ok) return;
  const response = await runtime.handler({
    kind: 'message',
    userName: 'users/test',
    messageName: 'spaces/dm/messages/1',
    space: { name: 'spaces/dm', type: 'DM', channel: 'direct_message' },
    text: '테스트',
    annotations: [],
    attachments: [],
    hasAttachment: false,
  });
  assert.match(JSON.stringify(response), /연결 코드/);
});

function enabledEnv() {
  return {
    AI_TUTOR_ENABLED: 'true',
    AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
    GEMINI_API_KEY: 'present',
    AI_TUTOR_PAIRING_HMAC_SECRET: 'present',
    AI_TUTOR_GEMINI_TEXT_MODEL: 'gemini-2.5-flash',
    AI_TUTOR_GEMINI_VISION_MODEL: 'gemini-2.5-flash',
  };
}
