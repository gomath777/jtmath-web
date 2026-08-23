import assert from 'node:assert/strict';
import test from 'node:test';
import { WEB_INPUT_TEST_CONTEXT_KEY, parseWebTutorTestInput } from './web-input.test-support';

const serverContinuity = {
  activeTarget: { contextKey: WEB_INPUT_TEST_CONTEXT_KEY, materialKey: 'm-lv42', problemNumber: 120 },
  recentTurns: [
    { role: 'student' as const, text: '120번 힌트' },
    { role: 'tutor' as const, text: '첫 단계' },
  ],
};

test('parseWebTutorInput retains the server target across Korean follow-ups', () => {
  for (const [message, mode] of [
    ['다음 단계', 'start'],
    ['왜?', 'start'],
    ['다른 풀이', 'solution'],
  ] as const) {
    assert.deepEqual(parseWebTutorTestInput({ message, serverContinuity }), {
      kind: 'ok',
      mode,
      target: serverContinuity.activeTarget,
    });
  }
});

test('parseWebTutorInput resets a follow-up when the material changes without a new problem', () => {
  assert.deepEqual(parseWebTutorTestInput({
    message: '심화유형 1단계 다음 단계',
    serverContinuity,
  }), { kind: 'malformed_input' });
});

test('parseWebTutorInput fails closed for a targetless follow-up', () => {
  assert.deepEqual(parseWebTutorTestInput({ message: '다음 단계 알려줘' }), { kind: 'malformed_input' });
});
