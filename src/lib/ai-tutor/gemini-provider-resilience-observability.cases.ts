import assert from 'node:assert/strict';
import test from 'node:test';
import type { AiTutorLogInput } from './observability';
import { createGeminiTutorProvider, type GeminiGenerateContentParameters } from './gemini-provider';
import {
  createProvider,
  enabledConfig,
  request,
  usage,
  validGeminiText,
} from './gemini-provider.test-support';

test('Given one transient failure When Gemini retries successfully Then metadata and observability record a bounded attempt count', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  const records: AiTutorLogInput[] = [];
  let attempts = 0;
  const provider = createGeminiTutorProvider({
    config: enabledConfig,
    apiKey: 'synthetic-key',
    clientFactory: () => ({
      generateContent: async (params) => {
        calls.push(params);
        attempts += 1;
        if (attempts === 1) throw new TypeError('synthetic network failure');
        return { text: validGeminiText };
      },
    }),
    deadline: () => new Promise<'timeout'>(() => {}),
    retryDelay: async () => undefined,
    now: () => 10,
    observability: { record: (record) => records.push(record) },
  });

  // When
  const answer = await provider.answerWithMetadata(request);

  // Then
  assert.equal(calls.length, 2);
  assert.equal(answer.metadata.attemptCount, 2);
  assert.equal(records[0]?.attemptCount, 2);
  assert.equal(JSON.stringify(records).includes('synthetic network failure'), false);
});

test('Gemini provider emits content-free observability only', async () => {
  // Given
  const records: AiTutorLogInput[] = [];
  const provider = createProvider({ calls: [], response: { text: validGeminiText, usageMetadata: usage(3, 5) }, records });

  // When
  await provider.answer(request);

  // Then
  assert.equal(records.length, 1);
  assert.deepEqual(records[0]?.tokenCounts, { input: 3, output: 5, total: 8 });
  assert.equal(records[0]?.attemptCount, 1);
  assert.equal(JSON.stringify(records).includes(request.input.messageText), false);
  assert.equal(JSON.stringify(records).includes('synthetic-key'), false);
});
