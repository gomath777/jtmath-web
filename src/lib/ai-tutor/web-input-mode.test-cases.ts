import assert from 'node:assert/strict';
import test from 'node:test';
import { WEB_INPUT_TEST_CONTEXT_KEY, parseWebTutorTestInput } from './web-input.test-support';

test('parseWebTutorInput treats 정답 말고 as a hint even near solution language', () => {
  const result = parseWebTutorTestInput({ message: '레벨4-2 2번 정답 말고 힌트만 줘' });

  assert.equal(result.kind, 'ok');
  if (result.kind === 'ok') assert.equal(result.mode, 'hint');
});

test('parseWebTutorInput applies mode precedence to material-key targets and server follow-ups', () => {
  const serverContinuity = {
    activeTarget: { contextKey: WEB_INPUT_TEST_CONTEXT_KEY, materialKey: 'm-lv42', problemNumber: 8 },
    recentTurns: [],
  };
  const decisive = parseWebTutorTestInput({ message: '레벨4-2 8번 결정적 힌트 줘' });
  const solution = parseWebTutorTestInput({ message: '레벨4-2 8번 정답 풀이 알려줘' });
  const followUpSolution = parseWebTutorTestInput({ message: '정답 알려줘', serverContinuity });

  assert.equal(decisive.kind === 'ok' ? decisive.mode : decisive.kind, 'decisive_hint');
  assert.equal(solution.kind === 'ok' ? solution.mode : solution.kind, 'solution');
  assert.equal(followUpSolution.kind === 'ok' ? followUpSolution.mode : followUpSolution.kind, 'solution');
  if (followUpSolution.kind === 'ok') assert.deepEqual(followUpSolution.target, serverContinuity.activeTarget);
});
