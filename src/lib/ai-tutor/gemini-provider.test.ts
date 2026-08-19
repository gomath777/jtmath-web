import assert from 'node:assert/strict';
import test from 'node:test';
import type { AiTutorConfig } from './config';
import type { AiTutorLogInput } from './observability';
import type { TutorProviderRequest } from './contracts';
import {
  createGeminiTutorProvider,
  type GeminiGenerateContentClient,
  type GeminiGenerateContentParameters,
  type GeminiGenerateContentResponse,
} from './gemini-provider';

const enabledConfig: AiTutorConfig = {
  status: 'enabled',
  enabled: true,
  paidBillingConfirmed: true,
  geminiApiKey: { present: true },
  pairingHmacSecret: { present: true },
  textModel: { id: 'gemini-2.5-flash', alias: 'text' },
  visionModel: { id: 'gemini-2.5-pro', alias: 'vision' },
  modelTimeoutMs: 22_000,
  caps: { recentTurnCount: 6, recentTurnCharacters: 1_200, recentTotalCharacters: 6_000 },
  image: { maxBytes: 8 * 1024 * 1024 },
  retentionDays: { rawContent: 90, image: 30, metadata: 365 },
};

const disabledConfig: AiTutorConfig = {
  status: 'disabled',
  enabled: false,
  modelTimeoutMs: 20_000,
  caps: { recentTurnCount: 6, recentTurnCharacters: 1_200, recentTotalCharacters: 6_000 },
  image: { maxBytes: 8 * 1024 * 1024 },
  retentionDays: { rawContent: 90, image: 30, metadata: 365 },
};

const request: TutorProviderRequest = {
  input: { kind: 'text', messageText: 'x^2-5x+6=0에서 x=2만 적었는데 맞나요?' },
  context: {
    gradeLabel: '고1',
    releasedCurriculum: [
      { subjectSlug: 'gs1', conceptTags: ['quadratic'], title: '이차방정식', summary: '인수분해로 이차방정식을 푼다.' },
    ],
    recentTurns: [],
    repeatedConceptSignal: false,
  },
};

const validGeminiText = JSON.stringify({
  answerText: '힌트: x=2 말고 다른 인수도 0이 되는지 확인해 볼까요?',
  confidence: 0.88,
  subjectSlug: 'gs1',
  conceptTags: ['quadratic'],
  errorType: null,
  needsTeacherReview: false,
  escalationReason: null,
});

test('createGeminiTutorProvider validates paid enabled config before constructing the SDK client', async () => {
  // Given
  let constructed = 0;

  // When / Then
  assert.throws(() =>
    createGeminiTutorProvider({
      config: disabledConfig,
      apiKey: 'synthetic-key',
      clientFactory: () => {
        constructed += 1;
        return fakeClient(validGeminiText);
      },
    }),
  );
  assert.equal(constructed, 0);
});

test('Gemini provider uses the exact configured text model with structured JSON config', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  const provider = createProvider({ calls, response: { text: validGeminiText, usageMetadata: usage(11, 17) } });

  // When
  const answer = await provider.answerWithMetadata(request);

  // Then
  assert.equal(answer.result.answerText.includes('다른 인수'), true);
  assert.equal(answer.metadata.modelId, 'gemini-2.5-flash');
  assert.equal(answer.metadata.modelAlias, 'text');
  assert.equal(answer.metadata.tokenCounts.total, 28);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.model, 'gemini-2.5-flash');
  assert.equal(calls[0]?.config?.responseMimeType, 'application/json');
  assert.equal(calls[0]?.config?.candidateCount, 1);
  assert.equal(calls[0]?.config?.maxOutputTokens, 900);
  assert.equal(calls[0]?.config?.tools, undefined);
  assert.deepEqual(calls[0]?.config?.thinkingConfig, {
    includeThoughts: false,
    thinkingBudget: 0,
  });
  assert.equal(JSON.stringify(calls[0]).includes('users/'), false);
});

test('Gemini provider switches to the exact configured vision model and sends inline image bytes', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  const provider = createProvider({ calls, response: { text: validGeminiText } });

  // When
  await provider.answerWithMetadata({
    ...request,
    image: { mimeType: 'image/jpeg', bytes: new Uint8Array([1, 2, 3, 4]), sha256Hex: 'a'.repeat(64) },
  });

  // Then
  assert.equal(calls[0]?.model, 'gemini-2.5-pro');
  assert.equal(JSON.stringify(calls[0]).includes('"mimeType":"image/jpeg"'), true);
  assert.equal(JSON.stringify(calls[0]).includes('"data":"AQIDBA=="'), true);
  assert.equal(JSON.stringify(calls[0]).includes('ai-tutor-private'), false);
  assert.equal(JSON.stringify(calls[0]).includes('sha256'), false);
});

test('Gemini provider returns a timeout fallback at the hard 20 second cap and ignores late results', async () => {
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
      assert.equal(milliseconds, 20_000);
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

test('Gemini provider maps invalid JSON and schema drift to invalid-output review fallback', async () => {
  // Given
  const invalidJsonProvider = createProvider({ calls: [], response: { text: '{not-json' } });
  const invalidSchemaProvider = createProvider({
    calls: [],
    response: {
      text: JSON.stringify({
        answerText: '힌트입니다.',
        confidence: 1.2,
        subjectSlug: null,
        conceptTags: [],
        errorType: null,
        needsTeacherReview: false,
        escalationReason: null,
        email: 'synthetic@example.invalid',
      }),
    },
  });

  // When
  const invalidJson = await invalidJsonProvider.answer(request);
  const invalidSchema = await invalidSchemaProvider.answer(request);

  // Then
  assert.equal(invalidJson.errorType, 'invalid_output');
  assert.equal(invalidSchema.errorType, 'invalid_output');
  assert.equal(invalidJson.needsTeacherReview, true);
  assert.equal(invalidSchema.needsTeacherReview, true);
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

test('Gemini provider emits content-free observability only', async () => {
  // Given
  const records: AiTutorLogInput[] = [];
  const provider = createProvider({ calls: [], response: { text: validGeminiText, usageMetadata: usage(3, 5) }, records });

  // When
  await provider.answer(request);

  // Then
  assert.equal(records.length, 1);
  assert.deepEqual(records[0]?.tokenCounts, { input: 3, output: 5, total: 8 });
  assert.equal(JSON.stringify(records).includes(request.input.messageText), false);
  assert.equal(JSON.stringify(records).includes('synthetic-key'), false);
});

function createProvider(input: {
  readonly calls: GeminiGenerateContentParameters[];
  readonly response?: GeminiGenerateContentResponse;
  readonly rejectWith?: Error;
  readonly records?: AiTutorLogInput[];
}) {
  return createGeminiTutorProvider({
    config: enabledConfig,
    apiKey: 'synthetic-key',
    clientFactory: () => ({
      generateContent: async (params) => {
        input.calls.push(params);
        if (input.rejectWith !== undefined) {
          throw input.rejectWith;
        }
        return input.response ?? { text: validGeminiText };
      },
    }),
    deadline: () => new Promise<'timeout'>(() => {}),
    now: () => 10,
    observability: input.records === undefined ? undefined : { record: (record) => input.records?.push(record) },
  });
}

function fakeClient(text: string): GeminiGenerateContentClient {
  return {
    generateContent: async () => ({ text }),
  };
}

function usage(input: number, output: number): {
  readonly promptTokenCount: number;
  readonly candidatesTokenCount: number;
  readonly totalTokenCount: number;
} {
  return { promptTokenCount: input, candidatesTokenCount: output, totalTokenCount: input + output };
}

class GeminiProviderTestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
