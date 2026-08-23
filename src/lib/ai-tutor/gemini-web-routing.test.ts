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

  assert.equal(deadlineMs, 40_000);
  assert.equal(answer.result.errorType, null);
});

test('Given a stalled Gemini web request When the deadline expires Then its SDK fetch is aborted and the tutor returns a timeout answer', async () => {
  let signal: AbortSignal | undefined;
  let timeoutMs: number | undefined;

  const answer = await answerGeminiWebRoute({
    route: {
      request,
      primaryModel: { id: 'gemini-3.1-pro', alias: 'reasoning' },
      fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
    },
    client: {
      generateContent: async (params) => new Promise((_, reject) => {
        signal = params.config.abortSignal;
        timeoutMs = params.config.httpOptions?.timeout;
        signal?.addEventListener('abort', () => reject(new Error('synthetic aborted request')), { once: true });
      }),
    },
    modelTimeoutMs: 60_000,
    deadline: async () => 'timeout',
    now: () => 0,
    failureLogger: () => undefined,
  });

  assert.equal(signal?.aborted, true);
  assert.equal(timeoutMs, 40_000);
  assert.equal(answer.result.errorType, 'timeout');
  assert.match(answer.result.answerText, /답변 시간이 길어졌어요/u);
});

test('Given a final Gemini web provider failure When the route returns Then it emits one redacted diagnostic with the HTTP status bucket', async () => {
  // Given
  const diagnostics: unknown[] = [];

  // When
  const answer = await answerGeminiWebRoute({
    route: {
      request,
      primaryModel: { id: 'gemini-3.1-flash-lite', alias: 'reasoning' },
      fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
    },
    client: {
      generateContent: async () => {
        throw { status: 503, message: 'must not enter diagnostics' };
      },
    },
    modelTimeoutMs: 40_000,
    deadline: () => new Promise<'timeout'>(() => {}),
    retryDelay: async () => undefined,
    now: () => 123,
    failureLogger: (diagnostic) => diagnostics.push(diagnostic),
  });

  // Then
  assert.equal(answer.result.errorType, 'provider_error');
  assert.deepEqual(diagnostics, [{
    event: 'ai_tutor.web_provider_failed',
    failureCategory: 'http_5xx',
    modelAlias: 'fallback',
    modelId: 'gemini-3.1-flash',
    attemptCount: 2,
    durationMs: 0,
  }]);
  assert.equal(JSON.stringify(diagnostics).includes('must not enter diagnostics'), false);
  assert.equal(JSON.stringify(diagnostics).includes(request.input.messageText), false);
});

test('Given a transient primary Gemini 503 When the web tutor route answers Then it uses the fallback model within the same request budget', async () => {
  // Given
  const models: string[] = [];

  // When
  const answer = await answerGeminiWebRoute({
    route: {
      request,
      primaryModel: { id: 'gemini-3.1-flash-lite', alias: 'reasoning' },
      fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
    },
    client: {
      generateContent: async (params) => {
        models.push(params.model);
        if (models.length === 1) throw { status: 503 };
        return { text: validGeminiText };
      },
    },
    modelTimeoutMs: 40_000,
    deadline: () => new Promise<'timeout'>(() => {}),
    retryDelay: async () => undefined,
    now: () => 0,
    failureLogger: () => undefined,
  });

  // Then
  assert.equal(answer.result.errorType, null);
  assert.deepEqual(models, ['gemini-3.1-flash-lite', 'gemini-3.1-flash']);
  assert.equal(answer.metadata.modelAlias, 'fallback');
  assert.equal(answer.metadata.attemptCount, 2);
});

test('Given a late transient primary failure When the web tutor route starts its fallback Then the fallback receives only the remaining request budget', async () => {
  // Given
  const timeValues = [0, 0, 35_000, 35_000];
  let fallbackTimeoutMs: number | undefined;

  // When
  const answer = await answerGeminiWebRoute({
    route: {
      request,
      primaryModel: { id: 'gemini-3.1-flash-lite', alias: 'reasoning' },
      fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
    },
    client: {
      generateContent: async (params) => {
        if (params.model === 'gemini-3.1-flash-lite') throw { status: 503 };
        fallbackTimeoutMs = params.config.httpOptions?.timeout;
        return { text: validGeminiText };
      },
    },
    modelTimeoutMs: 40_000,
    deadline: () => new Promise<'timeout'>(() => {}),
    now: () => timeValues.shift() ?? 35_000,
    failureLogger: () => undefined,
  });

  // Then
  assert.equal(answer.result.errorType, null);
  assert.equal(fallbackTimeoutMs, 5_000);
  assert.equal(answer.metadata.latencyMs, 35_000);
});
