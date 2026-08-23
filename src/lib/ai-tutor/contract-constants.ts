export const AI_TUTOR_ESCALATION_REASONS = [
  'low_confidence',
  'timeout',
  'provider_error',
  'invalid_output',
  'unsupported_attachment',
  'out_of_curriculum',
  'repeated_concept',
  'disallowed_method',
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
