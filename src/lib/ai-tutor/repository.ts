import {
  TutorProviderResultSchema,
  buildReviewResult,
  type TutorErrorType,
  type TutorEscalationReason,
  type TutorProviderResult,
  type TutorRecentTurn,
} from './contracts';

export const AI_TUTOR_TURN_STATUSES = [
  'processing',
  'completed',
  'failed',
  'expired',
  'unsupported',
] as const;

export type AiTutorTurnStatus = (typeof AI_TUTOR_TURN_STATUSES)[number];
export type AiTutorChannelType = 'dm' | 'named_space' | 'group_space' | 'unknown';
export type AiTutorAttachmentStatus = 'pending' | 'stored' | 'rejected' | 'deleted';
export type AiTutorRepositoryErrorCode =
  | 'conflict'
  | 'invalid_response'
  | 'not_found'
  | 'permission_denied'
  | 'unavailable'
  | 'unknown';

export type AiTutorRepositoryError = {
  readonly code: AiTutorRepositoryErrorCode;
  readonly operation: string;
};

export type AiTutorRepositoryResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: AiTutorRepositoryError };

export type AiTutorIdentity = {
  readonly id: string;
  readonly chatUserName: string;
  readonly profileId: string | null;
  readonly status: 'pending' | 'active' | 'revoked';
};

export type AiTutorConversation = {
  readonly id: string;
  readonly profileId: string;
  readonly channelType: AiTutorChannelType;
};

export type AiTutorTurnSnapshot = {
  readonly id: string;
  readonly status: AiTutorTurnStatus;
  readonly answerText: string | null;
  readonly confidence: number | null;
  readonly subjectSlug: string | null;
  readonly conceptTags: readonly string[];
  readonly errorTags: readonly string[];
  readonly needsTeacherReview: boolean;
  readonly escalationReason: TutorEscalationReason | null;
};

export type AiTutorClaimResult =
  | { readonly kind: 'claimed'; readonly turn: AiTutorTurnSnapshot }
  | { readonly kind: 'duplicate_completed'; readonly turnId: string; readonly answer: TutorProviderResult }
  | {
      readonly kind: 'duplicate_fallback';
      readonly turnId: string;
      readonly status: Exclude<AiTutorTurnStatus, 'completed'>;
      readonly fallback: TutorProviderResult;
    };

export type AiTutorAttachment = {
  readonly id: string;
  readonly turnId: string;
  readonly profileId: string;
  readonly status: AiTutorAttachmentStatus;
};

export type AiTutorReviewTurn = {
  readonly turnId: string;
  readonly profileId: string;
  readonly receivedAt: string;
  readonly subjectSlug: string | null;
  readonly conceptTags: readonly string[];
  readonly confidence: number | null;
  readonly escalationReason: TutorEscalationReason | null;
};

export type AiTutorRetentionCandidates = {
  readonly rawContentTurnIds: readonly string[];
  readonly imageAttachmentIds: readonly string[];
  readonly metadataTurnIds: readonly string[];
};

type IdentityLookupInput = { readonly chatUserName: string };
type PendingIdentityInput = IdentityLookupInput & {
  readonly pairingCodeHash: string;
  readonly pairingCodeExpiresAt: string;
};
type ConversationInput = {
  readonly profileId: string;
  readonly identityId: string;
  readonly chatSpaceName: string;
  readonly chatThreadName: string | null;
  readonly channelType: AiTutorChannelType;
  readonly seenAt: string;
};
type ClaimTurnInput = {
  readonly profileId: string;
  readonly conversationId: string;
  readonly inboundMessageName: string;
  readonly questionText: string;
  readonly receivedAt: string;
};
type CompletedAnswerInput = { readonly profileId: string; readonly inboundMessageName: string };
type CompleteTurnInput = {
  readonly profileId: string;
  readonly turnId: string;
  readonly result: TutorProviderResult;
  readonly provider: string;
  readonly modelAlias: string;
  readonly promptVersion: string;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly completedAt: string;
};
type FailTurnInput = {
  readonly profileId: string;
  readonly turnId: string;
  readonly errorType: TutorErrorType;
  readonly escalationReason: TutorEscalationReason;
  readonly answerText: string;
  readonly completedAt: string;
};
type RecentTurnsInput = { readonly profileId: string; readonly conversationId: string; readonly limit: number };
type ConceptRepeatInput = { readonly profileId: string; readonly conceptTags: readonly string[]; readonly since: string };
type AttachmentInput = {
  readonly profileId: string;
  readonly turnId: string;
  readonly attachmentResourceName: string;
  readonly declaredMimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly normalizedMimeType: 'image/jpeg';
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly privateStoragePath: string | null;
  readonly status: AiTutorAttachmentStatus;
};
type ReviewInput = { readonly profileId: string; readonly limit: number };
type RetentionInput = {
  readonly profileId: string;
  readonly rawContentCutoff: string;
  readonly imageCutoff: string;
  readonly metadataCutoff: string;
  readonly limit: number;
};

