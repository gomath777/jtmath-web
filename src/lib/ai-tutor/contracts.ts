import { z } from 'zod';

export const AI_TUTOR_ESCALATION_REASONS = [
  'low_confidence',
  'timeout',
  'provider_error',
  'invalid_output',
  'unsupported_attachment',
  'out_of_curriculum',
  'repeated_concept',
] as const;

export type TutorEscalationReason = (typeof AI_TUTOR_ESCALATION_REASONS)[number];

export const AI_TUTOR_ERROR_TYPES = [
  'timeout',
  'provider_error',
  'invalid_output',
  'unsupported_attachment',
  'out_of_curriculum',
] as const;

export type TutorErrorType = (typeof AI_TUTOR_ERROR_TYPES)[number];

export const AI_TUTOR_OUTPUT_FIELDS = [
  'answerText',
  'confidence',
  'subjectSlug',
  'conceptTags',
  'errorType',
  'needsTeacherReview',
  'escalationReason',
] as const;

const ConceptTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(new RegExp('^[\\p{L}\\p{N}_:-]+$', 'u'))
  .transform((value) => value.toLocaleLowerCase('ko-KR'));

const SubjectSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9-]+$/);

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

export const TutorTextInputSchema = z
  .object({
    kind: z.literal('text'),
    messageText: z.string().trim().min(1).max(4000),
  })
  .strict();

export type TutorTextInput = Readonly<z.infer<typeof TutorTextInputSchema>>;

export const TutorCurriculumItemSchema = z
  .object({
    subjectSlug: SubjectSlugSchema,
    conceptTags: z.array(ConceptTagSchema).max(8),
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(500),
  })
  .strict();

export type TutorCurriculumItem = {
  readonly subjectSlug: string;
  readonly conceptTags: readonly string[];
  readonly title: string;
  readonly summary: string;
};

export const TutorRecentTurnSchema = z
  .object({
    role: z.enum(['student', 'tutor']),
    text: z.string().trim().min(1).max(1000),
    conceptTags: z.array(ConceptTagSchema).max(8),
  })
  .strict();

export type TutorRecentTurn = {
  readonly role: 'student' | 'tutor';
  readonly text: string;
  readonly conceptTags: readonly string[];
};

export const TutorContextSchema = z
  .object({
    gradeLabel: z.string().trim().min(1).max(20),
    releasedCurriculum: z.array(TutorCurriculumItemSchema).max(20),
    recentTurns: z.array(TutorRecentTurnSchema).max(6),
    repeatedConceptSignal: z.boolean(),
  })
  .strict();

export type TutorContext = {
  readonly gradeLabel: string;
  readonly releasedCurriculum: readonly TutorCurriculumItem[];
  readonly recentTurns: readonly TutorRecentTurn[];
  readonly repeatedConceptSignal: boolean;
};

export const TutorImageInputSchema = z
  .object({
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    bytes: z.instanceof(Uint8Array),
    sha256Hex: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type TutorImageInput = Readonly<z.infer<typeof TutorImageInputSchema>>;

export const TutorProviderRequestSchema = z
  .object({
    input: TutorTextInputSchema,
    context: TutorContextSchema,
    image: TutorImageInputSchema.optional(),
  })
  .strict();

export type TutorProviderRequest = {
  readonly input: TutorTextInput;
  readonly context: TutorContext;
  readonly image?: TutorImageInput;
};

export interface TutorProvider {
  answer(request: TutorProviderRequest): Promise<TutorProviderResult>;
}

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
