import { z } from 'zod';

export const WEB_TUTOR_TURN_STATUSES = ['processing', 'completed', 'failed'] as const;
export const WEB_TUTOR_MODES = ['hint', 'start', 'decisive', 'solution', 'followup', 'alternate'] as const;

const IdSchema = z.string().uuid();
const BoundedTextSchema = z.string().trim().min(1).max(4000);
const OptionalKeySchema = z.string().trim().min(1).max(160).nullable();
const KeySchema = z.string().trim().min(1).max(160);
const TimestampSchema = z.string().datetime({ offset: true });
const NonNegativeIntegerSchema = z.number().int().min(0);

export const WebConversationRowSchema = z
  .object({
    id: IdSchema,
    profile_id: IdSchema,
    assignment_id: IdSchema,
    context_key: KeySchema,
    active_material_key: OptionalKeySchema,
    active_problem_key: OptionalKeySchema,
    active_stage: OptionalKeySchema,
  })
  .strict();
export type WebConversationRow = z.infer<typeof WebConversationRowSchema>;

export const WebTurnRowSchema = z
  .object({
    id: z.string(),
    conversation_id: z.string(),
    profile_id: z.string(),
    assignment_id: z.string(),
    request_id: z.string(),
    target_material_key: z.string(),
    target_problem_key: z.string().nullable(),
    target_stage: z.string().nullable(),
    mode: z.enum(WEB_TUTOR_MODES),
    status: z.enum(WEB_TUTOR_TURN_STATUSES),
    question_text: z.string().nullable(),
    answer_text: z.string().nullable(),
    provider: z.string().nullable(),
    model_alias: z.string().nullable(),
    prompt_version: z.string().nullable(),
    input_tokens: z.number().int().min(0).nullable(),
    output_tokens: z.number().int().min(0).nullable(),
    total_tokens: z.number().int().min(0).nullable(),
    attempt_count: z.number().int().min(1).max(3),
    latency_ms: z.number().int().min(0).nullable(),
    needs_teacher_review: z.boolean(),
    error_category: z.string().nullable(),
    received_at: z.string(),
    completed_at: z.string().nullable(),
  })
  .strict();
export type WebTurnRow = z.infer<typeof WebTurnRowSchema>;

export const WebIdRowSchema = z.object({ id: z.string() }).strict();
export type WebIdRow = z.infer<typeof WebIdRowSchema>;

export const UpsertWebConversationInputSchema = z
  .object({
    profileId: IdSchema,
    assignmentId: IdSchema,
    contextKey: KeySchema,
    activeMaterialKey: OptionalKeySchema,
    activeProblemKey: OptionalKeySchema,
    activeStage: OptionalKeySchema,
    seenAt: TimestampSchema,
  })
  .strict();
export type UpsertWebConversationInput = z.input<typeof UpsertWebConversationInputSchema>;

export const ClaimWebTurnInputSchema = z
  .object({
    profileId: IdSchema,
    assignmentId: IdSchema,
    conversationId: z.string().min(1),
    requestId: KeySchema,
    questionText: BoundedTextSchema,
    targetMaterialKey: KeySchema,
    targetProblemKey: OptionalKeySchema,
    targetStage: OptionalKeySchema,
    mode: z.enum(WEB_TUTOR_MODES),
    receivedAt: TimestampSchema,
  })
  .strict();
export type ClaimWebTurnInput = z.input<typeof ClaimWebTurnInputSchema>;

export const CompleteWebTurnInputSchema = z
  .object({
    profileId: IdSchema,
    assignmentId: IdSchema,
    turnId: z.string().min(1),
    answerText: BoundedTextSchema,
    provider: KeySchema,
    modelAlias: KeySchema,
    promptVersion: KeySchema,
    inputTokens: NonNegativeIntegerSchema,
    outputTokens: NonNegativeIntegerSchema,
    totalTokens: NonNegativeIntegerSchema,
    latencyMs: NonNegativeIntegerSchema,
    completedAt: TimestampSchema,
  })
  .strict()
  .refine((input) => input.totalTokens === input.inputTokens + input.outputTokens, {
    message: 'totalTokens must equal inputTokens + outputTokens',
    path: ['totalTokens'],
  });
export type CompleteWebTurnInput = z.input<typeof CompleteWebTurnInputSchema>;

export const FailWebTurnInputSchema = z
  .object({
    profileId: IdSchema,
    assignmentId: IdSchema,
    turnId: z.string().min(1),
    errorCategory: KeySchema,
    answerText: BoundedTextSchema,
    completedAt: TimestampSchema,
  })
  .strict();
export type FailWebTurnInput = z.input<typeof FailWebTurnInputSchema>;

export const RecentWebTurnsInputSchema = z
  .object({
    profileId: IdSchema,
    assignmentId: IdSchema,
    conversationId: z.string().min(1),
    limit: z.number().int().min(1).max(20),
  })
  .strict();
export type RecentWebTurnsInput = z.input<typeof RecentWebTurnsInputSchema>;

export const WebRetentionInputSchema = z
  .object({
    profileId: IdSchema,
    rawContentCutoff: TimestampSchema,
    metadataCutoff: TimestampSchema,
    limit: z.number().int().min(1).max(500),
  })
  .strict();
export type WebRetentionInput = z.input<typeof WebRetentionInputSchema>;
