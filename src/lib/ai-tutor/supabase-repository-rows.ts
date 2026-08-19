import { z } from 'zod';
import type {
  AiTutorAttachment,
  AiTutorConversation,
  AiTutorIdentity,
  AiTutorReviewTurn,
  AiTutorTurnSnapshot,
} from './repository';
import type { TutorRecentTurn } from './contracts';

export const IdentityRow = z.object({
  id: z.string(),
  chat_user_name: z.string(),
  profile_id: z.string().nullable(),
  status: z.enum(['pending', 'active', 'revoked']),
});

export const ConversationRow = z.object({
  id: z.string(),
  profile_id: z.string(),
  channel_type: z.enum(['dm', 'named_space', 'group_space', 'unknown']),
});

export const TurnRow = z.object({
  id: z.string(),
  status: z.enum(['processing', 'completed', 'failed', 'expired', 'unsupported']),
  answer_text: z.string().nullable(),
  confidence: z.number().nullable(),
  subject_slug: z.string().nullable(),
  concept_tags: z.array(z.string()),
  error_tags: z.array(z.string()),
  needs_teacher_review: z.boolean(),
  escalation_reason: z
    .enum([
      'low_confidence',
      'timeout',
      'provider_error',
      'invalid_output',
      'unsupported_attachment',
      'out_of_curriculum',
      'repeated_concept',
    ])
    .nullable(),
});

export const AttachmentRow = z.object({
  id: z.string(),
  turn_id: z.string(),
  profile_id: z.string(),
  status: z.enum(['pending', 'stored', 'rejected', 'deleted']),
});

export const ReviewRow = z.object({
  id: z.string(),
  profile_id: z.string(),
  received_at: z.string(),
  subject_slug: z.string().nullable(),
  concept_tags: z.array(z.string()),
  confidence: z.number().nullable(),
  escalation_reason: TurnRow.shape.escalation_reason,
});

export const RecentTurnRow = z.object({
  question_text: z.string().nullable(),
  answer_text: z.string().nullable(),
  concept_tags: z.array(z.string()),
});

export const IdRow = z.object({ id: z.string() });

export const turnColumns =
  'id, status, answer_text, confidence, subject_slug, concept_tags, error_tags, needs_teacher_review, escalation_reason';

export function toIdentity(row: z.infer<typeof IdentityRow>): AiTutorIdentity {
  return { id: row.id, chatUserName: row.chat_user_name, profileId: row.profile_id, status: row.status };
}

export function toConversation(row: z.infer<typeof ConversationRow>): AiTutorConversation {
  return { id: row.id, profileId: row.profile_id, channelType: row.channel_type };
}

export function toTurn(row: z.infer<typeof TurnRow>): AiTutorTurnSnapshot {
  return {
    id: row.id,
    status: row.status,
    answerText: row.answer_text,
    confidence: row.confidence,
    subjectSlug: row.subject_slug,
    conceptTags: row.concept_tags,
    errorTags: row.error_tags,
    needsTeacherReview: row.needs_teacher_review,
    escalationReason: row.escalation_reason,
  };
}

export function toAttachment(row: z.infer<typeof AttachmentRow>): AiTutorAttachment {
  return { id: row.id, turnId: row.turn_id, profileId: row.profile_id, status: row.status };
}

export function toRecentTurns(rows: readonly z.infer<typeof RecentTurnRow>[]): readonly TutorRecentTurn[] {
  return rows.flatMap((row) => [
    ...(row.question_text === null ? [] : [{ role: 'student' as const, text: row.question_text, conceptTags: row.concept_tags }]),
    ...(row.answer_text === null ? [] : [{ role: 'tutor' as const, text: row.answer_text, conceptTags: row.concept_tags }]),
  ]);
}

export function toReviewTurns(rows: readonly z.infer<typeof ReviewRow>[]): readonly AiTutorReviewTurn[] {
  return rows.map((row) => ({
    turnId: row.id,
    profileId: row.profile_id,
    receivedAt: row.received_at,
    subjectSlug: row.subject_slug,
    conceptTags: row.concept_tags,
    confidence: row.confidence,
    escalationReason: row.escalation_reason,
  }));
}
