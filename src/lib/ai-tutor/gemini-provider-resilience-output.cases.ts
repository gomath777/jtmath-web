import assert from 'node:assert/strict';
import test from 'node:test';
import type { AiTutorConfig } from './config';
import { createGeminiTutorProvider, type GeminiGenerateContentClient, type GeminiGenerateContentParameters } from './gemini-provider';
import {
  GeminiProviderTestError,
  createProvider,
  enabledConfig,
  request,
  validGeminiText,
} from './gemini-provider.test-support';

test('Gemini provider returns a timeout fallback at the configured cap and ignores late results', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  let releaseLateResult: (() => void) | undefined;
  const client: GeminiGenerateContentClient = {
    generateContent: async (params) => {
      calls.push(params);
      await new Promise<void>((resolve) => {
        releaseLateResult = resolve;
      });
      return { text: validGeminiText };
    },
  };
  const provider = createGeminiTutorProvider({
    config: enabledConfig,
    apiKey: 'synthetic-key',
    clientFactory: () => client,
    deadline: (milliseconds) => {
      assert.equal(milliseconds, enabledConfig.modelTimeoutMs);
      return Promise.resolve('timeout');
    },
    now: () => 10,
  });

  // When
  const answer = await provider.answerWithMetadata(request);
  releaseLateResult?.();

  // Then
  assert.equal(answer.result.errorType, 'timeout');
  assert.equal(answer.result.escalationReason, 'timeout');
  assert.equal(answer.result.needsTeacherReview, true);
  assert.equal(calls.length, 1);
});

test('Given a slow Gemini 3.1 response When the web timeout is 90 seconds Then the provider does not cut it off at 22 seconds', async () => {
  // Given
  const slowConfig: AiTutorConfig = {
    ...enabledConfig,
    textModel: { id: 'gemini-3.1-pro-preview', alias: 'text' },
    visionModel: { id: 'gemini-3.1-pro-preview', alias: 'vision' },
    modelTimeoutMs: 90_000,
  };
  const provider = createGeminiTutorProvider({
    config: slowConfig,
    apiKey: 'synthetic-key',
    clientFactory: () => ({
      generateContent: async () => ({ text: validGeminiText }),
    }),
    deadline: (milliseconds) => {
      assert.equal(milliseconds, 90_000);
      return new Promise<'timeout'>(() => {});
    },
  });

  // When
  const answer = await provider.answer(request);

  // Then
  assert.equal(answer.errorType, null);
});

test('Gemini provider maps invalid JSON to invalid-output review fallback', async () => {
  // Given
  const invalidJsonProvider = createProvider({ calls: [], response: { text: '{not-json' } });

  // When
  const invalidJson = await invalidJsonProvider.answer(request);

  // Then
  assert.equal(invalidJson.errorType, 'invalid_output');
  assert.equal(invalidJson.needsTeacherReview, true);
});

test('Gemini provider recovers answer text when nonessential metadata drifts', async () => {
  // Given
  const provider = createProvider({
    calls: [],
    response: {
      text: JSON.stringify({
        answerText: '힌트입니다.',
        confidence: 1.2,
        subjectSlug: '대수',
        conceptTags: ['삼각 함수', '삼각함수', 'tag_ok'],
        errorType: null,
        needsTeacherReview: false,
        escalationReason: null,
        email: 'synthetic@example.invalid',
      }),
    },
  });

  // When
  const answer = await provider.answer(request);

  // Then
  assert.equal(answer.answerText, '힌트입니다.');
  assert.equal(answer.confidence, 1);
  assert.equal(answer.subjectSlug, null);
  assert.deepEqual(answer.conceptTags, ['삼각함수', 'tag_ok']);
  assert.equal(answer.errorType, null);
  assert.equal(answer.needsTeacherReview, false);
  assert.equal(JSON.stringify(answer).includes('synthetic@example.invalid'), false);
});

test('Gemini provider recovers fenced JSON and plain-text tutor answers', async () => {
  // Given
  const fencedProvider = createProvider({
    calls: [],
    response: {
      text: `\`\`\`json
${validGeminiText}
\`\`\``,
    },
  });
  const plainTextProvider = createProvider({
    calls: [],
    response: { text: '힌트: 먼저 $\\theta$가 라디안인지 확인해 보세요.' },
  });

  // When
  const fenced = await fencedProvider.answer(request);
  const plainText = await plainTextProvider.answer(request);

  // Then
  assert.equal(fenced.errorType, null);
  assert.equal(fenced.answerText.includes('다른 인수'), true);
  assert.equal(plainText.errorType, null);
  assert.equal(plainText.answerText, '힌트: 먼저 $\\theta$가 라디안인지 확인해 보세요.');
  assert.equal(plainText.confidence, 0.72);
});

test('Gemini provider maps quota, safety, and network failures to redacted review-needed results', async () => {
  // Given
  const quotaProvider = createProvider({ calls: [], rejectWith: new GeminiProviderTestError('quota exhausted', 429) });
  const networkProvider = createProvider({ calls: [], rejectWith: new GeminiProviderTestError('socket hang up', 503) });
  const safetyProvider = createProvider({
    calls: [],
    response: { text: '', candidates: [{ finishReason: 'SAFETY' }] },
  });

  // When
  const quota = await quotaProvider.answer(request);
  const network = await networkProvider.answer(request);
  const safety = await safetyProvider.answer(request);

  // Then
  assert.equal(quota.errorType, 'provider_error');
  assert.equal(network.errorType, 'provider_error');
  assert.equal(safety.errorType, 'provider_error');
  assert.equal(quota.needsTeacherReview, true);
  assert.equal(network.needsTeacherReview, true);
  assert.equal(safety.needsTeacherReview, true);
  assert.equal(JSON.stringify([quota, network, safety]).includes('quota exhausted'), false);
});
