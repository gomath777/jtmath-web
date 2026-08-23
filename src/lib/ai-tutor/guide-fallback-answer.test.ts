import assert from 'node:assert/strict';
import test from 'node:test';
import { formatGuideFallbackAnswer } from './guide-fallback-answer';
import { TutorGuideContextSchema, type TutorGuideContext } from './tutor-guide-selector';

const baseContext = {
  curriculum: {
    grade: '고2',
    subject: '대수',
    unit: '삼각함수',
    allowedConcepts: ['삼각함수의 그래프', '삼각함수의 기본 성질'],
    forbiddenMethods: ['미분법', '음함수 미분법'],
  },
  officialApproach: { summary: '공식 해설은 삼각함수의 기본 성질을 먼저 정리한다.' },
  alternatives: [],
};

test('Given hint guide projection When provider fails Then local answer uses only concept hint', () => {
  // Given
  const guideContext = guideContextFixture({
    ...baseContext,
    hints: { concept: '먼저 $\\sin^2 x+\\cos^2 x=1$ 을 떠올려 봐.' },
  });

  // When
  const answer = formatGuideFallbackAnswer({ guideContext, problemNumber: 3 });

  // Then
  assert.match(answer, /3번/);
  assert.match(answer, /\$\\sin\^2 x\+\\cos\^2 x=1\$/);
  assert.doesNotMatch(answer, /풀이 시작/);
  assert.doesNotMatch(answer, /결정적 힌트/);
  assert.doesNotMatch(answer, /정답/);
});

test('Given start guide projection When provider fails Then local answer may include start but not decisive or answer', () => {
  // Given
  const guideContext = guideContextFixture({
    ...baseContext,
    hints: {
      concept: '기본 관계식을 정리해.',
      start: '조건을 식으로 바꾸고 같은 각의 삼각함수끼리 묶어 봐.',
    },
  });

  // When
  const answer = formatGuideFallbackAnswer({ guideContext, problemNumber: 3 });

  // Then
  assert.match(answer, /풀이 시작/);
  assert.match(answer, /조건을 식으로 바꾸고/);
  assert.doesNotMatch(answer, /결정적 힌트/);
  assert.doesNotMatch(answer, /synthetic answer/);
});

test('Given decisive guide projection When provider fails Then local answer may include decisive hint but not solution answer', () => {
  // Given
  const guideContext = guideContextFixture({
    ...baseContext,
    hints: {
      concept: '기본 관계식을 정리해.',
      start: '조건을 식으로 바꿔.',
      decisive: '마지막에는 $\\sin x$ 하나만 남기는 식으로 정리해.',
    },
  });

  // When
  const answer = formatGuideFallbackAnswer({ guideContext, problemNumber: 3 });

  // Then
  assert.match(answer, /결정적 힌트/);
  assert.match(answer, /\$\\sin x\$/);
  assert.doesNotMatch(answer, /정답:/);
});

test('Given solution guide projection When provider fails Then local answer may include solution steps and answer', () => {
  // Given
  const guideContext = guideContextFixture({
    ...baseContext,
    hints: {
      concept: '기본 관계식을 정리해.',
      start: '조건을 식으로 바꿔.',
      decisive: '하나의 변수로 정리해.',
    },
    solution: {
      answer: '$2\\sqrt{3}$',
      steps: ['조건식을 정리한다.', '보기 중 일치하는 값을 고른다.'],
    },
  });

  // When
  const answer = formatGuideFallbackAnswer({ guideContext, problemNumber: 3 });

  // Then
  assert.match(answer, /풀이/);
  assert.match(answer, /정답: \$2\\sqrt\{3\}\$/);
  assert.match(answer, /조건식을 정리한다/);
});

function guideContextFixture(value: unknown): TutorGuideContext {
  return TutorGuideContextSchema.parse(value);
}
