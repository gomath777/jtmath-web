import { ApiError } from '@google/genai';
import type { GeminiGenerateContentClient, GeminiGenerateContentParameters } from './gemini-provider';
import { providerErrorResponse, type GeminiGenerateContentResponse } from './gemini-response-parser';

type GeminiCallOptions = {
  readonly client: GeminiGenerateContentClient;
  readonly params: GeminiGenerateContentParameters;
  readonly deadlineMs: number;
  readonly deadline?: (milliseconds: number) => Promise<'timeout'>;
  readonly retryDelay?: (milliseconds: number) => Promise<void>;
  readonly retryTransient?: boolean;
};

export type GeminiCallResult = {
  readonly response: GeminiGenerateContentResponse | 'timeout';
  readonly attemptCount: 1 | 2;
  readonly failedStatus?: number;
};

export type GeminiRoutedCallResult = GeminiCallResult & {
  readonly usedFallback: boolean;
};

type Deadline = { readonly promise: Promise<'timeout'>; readonly cancel: () => void };
type GenerateResult = { readonly response: GeminiGenerateContentResponse; readonly failedStatus?: number };

const transientStatuses = new Set([500, 502, 503, 504]);
const transientRetryDelayMs = 400;

export async function callGeminiWithRetry(options: GeminiCallOptions): Promise<GeminiGenerateContentResponse | 'timeout'> {
  return (await callGeminiWithRetryWithMetadata(options)).response;
}

export async function callGeminiWithRetryWithMetadata(options: GeminiCallOptions): Promise<GeminiCallResult> {
  const abortController = new AbortController();
  const timer = createDeadline(options.deadline, options.deadlineMs, abortController);
  const params = attachRequestDeadline(options.params, options.deadlineMs, abortController.signal);
  let expired = false;
  let attemptCount = 0;
  const expiration = timer.promise.then((result) => {
    expired = true;
    return result;
  });
  try {
    const result = await Promise.race([
      generateWithRetry({ ...options, params }, () => expired, () => { attemptCount += 1; }),
      expiration,
    ]);
    return result === 'timeout'
      ? { response: result, attemptCount: attemptCount === 2 ? 2 : 1 }
      : { response: result.response, attemptCount: attemptCount === 2 ? 2 : 1, ...(result.failedStatus === undefined ? {} : { failedStatus: result.failedStatus }) };
  } finally {
    timer.cancel();
  }
}

export async function callGeminiWithRouteFallback(options: {
  readonly client: GeminiGenerateContentClient;
  readonly primaryParams: GeminiGenerateContentParameters;
  readonly fallbackParams: GeminiGenerateContentParameters;
  readonly deadlineMs: number;
  readonly deadline?: (milliseconds: number) => Promise<'timeout'>;
  readonly retryDelay?: (milliseconds: number) => Promise<void>;
  readonly fallbackOnTransientFailure?: boolean;
  readonly now?: () => number;
}): Promise<GeminiRoutedCallResult> {
  const now = options.now ?? Date.now;
  const startedAt = now();
  const primary = await callGeminiWithRetryWithMetadata({
    client: options.client,
    params: options.primaryParams,
    deadlineMs: options.deadlineMs,
    deadline: options.deadline,
    retryDelay: options.retryDelay,
    retryTransient: options.fallbackOnTransientFailure !== true,
  });
  if (!shouldUseFallback(primary, options.fallbackOnTransientFailure)) return { ...primary, usedFallback: false };
  const fallbackDeadlineMs = Math.max(0, options.deadlineMs - Math.max(0, now() - startedAt));
  if (fallbackDeadlineMs === 0) return { ...primary, usedFallback: false };
  const fallback = await callGeminiOnce({
    client: options.client,
    params: options.fallbackParams,
    deadlineMs: fallbackDeadlineMs,
    deadline: options.deadline,
  });
  return { ...fallback, attemptCount: 2, usedFallback: true };
}

async function generateWithRetry(
  options: GeminiCallOptions,
  isExpired: () => boolean,
  recordAttempt: () => void,
): Promise<GenerateResult> {
  try {
    recordAttempt();
    return { response: await options.client.generateContent(options.params) };
  } catch (error) {
    const status = readGeminiErrorStatus(error);
    if (isExpired() || options.retryTransient === false || !isTransientGeminiError(error)) {
      return { response: providerErrorResponse(), ...(status === undefined ? {} : { failedStatus: status }) };
    }
  }

  await (options.retryDelay ?? wait)(transientRetryDelayMs);
  if (isExpired()) return { response: providerErrorResponse() };
  try {
    recordAttempt();
    return { response: await options.client.generateContent(options.params) };
  } catch (error) {
    const status = readGeminiErrorStatus(error);
    return { response: providerErrorResponse(), ...(status === undefined ? {} : { failedStatus: status }) };
  }
}

function shouldUseFallback(
  primary: GeminiCallResult,
  fallbackOnTransientFailure: boolean | undefined,
): boolean {
  if (primary.failedStatus === 429 && primary.attemptCount === 1) return true;
  return fallbackOnTransientFailure === true
    && primary.failedStatus !== undefined
    && transientStatuses.has(primary.failedStatus);
}

async function callGeminiOnce(options: GeminiCallOptions): Promise<GeminiCallResult> {
  const abortController = new AbortController();
  const timer = createDeadline(options.deadline, options.deadlineMs, abortController);
  const params = attachRequestDeadline(options.params, options.deadlineMs, abortController.signal);
  try {
    const response = await Promise.race([
      options.client.generateContent(params).then(
        (value) => ({ kind: 'response' as const, value }),
        (error: unknown) => ({ kind: 'error' as const, error }),
      ),
      timer.promise.then(() => ({ kind: 'timeout' as const })),
    ]);
    switch (response.kind) {
      case 'response':
        return { response: response.value, attemptCount: 1 };
      case 'error': {
        const failedStatus = readGeminiErrorStatus(response.error);
        return {
          response: providerErrorResponse(),
          attemptCount: 1,
          ...(failedStatus === undefined ? {} : { failedStatus }),
        };
      }
      case 'timeout':
        return { response: 'timeout', attemptCount: 1 };
      default:
        return assertNever(response);
    }
  } finally {
    timer.cancel();
  }
}

function isTransientGeminiError(error: unknown): boolean {
  const status = readGeminiErrorStatus(error);
  if (status !== undefined) return transientStatuses.has(status);
  return error instanceof TypeError;
}

function readGeminiErrorStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status;
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = error.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function attachRequestDeadline(
  params: GeminiGenerateContentParameters,
  milliseconds: number,
  abortSignal: AbortSignal,
): GeminiGenerateContentParameters {
  return {
    ...params,
    config: {
      ...params.config,
      abortSignal,
      httpOptions: { ...params.config.httpOptions, timeout: milliseconds },
    },
  };
}

function createDeadline(
  deadline: GeminiCallOptions['deadline'],
  milliseconds: number,
  abortController: AbortController,
): Deadline {
  if (deadline !== undefined) {
    return {
      promise: deadline(milliseconds).then((result) => {
        abortController.abort();
        return result;
      }),
      cancel: noop,
    };
  }
  let timeout: NodeJS.Timeout | undefined;
  return {
    promise: new Promise<'timeout'>((resolve) => {
      timeout = setTimeout(() => {
        abortController.abort();
        resolve('timeout');
      }, milliseconds);
    }),
    cancel: () => {
      if (timeout !== undefined) clearTimeout(timeout);
    },
  };
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function noop(): void {}

function assertNever(value: never): never {
  throw new Error(`Unexpected Gemini routed call result: ${String(value)}`);
}
