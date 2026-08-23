import assert from 'node:assert/strict';
import test from 'node:test';
import { createTutorEngine } from './engine';
import { baseRequest, confidentResult, fixedProvider } from './engine.test-support';

test('Given a grounded problem When provider uses a disallowed method Then engine returns a review result', async () => {
  // Given
  const engine = createTutorEngine({
    provider: fixedProvider({
      ...confidentResult,
      answerText: '[[method: 음함수 미분]] $y$를 미분해서 접선 기울기를 구해요.',
    }),
  });

  // When
  const result = await engine.answer({
    ...baseRequest,
    groundedProblem: {
      sourceLabel: '고1 접선 문제',
      problemText: '타원의 접선 기울기를 묻는다.',
      answerText: '4',
      solutionText: '고1 이차곡선 접선 성질로 푼다.',
      hints: { start: '접선 조건을 먼저 식으로 정리해 보세요.' },
      allowedMethods: ['이차곡선 접선 성질'],
      disallowedMethods: ['음함수 미분'],
    },
  });

  // Then
  assert.equal(result.escalationReason, 'disallowed_method');
  assert.equal(result.errorType, null);
  assert.equal(result.needsTeacherReview, true);
});

test('Given a grounded problem When provider uses an allowed method Then engine removes marker and preserves structured answer text', async () => {
  // Given
  const engine = createTutorEngine({
    provider: fixedProvider({
      ...confidentResult,
      answerText: '[[method: 이차곡선 접선 성질]] 핵심 힌트:\n\n$$\\dfrac{1}{2}$$',
    }),
  });

  // When
  const result = await engine.answer({
    ...baseRequest,
    groundedProblem: {
      sourceLabel: '고1 접선 문제',
      problemText: '이차곡선의 접선 조건을 묻는다.',
      answerText: '4',
      solutionText: '고1 이차곡선 접선 성질로 푼다.',
      hints: { start: '접선 조건을 먼저 식으로 정리해 보세요.' },
      allowedMethods: ['이차곡선 접선 성질'],
      disallowedMethods: ['음함수 미분'],
    },
  });

  // Then
  assert.equal(result.answerText.includes('[[method:'), false);
  assert.equal(result.answerText.split('\n').length, 3);
  assert.equal(result.answerText.includes('$$\\dfrac{1}{2}$$'), true);
  assert.equal(result.escalationReason, null);
});

test('Given a guide-grounded web answer without legacy groundedProblem When provider includes the internal method marker Then policy hides the marker from students', async () => {
  // Given
  const engine = createTutorEngine({
    provider: fixedProvider({
      ...confidentResult,
      answerText: '[[method: 삼각함수의 그래프와 삼각부등식]] 핵심 힌트:\n\n$\\sin x$와 수평선을 비교해요.',
    }),
  });

  // When
  const result = await engine.answer(baseRequest);

  // Then
  assert.equal(result.answerText, '핵심 힌트:\n\n$\\sin x$와 수평선을 비교해요.');
  assert.equal(result.answerText.includes('[[method:'), false);
});

test('Given Gemini uses Markdown emphasis in a student answer When policy normalizes it Then raw emphasis markers are not shown', async () => {
  // Given
  const engine = createTutorEngine({
    provider: fixedProvider({
      ...confidentResult,
      answerText: '1. **조건 분석**: $f(x)>0$을 확인해요.\n\n**정답:** $10$',
    }),
  });

  // When
  const result = await engine.answer(baseRequest);

  // Then
  assert.equal(result.answerText, '1. 조건 분석: $f(x)>0$을 확인해요.\n\n정답: $10$');
  assert.equal(result.answerText.includes('**'), false);
});
