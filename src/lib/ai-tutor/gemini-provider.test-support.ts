import type { AiTutorConfig } from './config';
import type { AiTutorLogInput } from './observability';
import type { TutorProviderRequest } from './contracts';
import {
  createGeminiTutorProvider,
  type GeminiGenerateContentClient,
  type GeminiGenerateContentParameters,
  type GeminiGenerateContentResponse,
} from './gemini-provider';

export type EnabledAiTutorConfig = Extract<AiTutorConfig, { readonly enabled: true }>;

export const enabledConfig: EnabledAiTutorConfig = {
  status: 'enabled',
  enabled: true,
  paidBillingConfirmed: true,
  geminiApiKey: { present: true },
  pairingHmacSecret: { present: true },
  textModel: { id: 'gemini-2.5-flash', alias: 'text' },
  visionModel: { id: 'gemini-2.5-pro', alias: 'vision' },
  fallbackModel: { id: 'gemini-3.1-flash', alias: 'fallback' },
  modelTimeoutMs: 22_000,
  caps: { recentTurnCount: 6, recentTurnCharacters: 1_200, recentTotalCharacters: 6_000 },
  image: { maxBytes: 8 * 1024 * 1024 },
  retentionDays: { rawContent: 90, image: 30, metadata: 365 },
};

export const disabledConfig: AiTutorConfig = {
  status: 'disabled',
  enabled: false,
  modelTimeoutMs: 20_000,
  caps: { recentTurnCount: 6, recentTurnCharacters: 1_200, recentTotalCharacters: 6_000 },
  image: { maxBytes: 8 * 1024 * 1024 },
  retentionDays: { rawContent: 90, image: 30, metadata: 365 },
};

export const request: TutorProviderRequest = {
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

export const validGeminiText = JSON.stringify({
  answerText: '힌트: x=2 말고 다른 인수도 0이 되는지 확인해 볼까요?',
  confidence: 0.88,
  subjectSlug: 'gs1',
  conceptTags: ['quadratic'],
  errorType: null,
  needsTeacherReview: false,
  escalationReason: null,
});

export function createProvider(input: {
  readonly calls: GeminiGenerateContentParameters[];
  readonly config?: AiTutorConfig;
  readonly response?: GeminiGenerateContentResponse;
  readonly rejectWith?: Error;
  readonly records?: AiTutorLogInput[];
}) {
  return createGeminiTutorProvider({
    config: input.config ?? enabledConfig,
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

export function fakeClient(text: string): GeminiGenerateContentClient {
  return {
    generateContent: async () => ({ text }),
  };
}

export function usage(input: number, output: number): {
  readonly promptTokenCount: number;
  readonly candidatesTokenCount: number;
  readonly totalTokenCount: number;
} {
  return { promptTokenCount: input, candidatesTokenCount: output, totalTokenCount: input + output };
}

export class GeminiProviderTestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
