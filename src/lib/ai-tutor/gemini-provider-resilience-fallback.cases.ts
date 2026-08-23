import assert from 'node:assert/strict';
import test from 'node:test';
import { createGeminiTutorProvider, type GeminiGenerateContentParameters } from './gemini-provider';
import {
  GeminiProviderTestError,
  enabledConfig,
  request,
  usage,
  validGeminiText,
} from './gemini-provider.test-support';

test('Given primary Gemini quota failure When fallback model is configured Then provider returns fallback metadata and tokens', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  let attempts = 0;
  const provider = createGeminiTutorProvider({
    config: {
      ...enabledConfig,
      textModel: { id: 'gemini-3.1-flash-lite', alias: 'text' },
      fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
    },
    apiKey: 'synthetic-key',
    clientFactory: () => ({
      generateContent: async (params) => {
        calls.push(params);
        attempts += 1;
        if (attempts === 1) throw new GeminiProviderTestError('quota exhausted', 429);
        return { text: validGeminiText, usageMetadata: usage(13, 17) };
      },
    }),
    deadline: () => new Promise<'timeout'>(() => {}),
    retryDelay: async () => undefined,
    now: () => 10,
  });

  // When
  const answer = await provider.answerWithMetadata(request);

  // Then
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.model, 'gemini-3.1-flash-lite');
  assert.equal(calls[1]?.model, 'gemini-3.1-flash');
  assert.equal(answer.result.errorType, null);
  assert.equal(answer.metadata.modelId, 'gemini-3.1-flash');
  assert.equal(answer.metadata.modelAlias, 'fallback');
  assert.equal(answer.metadata.attemptCount, 2);
  assert.deepEqual(answer.metadata.tokenCounts, { input: 13, output: 17, total: 30 });
});

test('Given a generic provider retry consumes recovery before a 429 When answering with metadata Then no third fallback call starts', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  let attempts = 0;
  const provider = createGeminiTutorProvider({
    config: {
      ...enabledConfig,
      textModel: { id: 'gemini-3.1-pro', alias: 'text' },
      fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
    },
    apiKey: 'synthetic-key',
    clientFactory: () => ({
      generateContent: async (params) => {
        calls.push(params);
        attempts += 1;
        throw new GeminiProviderTestError('synthetic bounded recovery error', attempts === 1 ? 503 : 429);
      },
    }),
    deadline: () => new Promise<'timeout'>(() => {}),
    retryDelay: async () => undefined,
  });

  // When
  const answer = await provider.answerWithMetadata(request);

  // Then
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.model), ['gemini-3.1-pro', 'gemini-3.1-pro']);
  assert.equal(answer.result.errorType, 'provider_error');
  assert.equal(answer.metadata.modelAlias, 'text');
  assert.equal(answer.metadata.attemptCount, 2);
});
