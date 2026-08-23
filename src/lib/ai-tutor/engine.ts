import {
  TutorProviderRequestSchema,
  TutorProviderResultSchema,
  buildReviewResult,
  type TutorContext,
  type TutorCurriculumItem,
  type TutorProvider,
  type TutorProviderRequest,
  type TutorProviderResult,
  type TutorRecentTurn,
} from './contracts';
import { applyGroundedMethodPolicy } from './grounded-method-policy';
import type { AiTutorTokenCounts } from './observability';

export type TutorEngineMetadata = {
  readonly provider: 'gemini';
  readonly modelId: string;
  readonly modelAlias: 'text' | 'vision' | 'fast' | 'reasoning' | 'fallback';
  readonly promptVersion: string;
  readonly latencyMs: number;
  readonly tokenCounts: AiTutorTokenCounts;
  readonly attemptCount: 1 | 2;
};

export type TutorEngineAnswer = {
  readonly result: TutorProviderResult;
  readonly metadata: TutorEngineMetadata | null;
};

export type TutorEngine = {
  readonly answer: (request: TutorProviderRequest) => Promise<TutorProviderResult>;
  readonly answerWithMetadata: (request: TutorProviderRequest) => Promise<TutorEngineAnswer>;
};

type TutorProviderWithMetadata = TutorProvider & {
  readonly answerWithMetadata?: (request: TutorProviderRequest) => Promise<{
    readonly result: TutorProviderResult;
    readonly metadata: {
      readonly modelId: string;
      readonly modelAlias: TutorEngineMetadata['modelAlias'];
      readonly promptVersion: string;
      readonly durationMs: number;
      readonly tokenCounts: AiTutorTokenCounts;
      readonly attemptCount: 1 | 2;
    };
  }>;
};

export type TutorEngineOptions = {
  readonly provider: TutorProviderWithMetadata;
  readonly confidenceThreshold?: number;
  readonly maxAnswerCharacters?: number;
};

export type TutorResultPolicyInput = {
  readonly result: TutorProviderResult;
  readonly context: TutorContext;
  readonly groundedProblem?: TutorProviderRequest['groundedProblem'];
  readonly confidenceThreshold?: number;
  readonly maxAnswerCharacters?: number;
};

const defaultConfidenceThreshold = 0.65;
const defaultMaxAnswerCharacters = 1_200;
const emailPattern = new RegExp('\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b', 'giu');

export function createTutorEngine(options: TutorEngineOptions): TutorEngine {
  const confidenceThreshold = options.confidenceThreshold ?? defaultConfidenceThreshold;
  const maxAnswerCharacters = options.maxAnswerCharacters ?? defaultMaxAnswerCharacters;

  return {
    answer: async (request) => (await answerWithMetadata(options.provider, request, confidenceThreshold, maxAnswerCharacters)).result,
    answerWithMetadata: async (request) => answerWithMetadata(options.provider, request, confidenceThreshold, maxAnswerCharacters),
  };
}

async function answerWithMetadata(
  provider: TutorProviderWithMetadata,
  request: TutorProviderRequest,
  confidenceThreshold: number,
  maxAnswerCharacters: number,
): Promise<TutorEngineAnswer> {
  const sanitizedRequest = sanitizeTutorProviderRequest(request);
  try {
    const providerAnswer = await callProvider(provider, sanitizedRequest);
    return {
      result: applyTutorResultPolicy({
        result: providerAnswer.result,
        context: sanitizedRequest.context,
        groundedProblem: sanitizedRequest.groundedProblem,
        confidenceThreshold,
        maxAnswerCharacters,
      }),
      metadata: providerAnswer.metadata,
    };
  } catch (error) {
    if (error instanceof Error) return { result: providerErrorFallback(), metadata: null };
    return { result: providerErrorFallback(), metadata: null };
  }
}

async function callProvider(provider: TutorProviderWithMetadata, request: TutorProviderRequest): Promise<TutorEngineAnswer> {
  if (provider.answerWithMetadata === undefined) {
    return { result: await provider.answer(request), metadata: null };
  }
  const answer = await provider.answerWithMetadata(request);
  return {
    result: answer.result,
    metadata: {
      provider: 'gemini',
      modelId: answer.metadata.modelId,
      modelAlias: answer.metadata.modelAlias,
      promptVersion: answer.metadata.promptVersion,
      latencyMs: answer.metadata.durationMs,
      tokenCounts: answer.metadata.tokenCounts,
      attemptCount: answer.metadata.attemptCount,
    },
  };
}

