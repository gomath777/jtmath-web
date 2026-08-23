import assert from 'node:assert/strict';
import test from 'node:test';
import { answerGeminiWebRoute } from './gemini-web-routing';
import { request, validGeminiText } from './gemini-provider.test-support';

test('Given a web route timeout above the function budget When Gemini is called Then the provider deadline leaves response time within 60 seconds', async () => {
  let deadlineMs: number | undefined;

  const answer = await answerGeminiWebRoute({
    route: {
      request,
      primaryModel: { id: 'gemini-3.1-pro', alias: 'reasoning' },
      fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
    },
    client: { generateContent: async () => ({ text: validGeminiText }) },
    modelTimeoutMs: 60_000,
    deadline: (milliseconds) => {
      deadlineMs = milliseconds;
      return new Promise<'timeout'>(() => {});
    },
    now: () => 0,
  });

  assert.equal(deadlineMs, 55_000);
  assert.equal(answer.result.errorType, null);
});
