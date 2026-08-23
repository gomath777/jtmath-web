import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '@google/genai';
import { callGeminiWithRetry, callGeminiWithRetryWithMetadata } from './gemini-call';
import { parseAiTutorConfig } from './config';
import type { TutorProviderRequest } from './contracts';
import { createGeminiTutorProvider } from './gemini-provider';
import type { GeminiGenerateContentClient, GeminiGenerateContentParameters } from './gemini-provider';

const baseRequest: TutorProviderRequest = {
  input: { kind: 'text', messageText: '레벨4-1 1번 힌트 줘' },
  context: {
    gradeLabel: '고1',
    releasedCurriculum: [{ subjectSlug: 'ds2', conceptTags: ['trigonometry'], title: '삼각함수', summary: '삼각함수 기출 학습지' }],
    recentTurns: [],
    repeatedConceptSignal: false,
  },
};

const paramsFixture = buildGeminiParametersFixture();

async function buildGeminiParametersFixture(): Promise<GeminiGenerateContentParameters> {
  let captured: GeminiGenerateContentParameters | undefined;
  const config = parseAiTutorConfig(
    {
      AI_TUTOR_ENABLED: 'true',
      AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
      GEMINI_API_KEY: 'present',
      AI_TUTOR_PAIRING_HMAC_SECRET: 'present',
      AI_TUTOR_GEMINI_TEXT_MODEL: 'gemini-2.5-flash',
      AI_TUTOR_GEMINI_VISION_MODEL: 'gemini-2.5-flash',
    },
    { runtime: 'test' },
  );
  assert.equal(config.ok, true);
  if (!config.ok) assert.fail('expected enabled synthetic Gemini test config');
  const provider = createGeminiTutorProvider({
    config: config.config,
    apiKey: 'synthetic-api-key',
    clientFactory: () => ({
      generateContent: async (generatedParams) => {
        captured = generatedParams;
        return {
          text: JSON.stringify({
            answerText: '힌트: 조건을 먼저 정리해 보세요.',
            confidence: 0.9,
            subjectSlug: 'ds2',
            conceptTags: ['trigonometry'],
            errorType: null,
            needsTeacherReview: false,
            escalationReason: null,
          }),
        };
      },
    }),
  });
  await provider.answer(baseRequest);
  if (captured === undefined) assert.fail('expected Gemini provider to call generateContent');
  return captured;
}

test('Gemini call retries one transient service error and returns the successful response', async () => {
  let calls = 0;
  const client: GeminiGenerateContentClient = {
    generateContent: async () => {
      calls += 1;
      if (calls === 1) throw new ApiError({ status: 503, message: 'synthetic unavailable' });
      return { text: '{"answerText":"ok"}' };
    },
  };

  const response = await callGeminiWithRetry({ client, params: await paramsFixture, deadlineMs: 90_000, retryDelay: async () => undefined });

  assert.equal(calls, 2);
  assert.notEqual(response, 'timeout');
  if (response !== 'timeout') assert.equal(response.text, '{"answerText":"ok"}');
});

test('Gemini call retries a fetch-style network error once', async () => {
  let calls = 0;
  const client: GeminiGenerateContentClient = {
    generateContent: async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('synthetic network failure');
      return { text: '{"answerText":"ok"}' };
    },
  };

  await callGeminiWithRetry({ client, params: await paramsFixture, deadlineMs: 90_000, retryDelay: async () => undefined });

  assert.equal(calls, 2);
});

test('Gemini call does not retry permanent client errors', async () => {
  let calls = 0;
  const client: GeminiGenerateContentClient = {
    generateContent: async () => {
      calls += 1;
      throw new ApiError({ status: 400, message: 'synthetic invalid request' });
    },
  };

  const response = await callGeminiWithRetry({ client, params: await paramsFixture, deadlineMs: 90_000, retryDelay: async () => undefined });

  assert.equal(calls, 1);
  assert.notEqual(response, 'timeout');
  if (response !== 'timeout') assert.equal(JSON.parse(response.text ?? '{}').errorType, 'provider_error');
});

test('Gemini call does not start a late retry after the total deadline expires', async () => {
  let calls = 0;
  let rejectFirst: ((error: Error) => void) | undefined;
  const client: GeminiGenerateContentClient = {
    generateContent: async () => {
      calls += 1;
      return new Promise((_, reject) => {
        rejectFirst = reject;
      });
    },
  };

  const response = await callGeminiWithRetry({
    client,
    params: await paramsFixture,
    deadlineMs: 90_000,
    deadline: async () => 'timeout',
    retryDelay: async () => undefined,
  });
  rejectFirst?.(new TypeError('synthetic late network failure'));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(response, 'timeout');
  assert.equal(calls, 1);
});

test('Given a total deadline expires before retry When call metadata is returned Then it records the single started attempt', async () => {
  // Given
  let calls = 0;
  const client: GeminiGenerateContentClient = {
    generateContent: async () => {
      calls += 1;
      return new Promise(() => {});
    },
  };

  // When
  const result = await callGeminiWithRetryWithMetadata({
    client,
    params: await paramsFixture,
    deadlineMs: 90_000,
    deadline: async () => 'timeout',
    retryDelay: async () => undefined,
  });

  // Then
  assert.equal(result.response, 'timeout');
  assert.equal(result.attemptCount, 1);
  assert.equal(calls, 1);
});

test('Given an in-flight Gemini SDK request When the overall deadline expires Then the request signal aborts and the call returns timeout', async () => {
  let signal: AbortSignal | undefined;
  const client: GeminiGenerateContentClient = {
    generateContent: async (params) => new Promise((_, reject) => {
      signal = params.config.abortSignal;
      signal?.addEventListener('abort', () => reject(new Error('synthetic aborted request')), { once: true });
    }),
  };

  const response = await callGeminiWithRetry({
    client,
    params: await paramsFixture,
    deadlineMs: 90_000,
    deadline: async () => 'timeout',
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(response, 'timeout');
  assert.equal(signal?.aborted, true);
});
