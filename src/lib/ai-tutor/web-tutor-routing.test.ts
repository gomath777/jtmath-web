import assert from 'node:assert/strict';
import test from 'node:test';
import { selectWebTutorRoute } from './web-tutor-routing';
import type { TutorGuideContext } from './tutor-guide-selector';

const verifiedGuideContext: TutorGuideContext = {
  curriculum: {
    grade: 'synthetic-grade',
    subject: 'synthetic-subject',
    unit: 'synthetic-unit',
    allowedConcepts: ['synthetic-concept'],
    forbiddenMethods: ['synthetic-forbidden-method'],
  },
  officialApproach: { summary: 'synthetic official approach' },
  hints: {
    concept: 'synthetic concept hint',
    start: 'synthetic start hint',
    decisive: 'synthetic decisive hint',
  },
  alternatives: [],
};

test('Given verified standard stages When selecting a web tutor route Then Gemini reasoning is selected', () => {
  for (const input of [
    { message: '레벨4-1 3번 힌트 줘', mode: 'hint' as const },
    { message: '레벨4-1 3번 풀이 시작 알려줘', mode: 'start' as const },
    { message: '레벨4-1 3번 결정적 힌트 줘', mode: 'decisive_hint' as const },
    { message: '레벨4-1 3번 정답 알려줘', mode: 'solution' as const },
  ]) {
    assert.equal(selectWebTutorRoute({ ...input, guideContext: verifiedGuideContext }).kind, 'reasoning');
  }
});

test('Given a verified free-form clarification When selecting a web tutor route Then the fast model is selected', () => {
  const route = selectWebTutorRoute({
    message: '레벨4-1 3번에서 이 조건을 왜 먼저 정리하는지 설명해 줘',
    mode: 'hint',
    guideContext: verifiedGuideContext,
  });

  assert.equal(route.kind, 'fast');
});

test('Given an explicit alternate proof or difficult geometry When selecting a web tutor route Then the reasoning model is selected', () => {
  const alternate = selectWebTutorRoute({
    message: '레벨4-1 3번 다른 증명으로 설명해 줘',
    mode: 'hint',
    guideContext: verifiedGuideContext,
  });
  const geometry = selectWebTutorRoute({
    message: '레벨4-1 3번 보조선을 어떻게 그어 증명하는지 설명해 줘',
    mode: 'hint',
    guideContext: {
      ...verifiedGuideContext,
      curriculum: { ...verifiedGuideContext.curriculum, subject: '기하' },
    },
  });

  assert.equal(alternate.kind, 'reasoning');
  assert.equal(geometry.kind, 'reasoning');
});
