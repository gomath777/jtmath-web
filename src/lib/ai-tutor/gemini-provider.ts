import { GoogleGenAI } from '@google/genai';
import type { AiTutorConfig } from './config';
import type { AiTutorObservability, AiTutorTokenCounts } from './observability';
import {
  TutorProviderRequestSchema,
  TutorProviderResultSchema,
  buildReviewResult,
  type TutorProvider,
  type TutorProviderRequest,
  type TutorProviderResult,
} from './contracts';
import { AI_TUTOR_PROMPT_VERSION, buildTutorPrompt } from './prompt';

export type GeminiModelAlias = 'text' | 'vision';
export type GeminiTextPart = { readonly text: string };
export type GeminiInlineDataPart = { readonly inlineData: { readonly mimeType: string; readonly data: string } };
export type GeminiPart = GeminiTextPart | GeminiInlineDataPart;
export type GeminiContent = { readonly role: 'user'; readonly parts: readonly GeminiPart[] };
export type GeminiGenerateContentConfig = {
  readonly systemInstruction: string;
  readonly temperature: number;
  readonly topP: number;
  readonly topK: number;
  readonly candidateCount: number;
  readonly maxOutputTokens: number;
  readonly responseMimeType: 'application/json';
  readonly responseJsonSchema: typeof tutorResponseJsonSchema;
  readonly thinkingConfig: { readonly includeThoughts: false; readonly thinkingBudget: 0 };
  readonly tools?: undefined;
};
export type GeminiGenerateContentParameters = {
  readonly model: string;
  readonly contents: readonly GeminiContent[];
  readonly config: GeminiGenerateContentConfig;
};
export type GeminiGenerateContentResponse = {
  readonly text?: string;
  readonly candidates?: readonly { readonly finishReason?: string }[];
  readonly promptFeedback?: { readonly blockReason?: string };
  readonly usageMetadata?: {
    readonly promptTokenCount?: number;
    readonly candidatesTokenCount?: number;
    readonly totalTokenCount?: number;
  };
};
export interface GeminiGenerateContentClient {
  generateContent(params: GeminiGenerateContentParameters): Promise<GeminiGenerateContentResponse>;
}
export type GeminiTutorProviderMetadata = {
  readonly modelId: string;
  readonly modelAlias: GeminiModelAlias;
  readonly promptVersion: typeof AI_TUTOR_PROMPT_VERSION;
  readonly tokenCounts: AiTutorTokenCounts;
  readonly durationMs: number;
};
export type GeminiTutorProviderAnswer = { readonly result: TutorProviderResult; readonly metadata: GeminiTutorProviderMetadata };
export interface GeminiTutorProvider extends TutorProvider {
  answerWithMetadata(request: TutorProviderRequest): Promise<GeminiTutorProviderAnswer>;
}
export type GeminiTutorProviderOptions = {
  readonly config: AiTutorConfig;
  readonly apiKey: string;
  readonly clientFactory?: (apiKey: string) => GeminiGenerateContentClient;
  readonly deadline?: (milliseconds: number) => Promise<'timeout'>;
  readonly now?: () => number;
  readonly observability?: AiTutorObservability;
};

type EnabledAiTutorConfig = Extract<AiTutorConfig, { readonly status: 'enabled' }>;
type GeminiModelSelection = { readonly id: string; readonly alias: GeminiModelAlias };
type Deadline = { readonly promise: Promise<'timeout'>; readonly cancel: () => void };

