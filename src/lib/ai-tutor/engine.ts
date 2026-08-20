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

export type TutorEngine = {
  readonly answer: (request: TutorProviderRequest) => Promise<TutorProviderResult>;
};

export type TutorEngineOptions = {
  readonly provider: TutorProvider;
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
    answer: async (request) => {
      const sanitizedRequest = sanitizeProviderRequest(request);
      try {
        const providerResult = await options.provider.answer(sanitizedRequest);
        const parsed = TutorProviderResultSchema.parse({
          ...providerResult,
          answerText: normalizeAnswerText(providerResult.answerText, maxAnswerCharacters),
        });
        return applyReviewSignals(parsed, sanitizedRequest.context, confidenceThreshold);
      } catch (error) {
        if (error instanceof Error) {
          return providerErrorFallback();
        }
        return providerErrorFallback();
      }
    },
  };
}

function sanitizeProviderRequest(request: TutorProviderRequest): TutorProviderRequest {
  return TutorProviderRequestSchema.parse({
    input: {
      kind: 'text',
      messageText: sanitizeText(request.input.messageText, 4_000),
    },
    context: sanitizeContext(request.context),
    ...(request.image === undefined ? {} : { image: request.image }),
  });
}

function sanitizeContext(context: TutorContext): TutorContext {
  return {
    gradeLabel: sanitizeText(context.gradeLabel, 20),
    releasedCurriculum: context.releasedCurriculum.map(sanitizeCurriculumItem),
    recentTurns: context.recentTurns.map(sanitizeRecentTurn),
    repeatedConceptSignal: context.repeatedConceptSignal,
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
  const redacted = value
    .replace(emailPattern, '[redacted]')
    .replace(/\b0\d{1,2}-\d{3,4}-\d{4}\b/g, '[redacted]')
    .replace(/\busers\/[A-Za-z0-9._/-]+/g, '[redacted]')
    .replace(/\bai-tutor-private\/\S+/g, '[redacted]')
    .replace(/\bhttps?:\/\/\S+/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim();
  return truncateText(redacted.length === 0 ? '[redacted]' : redacted, maxCharacters);
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
  const normalized = value.replace(/\s+/g, ' ').trim();
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
    answerText: 'AI 답변을 안전하게 완료하지 못해 선생님 확인이 필요합니다.',
  });
}