export function sanitizeTutorProviderRequest(request: TutorProviderRequest): TutorProviderRequest {
  return TutorProviderRequestSchema.parse({
    input: {
      kind: 'text',
      messageText: sanitizeText(request.input.messageText, 4_000),
    },
    context: sanitizeContext(request.context),
    ...(request.image === undefined ? {} : { image: request.image }),
    ...(request.document === undefined ? {} : { document: request.document }),
    ...(request.groundedProblem === undefined ? {} : { groundedProblem: request.groundedProblem }),
  });
}

export function applyTutorResultPolicy(input: TutorResultPolicyInput): TutorProviderResult {
  const parsed = TutorProviderResultSchema.parse({
    ...input.result,
    answerText: normalizeAnswerText(input.result.answerText, input.maxAnswerCharacters ?? defaultMaxAnswerCharacters),
  });
  return applyGroundedMethodPolicy(
    applyReviewSignals(parsed, input.context, input.confidenceThreshold ?? defaultConfidenceThreshold),
    input.groundedProblem,
  );
}

function sanitizeContext(context: TutorContext): TutorContext {
  return {
    gradeLabel: sanitizeText(context.gradeLabel, 20),
    releasedCurriculum: context.releasedCurriculum.map(sanitizeCurriculumItem),
    recentTurns: context.recentTurns.map(sanitizeRecentTurn),
    repeatedConceptSignal: context.repeatedConceptSignal,
    ...(context.guideContext === undefined ? {} : { guideContext: context.guideContext }),
  };
}

function sanitizeCurriculumItem(item: TutorCurriculumItem): TutorCurriculumItem {
  return {
    subjectSlug: item.subjectSlug,
    conceptTags: item.conceptTags,
    title: sanitizeText(item.title, 120),
    summary: sanitizeText(item.summary, 500),
  };
}

function sanitizeRecentTurn(turn: TutorRecentTurn): TutorRecentTurn {
  return {
    role: turn.role,
    text: sanitizeText(turn.text, 1_000),
    conceptTags: turn.conceptTags,
  };
}

function sanitizeText(value: string, maxCharacters: number): string {
  const redacted = redactSensitiveText(value)
    .replace(/\s+/g, ' ')
    .trim();
  return truncateText(redacted.length === 0 ? '[redacted]' : redacted, maxCharacters);
}

function redactSensitiveText(value: string): string {
  return value
    .replace(emailPattern, '[redacted]')
    .replace(/\b0\d{1,2}-\d{3,4}-\d{4}\b/g, '[redacted]')
    .replace(/\busers\/[A-Za-z0-9._/-]+/g, '[redacted]')
    .replace(/\bai-tutor-private\/\S+/g, '[redacted]')
    .replace(/\bhttps?:\/\/\S+/g, '[redacted]');
}

function applyReviewSignals(
  result: TutorProviderResult,
  context: TutorContext,
  confidenceThreshold: number,
): TutorProviderResult {
  if (result.errorType !== null || result.escalationReason !== null) {
    return result;
  }
  if (context.repeatedConceptSignal) {
    return TutorProviderResultSchema.parse({
      ...result,
      needsTeacherReview: true,
      escalationReason: 'repeated_concept',
    });
  }
  if (result.confidence < confidenceThreshold) {
    return TutorProviderResultSchema.parse({
      ...result,
      needsTeacherReview: true,
      escalationReason: 'low_confidence',
    });
  }
  return result;
}

function normalizeAnswerText(value: string, maxCharacters: number): string {
  const normalized = redactSensitiveText(value)
    .replace(/\r\n?/g, '\n')
    .replace(/\*\*([^*\r\n]+)\*\*/gu, '$1')
    .split('\n')
    .reduce<{ readonly lines: readonly string[]; readonly previousBlank: boolean }>(
      (state, rawLine) => {
        const line = rawLine.replace(/[^\S\n]+/gu, ' ').trim();
        if (line === '') {
          if (state.previousBlank) return state;
          return { lines: [...state.lines, ''], previousBlank: true };
        }
        return { lines: [...state.lines, line], previousBlank: false };
      },
      { lines: [], previousBlank: true },
    )
    .lines.join('\n')
    .trim();
  return truncateText(normalized.length === 0 ? '선생님 확인이 필요합니다.' : normalized, maxCharacters);
}

function truncateText(value: string, maxCharacters: number): string {
  if (value.length <= maxCharacters) {
    return value;
  }
  if (maxCharacters <= 3) {
    return '.'.repeat(maxCharacters);
  }
  return `${value.slice(0, maxCharacters - 3).trimEnd()}...`;
}

function providerErrorFallback(): TutorProviderResult {
  return buildReviewResult({
    reason: 'provider_error',
    errorType: 'provider_error',
    answerText: '답변 생성이 끊겼어요. 같은 문제로 다시 물어보면 힌트부터 이어서 도와줄게요.',
  });
}
