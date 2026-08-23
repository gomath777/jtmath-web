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

test('Given a routed quota failure followed by a fallback error When answering Then total provider attempts stay bounded at two', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  let attempts = 0;
  const provider = createGeminiTutorProvider({
    config: enabledConfig,
    apiKey: 'synthetic-key',
    clientFactory: () => ({
      generateContent: async (params) => {
        calls.push(params);
        attempts += 1;
        throw new GeminiProviderTestError('synthetic provider error', attempts === 1 ? 429 : 503);
      },
    }),
    deadline: () => new Promise<'timeout'>(() => {}),
    retryDelay: async () => undefined,
  });

  // When
  const answer = await provider.answerWithRoute({
    request,
    primaryModel: { id: 'gemini-3.1-flash-lite', alias: 'fast' },
    fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
  });

  // Then
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.model, 'gemini-3.1-flash-lite');
  assert.equal(calls[1]?.model, 'gemini-3.1-flash');
  assert.equal(answer.metadata.modelAlias, 'fallback');
  assert.equal(answer.metadata.attemptCount, 2);
  assert.equal(answer.metadata.failureCategory, 'provider_error');
});

test('Given a routed transient provider error When answering Then the configured primary model retries once without fallback', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  let attempts = 0;
  const provider = createGeminiTutorProvider({
    config: enabledConfig,
    apiKey: 'synthetic-key',
    clientFactory: () => ({
      generateContent: async (params) => {
        calls.push(params);
        attempts += 1;
        if (attempts === 1) throw new GeminiProviderTestError('synthetic transient error', 503);
        return { text: validGeminiText, usageMetadata: usage(13, 17) };
      },
    }),
    deadline: () => new Promise<'timeout'>(() => {}),
    retryDelay: async () => undefined,
  });

  // When
  const answer = await provider.answerWithRoute({
    request,
    primaryModel: { id: 'gemini-3.1-pro', alias: 'reasoning' },
    fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
  });

  // Then
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.model, 'gemini-3.1-pro');
  assert.equal(calls[1]?.model, 'gemini-3.1-pro');
  assert.equal(answer.metadata.modelAlias, 'reasoning');
  assert.equal(answer.metadata.attemptCount, 2);
  assert.deepEqual(answer.metadata.tokenCounts, { input: 13, output: 17, total: 30 });
});

test('Given a primary retry consumes the recovery budget and then returns 429 When answering Then no fallback third call starts', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  let attempts = 0;
  const provider = createGeminiTutorProvider({
    config: enabledConfig,
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
  const answer = await provider.answerWithRoute({
    request,
    primaryModel: { id: 'gemini-3.1-pro', alias: 'reasoning' },
    fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
  });

  // Then
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.model), ['gemini-3.1-pro', 'gemini-3.1-pro']);
  assert.equal(answer.metadata.modelAlias, 'reasoning');
  assert.equal(answer.metadata.attemptCount, 2);
  assert.equal(answer.metadata.failureCategory, 'provider_error');
});
