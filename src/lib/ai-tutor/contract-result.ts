import { z } from 'zod';
import {
  AI_TUTOR_ERROR_TYPES,
  AI_TUTOR_ESCALATION_REASONS,
  type TutorErrorType,
  type TutorEscalationReason,
} from './contract-constants';
import { ConceptTagSchema, SubjectSlugSchema } from './contract-primitives';

export const TutorProviderResultSchema = z
  .object({
    answerText: z.string().trim().min(1).max(2000),
    confidence: z.number().min(0).max(1).finite(),
    subjectSlug: SubjectSlugSchema.nullable(),
    conceptTags: z.array(ConceptTagSchema).max(8),
    errorType: z.enum(AI_TUTOR_ERROR_TYPES).nullable(),
    needsTeacherReview: z.boolean(),
    escalationReason: z.enum(AI_TUTOR_ESCALATION_REASONS).nullable(),
  })
  .strict();

export type TutorProviderResult = {
  readonly answerText: string;
  readonly confidence: number;
  readonly subjectSlug: string | null;
  readonly conceptTags: readonly string[];
  readonly errorType: TutorErrorType | null;
  readonly needsTeacherReview: boolean;
  readonly escalationReason: TutorEscalationReason | null;
};
