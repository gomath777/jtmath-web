import type { TutorErrorType, TutorEscalationReason } from './contract-constants';
import { TutorProviderResultSchema, type TutorProviderResult } from './contract-result';

export type TutorReviewResultInput = {
  readonly reason: TutorEscalationReason;
  readonly errorType: TutorErrorType | null;
  readonly answerText: string;
};

export function buildReviewResult(input: TutorReviewResultInput): TutorProviderResult {
  return TutorProviderResultSchema.parse({
    answerText: input.answerText,
    confidence: 0,
    subjectSlug: null,
    conceptTags: [],
    errorType: input.errorType,
    needsTeacherReview: true,
    escalationReason: input.reason,
  });
}
