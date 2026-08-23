import { GoogleGenAI } from '@google/genai';
import type { AiTutorConfig } from './config';
import type { AiTutorObservability, AiTutorTokenCounts } from './observability';
import {
  TutorProviderRequestSchema,
  type TutorProvider,
  type TutorProviderRequest,
  type TutorProviderResult,
} from './contracts';
import {
  parseGeminiResponse,
  timeoutResult,
  type GeminiGenerateContentResponse,
} from './gemini-response-parser';
import { callGeminiWithRouteFallback } from './gemini-call';
import {
  buildGeminiParameters,
  type GeminiGenerateContentParameters,
  type GeminiModelAlias,
  type GeminiModelSelection,
  type GeminiPart,
} from './gemini-parameters';
import { answerGeminiWebRoute } from './gemini-web-routing';
import { AI_TUTOR_PROMPT_VERSION } from './prompt';
import type { WebTutorProviderRouteAnswer, WebTutorProviderRouteInput } from './web-provider-routing';

export type { GeminiGenerateContentResponse } from './gemini-response-parser';
export type {
  GeminiContent,
  GeminiGenerateContentConfig,
  GeminiGenerateContentParameters,
  GeminiInlineDataPart,
  GeminiModelAlias,
  GeminiPart,
  GeminiTextPart,
} from './gemini-parameters';
export interface GeminiGenerateContentClient {
  generateContent(params: GeminiGenerateContentParameters): Promise<GeminiGenerateContentResponse>;
}
export type GeminiTutorProviderMetadata = {
  readonly modelId: string;
  readonly modelAlias: GeminiModelAlias;
  readonly promptVersion: typeof AI_TUTOR_PROMPT_VERSION;
  readonly tokenCounts: AiTutorTokenCounts;
  readonly durationMs: number;
  readonly attemptCount: 1 | 2;
};
export type GeminiTutorProviderAnswer = { readonly result: TutorProviderResult; readonly metadata: GeminiTutorProviderMetadata };
export interface GeminiTutorProvider extends TutorProvider {
  answerWithMetadata(request: TutorProviderRequest): Promise<GeminiTutorProviderAnswer>;
  answerWithRoute(input: WebTutorProviderRouteInput): Promise<WebTutorProviderRouteAnswer>;
}
export type GeminiTutorProviderOptions = {
  readonly config: AiTutorConfig;
  readonly apiKey: string;
  readonly clientFactory?: (apiKey: string) => GeminiGenerateContentClient;
  readonly deadline?: (milliseconds: number) => Promise<'timeout'>;
  readonly retryDelay?: (milliseconds: number) => Promise<void>;
  readonly now?: () => number;
  readonly observability?: AiTutorObservability;
};

type EnabledAiTutorConfig = Extract<AiTutorConfig, { readonly status: 'enabled' }>;
type GeminiResultParser<TResult extends TutorProviderResult> = (
  response: GeminiGenerateContentResponse,
) => TResult;
const maxProviderDeadlineMs = 110_000;
const zeroTokenCounts: AiTutorTokenCounts = { input: 0, output: 0, total: 0 };

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
  const shared = {
    config,
    client,
    deadline: options.deadline,
    retryDelay: options.retryDelay,
    now: options.now ?? Date.now,
    observability: options.observability,
  };
  return {
    answer: async (request) => (await answerWithResult({
      ...shared,
      request,
      buildParameters: buildGeminiParameters,
      parseResult: parseGeminiResponse,
      timeoutFallback: timeoutResult,
    })).result,
    answerWithMetadata: (request) => answerWithResult({
      ...shared,
      request,
      buildParameters: buildGeminiParameters,
      parseResult: parseGeminiResponse,
      timeoutFallback: timeoutResult,
    }),
    answerWithRoute: (route) => answerGeminiWebRoute({
      ...shared,
      route,
      modelTimeoutMs: config.modelTimeoutMs,
    }),
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

async function answerWithResult<TResult extends TutorProviderResult>(input: {
  readonly request: TutorProviderRequest;
  readonly config: EnabledAiTutorConfig;
  readonly client: GeminiGenerateContentClient;
  readonly deadline?: (milliseconds: number) => Promise<'timeout'>;
  readonly retryDelay?: (milliseconds: number) => Promise<void>;
  readonly now: () => number;
  readonly observability?: AiTutorObservability;
  readonly buildParameters: (request: TutorProviderRequest, model: GeminiModelSelection) => GeminiGenerateContentParameters;
  readonly parseResult: GeminiResultParser<TResult>;
  readonly timeoutFallback: () => TResult;
}): Promise<{ readonly result: TResult; readonly metadata: GeminiTutorProviderMetadata }> {
  const start = input.now();
  const request = TutorProviderRequestSchema.parse(input.request);
  const primaryModel = request.image === undefined && request.document === undefined ? input.config.textModel : input.config.visionModel;
  const call = await callGeminiWithRouteFallback({
    client: input.client,
    primaryParams: input.buildParameters(request, primaryModel),
    fallbackParams: input.buildParameters(request, input.config.fallbackModel),
    deadlineMs: Math.min(input.config.modelTimeoutMs, maxProviderDeadlineMs),
    deadline: input.deadline,
    retryDelay: input.retryDelay,
  });
  const finalModel = call.usedFallback ? input.config.fallbackModel : primaryModel;
  const durationMs = Math.max(0, input.now() - start);
  if (call.response === 'timeout') {
    return completeProviderAnswer(input.timeoutFallback(), finalModel, zeroTokenCounts, durationMs, call.attemptCount, input.observability);
  }
  return completeProviderAnswer(
    input.parseResult(call.response),
    finalModel,
    toTokenCounts(call.response.usageMetadata),
    durationMs,
    call.attemptCount,
    input.observability,
  );
}

function toTokenCounts(usageMetadata: GeminiGenerateContentResponse['usageMetadata']): AiTutorTokenCounts {
  const input = usageMetadata?.promptTokenCount ?? 0;
  const output = usageMetadata?.candidatesTokenCount ?? 0;
  return { input, output, total: usageMetadata?.totalTokenCount ?? input + output };
}

function completeProviderAnswer<TResult extends TutorProviderResult>(
  result: TResult,
  model: GeminiModelSelection,
  tokenCounts: AiTutorTokenCounts,
  durationMs: number,
  attemptCount: 1 | 2,
  observability: AiTutorObservability | undefined,
): { readonly result: TResult; readonly metadata: GeminiTutorProviderMetadata } {
  observability?.record({
    eventClass: 'provider',
    status: result.errorType === null ? 'completed' : 'failed',
    durationMs,
    tokenCounts,
    attemptCount,
    modelAlias: model.alias,
    errorCategory: result.errorType === null ? undefined : 'provider',
  });
  return {
    result,
    metadata: { modelId: model.id, modelAlias: model.alias, promptVersion: AI_TUTOR_PROMPT_VERSION, tokenCounts, durationMs, attemptCount },
  };
}
