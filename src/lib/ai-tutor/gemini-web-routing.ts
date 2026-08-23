import type { TutorProviderRequest, TutorProviderResult } from './contracts';
import { callGeminiWithRouteFallback } from './gemini-call';
import type { GeminiGenerateContentClient } from './gemini-provider';
import { buildGeminiParameters, type GeminiModelSelection } from './gemini-parameters';
import { parseGeminiResponse, timeoutResult, type GeminiGenerateContentResponse } from './gemini-response-parser';
import type { AiTutorObservability, AiTutorTokenCounts } from './observability';
import { AI_TUTOR_PROMPT_VERSION } from './prompt';
import type { WebTutorProviderRouteAnswer, WebTutorProviderRouteInput } from './web-provider-routing';

const maxProviderDeadlineMs = 110_000;
const zeroTokenCounts: AiTutorTokenCounts = { input: 0, output: 0, total: 0 };

export type AnswerGeminiWebRouteInput = {
  readonly route: WebTutorProviderRouteInput;
  readonly client: GeminiGenerateContentClient;
  readonly modelTimeoutMs: number;
  readonly deadline?: (milliseconds: number) => Promise<'timeout'>;
  readonly retryDelay?: (milliseconds: number) => Promise<void>;
  readonly now: () => number;
  readonly observability?: AiTutorObservability;
};

export async function answerGeminiWebRoute(input: AnswerGeminiWebRouteInput): Promise<WebTutorProviderRouteAnswer> {
  const start = input.now();
  const primary = toGeminiModel(input.route.primaryModel);
  const fallback = toGeminiModel(input.route.fallbackModel);
  const call = await callGeminiWithRouteFallback({
    client: input.client,
    primaryParams: buildGeminiParameters(input.route.request, primary),
    fallbackParams: buildGeminiParameters(input.route.request, fallback),
    deadlineMs: Math.min(input.modelTimeoutMs, maxProviderDeadlineMs),
    deadline: input.deadline,
    retryDelay: input.retryDelay,
  });
  const model = call.usedFallback ? fallback : primary;
  const result = call.response === 'timeout' ? timeoutResult() : parseGeminiResponse(call.response);
  const tokenCounts = call.response === 'timeout' ? zeroTokenCounts : toTokenCounts(call.response.usageMetadata);
  const latencyMs = Math.max(0, input.now() - start);
  input.observability?.record({
    eventClass: 'provider',
    status: result.errorType === null ? 'completed' : 'failed',
    durationMs: latencyMs,
    tokenCounts,
    attemptCount: call.attemptCount,
    modelAlias: model.alias,
    ...(result.errorType === null ? {} : { errorCategory: result.errorType === 'timeout' ? 'timeout' as const : 'provider' as const }),
  });
  return {
    result,
    metadata: {
      modelId: model.id,
      modelAlias: model.alias,
      promptVersion: AI_TUTOR_PROMPT_VERSION,
      latencyMs,
      tokenCounts,
      attemptCount: call.attemptCount,
      failureCategory: result.errorType,
    },
  };
}

function toGeminiModel<TAlias extends WebTutorProviderRouteInput['primaryModel']['alias']>(
  model: WebTutorProviderRouteInput['primaryModel'] & { readonly alias: TAlias },
): GeminiModelSelection & { readonly alias: TAlias } {
  return { id: model.id, alias: model.alias };
}

function toTokenCounts(usageMetadata: GeminiGenerateContentResponse['usageMetadata']): AiTutorTokenCounts {
  const input = usageMetadata?.promptTokenCount ?? 0;
  const output = usageMetadata?.candidatesTokenCount ?? 0;
  return { input, output, total: usageMetadata?.totalTokenCount ?? input + output };
}
