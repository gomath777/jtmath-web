import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadWebTutorServerContinuity,
  type WebTutorContinuityRepository,
} from './web-conversation-continuity';

const scope = {
  profileId: '00000000-0000-4000-8000-000000000101',
  assignmentId: '00000000-0000-4000-8000-000000000201',
  conversation: {
    id: '00000000-0000-4000-8000-000000000301',
    profileId: '00000000-0000-4000-8000-000000000101',
    assignmentId: '00000000-0000-4000-8000-000000000201',
    contextKey: 'ctx_gs2_line',
    activeMaterialKey: 'm-lv42',
    activeProblemKey: 'problem:120',
    activeStage: 'start',
  },
} as const;

test('loadWebTutorServerContinuity uses scoped repository history and the stored active target', async () => {
  const calls: unknown[] = [];
  const repository: WebTutorContinuityRepository = {
    readRecentTurns: async (input) => {
      calls.push(input);
      return {
        ok: true,
        value: [
          { role: 'student', text: '2번 힌트', targetMaterialKey: 'm-lv42' },
          { role: 'tutor', text: '첫 단계를 보자.', targetMaterialKey: 'm-lv42' },
        ],
      };
    },
  };

  const result = await loadWebTutorServerContinuity({ repository, ...scope });

  assert.deepEqual(result, {
    kind: 'ok',
    continuity: {
      activeTarget: { contextKey: 'ctx_gs2_line', materialKey: 'm-lv42', problemNumber: 120 },
      recentTurns: [
        { role: 'student', text: '2번 힌트' },
        { role: 'tutor', text: '첫 단계를 보자.' },
      ],
    },
  });
  assert.deepEqual(calls, [{
    profileId: scope.profileId,
    assignmentId: scope.assignmentId,
    conversationId: scope.conversation.id,
    limit: 6,
  }]);
});

test('loadWebTutorServerContinuity fails closed for an invalid stored target and repository failure', async () => {
  const unavailable: WebTutorContinuityRepository = {
    readRecentTurns: async () => ({ ok: false, error: { code: 'unavailable', operation: 'read_recent_web_turns' } }),
  };
  const invalidTarget: WebTutorContinuityRepository = {
    readRecentTurns: async () => ({ ok: true, value: [] }),
  };

  assert.deepEqual(await loadWebTutorServerContinuity({ repository: unavailable, ...scope }), { kind: 'unavailable' });
  assert.deepEqual(await loadWebTutorServerContinuity({
    repository: invalidTarget,
    ...scope,
    conversation: { ...scope.conversation, activeProblemKey: 'problem:1000' },
  }), { kind: 'invalid_active_target' });
});

test('Given a repository returns more persisted turns than requested When continuity is loaded Then it preserves the newest six in chronological order', async () => {
  const repository: WebTutorContinuityRepository = {
    readRecentTurns: async () => ({
      ok: true,
      value: Array.from({ length: 8 }, (_, index) => ({
        role: index % 2 === 0 ? 'student' as const : 'tutor' as const,
        text: `turn-${index + 1}`,
        targetMaterialKey: 'm-lv42',
      })),
    }),
  };

  const result = await loadWebTutorServerContinuity({ repository, ...scope });

  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') assert.fail('Expected persisted continuity to remain usable');
  assert.deepEqual(result.continuity.recentTurns.map((turn) => turn.text), [
    'turn-3',
    'turn-4',
    'turn-5',
    'turn-6',
    'turn-7',
    'turn-8',
  ]);
});
