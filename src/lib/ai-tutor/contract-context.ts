import { z } from 'zod';
import { TutorGuideContextSchema, type TutorGuideContext } from './tutor-guide-selector';
import { ConceptTagSchema, SubjectSlugSchema } from './contract-primitives';

const guidePromptInjectionPattern = /(?:\bignore\b.{0,120}\b(?:instruction|prompt|policy|rule)s?\b|\b(?:system|developer)\s+prompt\b|이전\s*(?:지시|명령).{0,40}무시|시스템\s*(?:지시|프롬프트))/iu;

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
    guideContext: TutorGuideContextSchema.optional(),
  })
  .strict()
  .superRefine((context, issueContext) => {
    if (context.guideContext !== undefined && hasGuidePromptInjection(context.guideContext)) {
      issueContext.addIssue({
        code: 'custom',
        path: ['guideContext'],
        message: 'Teacher-guide projection contains disallowed instruction-like content.',
      });
    }
  });

export type TutorContext = {
  readonly gradeLabel: string;
  readonly releasedCurriculum: readonly TutorCurriculumItem[];
  readonly recentTurns: readonly TutorRecentTurn[];
  readonly repeatedConceptSignal: boolean;
  readonly guideContext?: TutorGuideContext;
};

export const TutorGroundedProblemSchema = z
  .object({
    sourceLabel: z.string().trim().min(1).max(120),
    problemText: z.string().trim().min(1).max(4000),
    answerText: z.string().trim().min(1).max(2000),
    solutionText: z.string().trim().min(1).max(6000),
    hints: z
      .object({
        concept: z.string().trim().min(1).max(1000).optional(),
        start: z.string().trim().min(1).max(1000).optional(),
        decisive: z.string().trim().min(1).max(1000).optional(),
      })
      .strict(),
    allowedMethods: z.array(z.string().trim().min(1).max(80)).max(12),
    disallowedMethods: z.array(z.string().trim().min(1).max(80)).max(12),
  })
  .strict();

export type TutorGroundedProblem = {
  readonly sourceLabel: string;
  readonly problemText: string;
  readonly answerText: string;
  readonly solutionText: string;
  readonly hints: {
    readonly concept?: string;
    readonly start?: string;
    readonly decisive?: string;
  };
  readonly allowedMethods: readonly string[];
  readonly disallowedMethods: readonly string[];
};

function hasGuidePromptInjection(guideContext: TutorGuideContext): boolean {
  const solutionValues = 'solution' in guideContext
    ? [guideContext.solution.answer, ...guideContext.solution.steps]
    : [];
  const values = [
    guideContext.curriculum.grade,
    guideContext.curriculum.subject,
    guideContext.curriculum.unit,
    ...guideContext.curriculum.allowedConcepts,
    ...guideContext.curriculum.forbiddenMethods,
    guideContext.officialApproach.summary,
    ...guideContext.alternatives.flatMap((alternative) => [alternative.summary, ...alternative.prerequisites]),
    ...Object.values(guideContext.hints),
    ...solutionValues,
  ];
  return values.some((value) => guidePromptInjectionPattern.test(value));
}