export interface AiTutorRepository {
  lookupIdentity(input: IdentityLookupInput): Promise<AiTutorRepositoryResult<AiTutorIdentity | null>>;
  createPendingIdentity(input: PendingIdentityInput): Promise<AiTutorRepositoryResult<AiTutorIdentity>>;
  upsertConversation(input: ConversationInput): Promise<AiTutorRepositoryResult<AiTutorConversation>>;
  claimInboundTurn(input: ClaimTurnInput): Promise<AiTutorRepositoryResult<AiTutorClaimResult>>;
  getCompletedAnswer(input: CompletedAnswerInput): Promise<AiTutorRepositoryResult<TutorProviderResult | null>>;
  markTurnCompleted(input: CompleteTurnInput): Promise<AiTutorRepositoryResult<AiTutorTurnSnapshot>>;
  markTurnFailed(input: FailTurnInput): Promise<AiTutorRepositoryResult<AiTutorTurnSnapshot>>;
  readRecentTurns(input: RecentTurnsInput): Promise<AiTutorRepositoryResult<readonly TutorRecentTurn[]>>;
  countRecentConceptRepeats(input: ConceptRepeatInput): Promise<AiTutorRepositoryResult<number>>;
  recordAttachment(input: AttachmentInput): Promise<AiTutorRepositoryResult<AiTutorAttachment>>;
  listTeacherReviewTurns(input: ReviewInput): Promise<AiTutorRepositoryResult<readonly AiTutorReviewTurn[]>>;
  listRetentionCandidates(input: RetentionInput): Promise<AiTutorRepositoryResult<AiTutorRetentionCandidates>>;
}

export function isAiTutorTurnStatus(value: unknown): value is AiTutorTurnStatus {
  return AI_TUTOR_TURN_STATUSES.some((status) => status === value);
}

export function storedAnswerFromTurn(turn: AiTutorTurnSnapshot): TutorProviderResult | null {
  if (turn.status !== 'completed' || turn.answerText === null) return null;
  return TutorProviderResultSchema.parse({
    answerText: turn.answerText,
    confidence: turn.confidence ?? 0,
    subjectSlug: turn.subjectSlug,
    conceptTags: turn.conceptTags,
    errorType: firstTutorErrorType(turn.errorTags),
    needsTeacherReview: turn.needsTeacherReview,
    escalationReason: turn.escalationReason,
  });
}

export function duplicateFallbackResult(status: Exclude<AiTutorTurnStatus, 'completed'>): TutorProviderResult {
  switch (status) {
    case 'processing':
      return buildReviewResult({
        reason: 'provider_error',
        errorType: 'provider_error',
        answerText: '같은 질문을 이미 처리 중입니다. 잠시 뒤에도 답이 보이지 않으면 선생님에게 확인을 요청할게요.',
      });
    case 'failed':
      return buildReviewResult({
        reason: 'provider_error',
        errorType: 'provider_error',
        answerText: '이 질문은 안전하게 답변하지 못해 선생님 확인이 필요합니다.',
      });
    case 'expired':
      return buildReviewResult({
        reason: 'timeout',
        errorType: 'timeout',
        answerText: '답변 시간이 초과되어 선생님 확인이 필요합니다.',
      });
    case 'unsupported':
      return buildReviewResult({
        reason: 'unsupported_attachment',
        errorType: 'unsupported_attachment',
        answerText: '지원하지 않는 첨부 형식이라 선생님 확인이 필요합니다.',
      });
  }
}

function firstTutorErrorType(tags: readonly string[]): TutorErrorType | null {
  const [first] = tags;
  switch (first) {
    case 'timeout':
    case 'provider_error':
    case 'invalid_output':
    case 'unsupported_attachment':
    case 'out_of_curriculum':
      return first;
    default:
      return null;
  }
}