const hardDeadlineMs = 20_000;
const zeroTokenCounts: AiTutorTokenCounts = { input: 0, output: 0, total: 0 };
const errorTypeValues = ['timeout', 'provider_error', 'invalid_output', 'unsupported_attachment', 'out_of_curriculum'] as const;
const escalationValues = [...errorTypeValues, 'low_confidence', 'repeated_concept'] as const;
const nullableStringEnum = (values: readonly string[]) => ({ anyOf: [{ type: 'string', enum: values }, { type: 'null' }] }) as const;
const tutorResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['answerText', 'confidence', 'subjectSlug', 'conceptTags', 'errorType', 'needsTeacherReview', 'escalationReason'],
  properties: {
    answerText: { type: 'string', minLength: 1, maxLength: 2000 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    subjectSlug: { anyOf: [{ type: 'string', minLength: 1, maxLength: 40 }, { type: 'null' }] },
    conceptTags: { type: 'array', maxItems: 8, items: { type: 'string', minLength: 1, maxLength: 40 } },
    errorType: nullableStringEnum(errorTypeValues),
    needsTeacherReview: { type: 'boolean' },
    escalationReason: nullableStringEnum(escalationValues),
  },
} as const;

export class GeminiTutorProviderConfigurationError extends Error {
  readonly category = 'configuration';
  constructor() {
    super('AI tutor Gemini provider requires enabled paid configuration and a present API key.');
  }
}

export function createGeminiTutorProvider(options: GeminiTutorProviderOptions): GeminiTutorProvider {
  const { config, apiKey } = options;
  if (config.status !== 'enabled' || !config.enabled || !config.paidBillingConfirmed || apiKey.trim() === '') {
    throw new GeminiTutorProviderConfigurationError();
  }
  const client = (options.clientFactory ?? createDefaultGeminiClient)(apiKey);
  const shared = { config, client, deadline: options.deadline, now: options.now ?? Date.now, observability: options.observability };
  return {
    answer: async (request) => (await answerWithMetadata({ ...shared, request })).result,
    answerWithMetadata: (request) => answerWithMetadata({ ...shared, request }),
  };
}

function createDefaultGeminiClient(apiKey: string): GeminiGenerateContentClient {
  const ai = new GoogleGenAI({ apiKey });
  return {
    generateContent: (params) =>
      ai.models.generateContent({
        model: params.model,
        contents: params.contents.map((content) => ({ role: content.role, parts: content.parts.map(copyPart) })),
        config: params.config,
      }),
  };
}

function copyPart(part: GeminiPart): GeminiPart {
  if ('text' in part) return { text: part.text };
  return { inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data } };
}

async function answerWithMetadata(input: {
  readonly request: TutorProviderRequest;
  readonly config: EnabledAiTutorConfig;
  readonly client: GeminiGenerateContentClient;
  readonly deadline?: (milliseconds: number) => Promise<'timeout'>;
  readonly now: () => number;
  readonly observability?: AiTutorObservability;
}): Promise<GeminiTutorProviderAnswer> {
  const start = input.now();
  const request = TutorProviderRequestSchema.parse(input.request);
  const model = request.image === undefined ? input.config.textModel : input.config.visionModel;
  const response = await callGeminiWithDeadline(input.client, buildGeminiParameters(request, model), input.deadline);
  const durationMs = Math.max(0, input.now() - start);
  if (response === 'timeout') return completeProviderAnswer(timeoutResult(), model, zeroTokenCounts, durationMs, input.observability);
  return completeProviderAnswer(parseGeminiResponse(response), model, toTokenCounts(response.usageMetadata), durationMs, input.observability);
}

function buildGeminiParameters(request: TutorProviderRequest, model: GeminiModelSelection): GeminiGenerateContentParameters {
  const prompt = buildTutorPrompt({ input: request.input, context: request.context, hasImage: request.image !== undefined });
  return {
    model: model.id,
    contents: [{ role: 'user', parts: buildParts(request, prompt.contextBlock, prompt.studentBlock, prompt.responseInstruction) }],
    config: {
      systemInstruction: prompt.system,
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      candidateCount: 1,
      maxOutputTokens: 900,
      responseMimeType: 'application/json',
      responseJsonSchema: tutorResponseJsonSchema,
      thinkingConfig: { includeThoughts: false, thinkingBudget: 0 },
    },
  };
}

function buildParts(request: TutorProviderRequest, contextBlock: string, studentBlock: string, responseInstruction: string): readonly GeminiPart[] {
  const parts: GeminiPart[] = [{ text: contextBlock }, { text: studentBlock }, { text: responseInstruction }];
  if (request.image === undefined) return parts;
  return [...parts, { inlineData: { mimeType: request.image.mimeType, data: Buffer.from(request.image.bytes).toString('base64') } }];
}

