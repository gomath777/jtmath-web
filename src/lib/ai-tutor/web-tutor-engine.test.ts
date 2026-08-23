import assert from 'node:assert/strict';
import test from 'node:test';
import type { TutorGuideContext } from './tutor-guide-selector';
import { runWebTutorEngine, type RunWebTutorEngineInput } from './web-tutor-engine';
import type { WebTutorRoutedProvider } from './web-provider-routing';

const models = {
  fast: { id: 'gemini-3.1-flash-lite', alias: 'fast' },
  reasoning: { id: 'gemini-3.1-pro', alias: 'reasoning' },
  fallback: { id: 'gemini-3.1-flash', alias: 'fallback' },
} as const;

const guideContext: TutorGuideContext = {
  curriculum: { grade: 'synthetic-grade', subject: 'synthetic-subject', unit: 'synthetic-unit', allowedConcepts: ['concept'], forbiddenMethods: ['forbidden'] },
  officialApproach: { summary: 'synthetic official approach' },
  hints: { concept: 'concept hint', start: 'start hint', decisive: 'decisive hint' },
  alternatives: [],
};

test('Given a verified standard stage When running the web tutor Then it returns the guide without a provider call', async () => {
  let calls = 0;
  const result = await runWebTutorEngine(makeInput({
    message: '3번 결정적 힌트 줘',
    mode: 'decisive_hint',
    provider: {
      answer: async () => {
        calls += 1;
        return answeredResult();
      },
    },
  }));

  assert.equal(calls, 0);
  assert.equal(result.metadata.kind, 'no_model');
  assert.equal(result.metadata.attemptCount, 0);
  assert.match(result.result.answerText, /decisive hint/);
});

test('Given a free-form clarification When running the web tutor Then it uses the configured fast model and retains metadata', async () => {
  let selectedPrimaryModel = '';
  const result = await runWebTutorEngine(makeInput({
    message: '3번에서 이 조건을 왜 정리하는지 설명해 줘',
    mode: 'hint',
    provider: routedProvider((input) => {
      selectedPrimaryModel = input.primaryModel.id;
      return { result: answeredResult(), metadata: routeMetadata('fast') };
    }),
  }));

  assert.equal(selectedPrimaryModel, models.fast.id);
  assert.equal(result.metadata.kind, 'provider');
  assert.equal(result.metadata.attemptCount, 1);
  assert.equal(result.metadata.tokenCounts.total, 23);
  assert.equal(result.metadata.failureCategory, null);
});

test('Given an alternate proof request When running the web tutor Then it uses the configured reasoning model', async () => {
  let selectedPrimaryModel = '';
  await runWebTutorEngine(makeInput({
    message: '3번 다른 증명으로 설명해 줘',
    mode: 'hint',
    provider: routedProvider((input) => {
      selectedPrimaryModel = input.primaryModel.id;
      return { result: answeredResult(), metadata: routeMetadata('reasoning') };
    }),
  }));

  assert.equal(selectedPrimaryModel, models.reasoning.id);
});

test('Given a verified guide and a routed provider failure When running the web tutor Then it returns the nearest safe guide stage with failure metadata', async () => {
  const result = await runWebTutorEngine(makeInput({
    message: '3번에서 이 식이 왜 필요한지 설명해 줘',
    mode: 'start',
    provider: routedProvider(() => ({
      result: { ...answeredResult(), errorType: 'provider_error', needsTeacherReview: true, escalationReason: 'provider_error' },
      metadata: { ...routeMetadata('fast'), failureCategory: 'provider_error' },
    })),
  }));

  assert.equal(result.metadata.kind, 'provider');
  assert.equal(result.metadata.failureCategory, 'provider_error');
  assert.match(result.result.answerText, /concept hint/);
  assert.match(result.result.answerText, /start hint/);
  assert.doesNotMatch(result.result.answerText, /decisive hint/);
});

function makeInput(overrides: Partial<RunWebTutorEngineInput>): RunWebTutorEngineInput {
  return {
    models,
    lessonSlug: 'synthetic-lesson',
    message: '3번 힌트 줘',
    mode: 'hint',
    target: { contextKey: 'synthetic_context', materialKey: 'synthetic_material', problemNumber: 3 },
    result: {
      ok: true,
      context: {
        contextKey: 'synthetic_context',
        lessonSlug: 'synthetic-lesson',
        subjectSlug: 'ds2',
        unit: 'synthetic-unit',
        lessonTitle: 'synthetic lesson',
        variant: 'synthetic',
        materials: [],
      },
    // The server-material symbol is intentionally private to the lesson-context module.
    } as unknown as Extract<RunWebTutorEngineInput['result'], { readonly ok: true }>,
    recentTurns: [],
    attachment: { kind: 'image', bytes: new Uint8Array([137, 80, 78, 71]), sha256Hex: 'a'.repeat(64), coarseSizeBytes: 1024 },
    guideContext,
    ...overrides,
  };
}

function routedProvider(
  answer: (input: Parameters<NonNullable<WebTutorRoutedProvider['answerWithRoute']>>[0]) =>
    | Awaited<ReturnType<NonNullable<WebTutorRoutedProvider['answerWithRoute']>>>
    | Promise<Awaited<ReturnType<NonNullable<WebTutorRoutedProvider['answerWithRoute']>>>>,
): WebTutorRoutedProvider {
  return { answer: async () => answeredResult(), answerWithRoute: async (input) => answer(input) };
}

function routeMetadata(alias: 'fast' | 'reasoning') {
  return {
    modelId: models[alias].id,
    modelAlias: alias,
    promptVersion: 'synthetic-prompt',
    latencyMs: 17,
    tokenCounts: { input: 13, output: 10, total: 23 },
    attemptCount: 1 as const,
    failureCategory: null,
  };
}

function answeredResult() {
  return {
    answerText: 'synthetic provider answer',
    confidence: 0.9,
    subjectSlug: 'ds2',
    conceptTags: ['synthetic'],
    errorType: null,
    needsTeacherReview: false,
    escalationReason: null,
  } as const;
}
