import type { TutorProviderRequest, TutorProviderResult } from './contracts';
import { callGeminiWithRouteFallback, type GeminiRoutedCallResult } from './gemini-call';
import type { GeminiGenerateContentClient } from './gemini-provider';
import { buildGeminiParameters, type GeminiModelAlias, type GeminiModelSelection } from './gemini-parameters';
import { parseGeminiResponse, timeoutResult, type GeminiGenerateContentResponse } from './gemini-response-parser';
import type { AiTutorObservability, AiTutorTokenCounts } from './observability';
import { AI_TUTOR_PROMPT_VERSION } from './prompt';
import type { WebTutorProviderRouteAnswer, WebTutorProviderRouteInput } from './web-provider-routing';

const maxProviderDeadlineMs = 40_000;
const zeroTokenCounts: AiTutorTokenCounts = { input: 0, output: 0, total: 0 };

type GeminiWebProviderFailureCategory = 'http_4xx' | 'http_5xx' | 'http_other' | 'network' | 'timeout' | 'parser';

export type GeminiWebProviderFailureDiagnostic = {
  readonly event: 'ai_tutor.web_provider_failed';
  readonly failureCategory: GeminiWebProviderFailureCategory;
  readonly modelAlias: GeminiModelAlias;
  readonly modelId: string;
  readonly attemptCount: 1 | 2;
  readonly durationMs: number;
};

export type AnswerGeminiWebRouteInput = {
  readonly route: WebTutorProviderRouteInput;
  readonly client: GeminiGenerateContentClient;
  readonly modelTimeoutMs: number;
  readonly deadline?: (milliseconds: number) => Promise<'timeout'>;
  readonly retryDelay?: (milliseconds: number) => Promise<void>;
  readonly now: () => number;
  readonly observability?: AiTutorObservability;
  readonly failureLogger?: (diagnostic: GeminiWebProviderFailureDiagnostic) => void;
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
  logFinalProviderFailure({
    call,
    result,
    model,
    durationMs: latencyMs,
    logger: input.failureLogger ?? defaultFailureLogger,
  });
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

function logFinalProviderFailure(input: Readonly<{
  readonly call: GeminiRoutedCallResult;
  readonly result: TutorProviderResult;
  readonly model: GeminiModelSelection;
  readonly durationMs: number;
  readonly logger: (diagnostic: GeminiWebProviderFailureDiagnostic) => void;
}>): void {
  const failureCategory = toFailureCategory(input.call, input.result);
  if (failureCategory === undefined) return;
  input.logger({
    event: 'ai_tutor.web_provider_failed',
    failureCategory,
    modelAlias: input.model.alias,
    modelId: input.model.id,
    attemptCount: input.call.attemptCount,
    durationMs: input.durationMs,
  });
}

function toFailureCategory(
  call: GeminiRoutedCallResult,
  result: TutorProviderResult,
): GeminiWebProviderFailureCategory | undefined {
  if (call.response === 'timeout') return 'timeout';
  switch (result.errorType) {
    case 'timeout':
      return 'timeout';
    case 'provider_error':
      return toHttpFailureCategory(call.failedStatus);
    case 'invalid_output':
      return 'parser';
    case null:
    case 'unsupported_attachment':
    case 'out_of_curriculum':
      return undefined;
    default:
      return assertNever(result.errorType);
  }
}

function toHttpFailureCategory(status: number | undefined): GeminiWebProviderFailureCategory {
  if (status === undefined) return 'network';
  if (status >= 400 && status < 500) return 'http_4xx';
  if (status >= 500 && status < 600) return 'http_5xx';
  return 'http_other';
}

function defaultFailureLogger(diagnostic: GeminiWebProviderFailureDiagnostic): void {
  console.error('ai_tutor.web_provider_failed', diagnostic);
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

function assertNever(value: never): never {
  throw new Error(`Unexpected Gemini web provider failure category: ${String(value)}`);
}