async function callGeminiWithDeadline(
  client: GeminiGenerateContentClient,
  params: GeminiGenerateContentParameters,
  deadline: ((milliseconds: number) => Promise<'timeout'>) | undefined,
): Promise<GeminiGenerateContentResponse | 'timeout'> {
  const timer = createDeadline(deadline, hardDeadlineMs);
  try {
    return await Promise.race([client.generateContent(params), timer.promise]);
  } catch (error) {
    if (error instanceof Error) return providerErrorResponse();
    return providerErrorResponse();
  } finally {
    timer.cancel();
  }
}

function createDeadline(deadline: ((milliseconds: number) => Promise<'timeout'>) | undefined, milliseconds: number): Deadline {
  if (deadline !== undefined) return { promise: deadline(milliseconds), cancel: noop };
  let timeout: NodeJS.Timeout | undefined;
  return {
    promise: new Promise<'timeout'>((resolve) => {
      timeout = setTimeout(() => resolve('timeout'), milliseconds);
    }),
    cancel: () => {
      if (timeout !== undefined) clearTimeout(timeout);
    },
  };
}

function parseGeminiResponse(response: GeminiGenerateContentResponse): TutorProviderResult {
  if (isSafetyBlocked(response)) return providerErrorResult();
  const text = response.text?.trim();
  if (text === undefined || text === '') return invalidOutputResult();
  try {
    const parsed: unknown = JSON.parse(text);
    return TutorProviderResultSchema.parse(parsed);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof Error) return invalidOutputResult();
    return invalidOutputResult();
  }
}

function isSafetyBlocked(response: GeminiGenerateContentResponse): boolean {
  const safetyReasons = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'SPII', 'BLOCKLIST']);
  return response.promptFeedback?.blockReason !== undefined || (response.candidates?.some((candidate) => safetyReasons.has(candidate.finishReason ?? '')) ?? false);
}

function providerErrorResponse(): GeminiGenerateContentResponse {
  return { text: JSON.stringify(providerErrorResult()) };
}

function timeoutResult(): TutorProviderResult {
  return buildReviewResult({ reason: 'timeout', errorType: 'timeout', answerText: 'AI 답변 시간이 초과되어 선생님 확인이 필요합니다.' });
}

function providerErrorResult(): TutorProviderResult {
  return buildReviewResult({ reason: 'provider_error', errorType: 'provider_error', answerText: 'AI 답변을 안전하게 완료하지 못해 선생님 확인이 필요합니다.' });
}

function invalidOutputResult(): TutorProviderResult {
  return buildReviewResult({ reason: 'invalid_output', errorType: 'invalid_output', answerText: 'AI 답변 형식이 안전하지 않아 선생님 확인이 필요합니다.' });
}

function toTokenCounts(usageMetadata: GeminiGenerateContentResponse['usageMetadata']): AiTutorTokenCounts {
  const input = usageMetadata?.promptTokenCount ?? 0;
  const output = usageMetadata?.candidatesTokenCount ?? 0;
  return { input, output, total: usageMetadata?.totalTokenCount ?? input + output };
}

function completeProviderAnswer(
  result: TutorProviderResult,
  model: GeminiModelSelection,
  tokenCounts: AiTutorTokenCounts,
  durationMs: number,
  observability: AiTutorObservability | undefined,
): GeminiTutorProviderAnswer {
  observability?.record({
    eventClass: 'provider',
    status: result.errorType === null ? 'completed' : 'failed',
    durationMs,
    tokenCounts,
    modelAlias: model.alias,
    errorCategory: result.errorType === null ? undefined : 'provider',
  });
  return { result, metadata: { modelId: model.id, modelAlias: model.alias, promptVersion: AI_TUTOR_PROMPT_VERSION, tokenCounts, durationMs } };
}

function noop(): void {}
