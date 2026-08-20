export type KakaoOpsJobStatus =
  | 'draft'
  | 'needs_approval'
  | 'approved'
  | 'dry_run_ok'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export type KakaoOpsApprovalState = 'none' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export type KakaoOutboundApprovalRow = {
  readonly id: string;
  readonly status: KakaoOpsJobStatus;
  readonly approvalState: KakaoOpsApprovalState;
  readonly roomMappingId: string | null;
  readonly messageBody: string | null;
  readonly idempotencyKey: string;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
};

export type ApprovedKakaoSendCandidate = {
  readonly id: string;
  readonly roomMappingId: string;
  readonly messageBody: string;
  readonly idempotencyKey: string;
};

export type ApproveOutboundRowInput = {
  readonly row: KakaoOutboundApprovalRow;
  readonly approvedBy: string;
  readonly approvedAt: string;
};

export type KakaoApprovalErrorCode =
  | 'approval_not_pending'
  | 'approval_state_mismatch'
  | 'approved_row_not_sendable'
  | 'duplicate_job_id'
  | 'invalid_approved_at'
  | 'invalid_approver_id'
  | 'invalid_job_id'
  | 'send_candidate_not_approved';

export class KakaoApprovalError extends Error {
  readonly name = 'KakaoApprovalError';

  constructor(
    readonly code: KakaoApprovalErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function approveOutboundRow(input: ApproveOutboundRowInput): KakaoOutboundApprovalRow {
  assertUuid(input.row.id, 'invalid_job_id', 'job id must be a UUID');
  assertUuid(input.approvedBy, 'invalid_approver_id', 'approver id must be a UUID');
  if (Number.isNaN(Date.parse(input.approvedAt))) {
    throw new KakaoApprovalError('invalid_approved_at', 'approved timestamp must be parseable');
  }
  if (input.row.status !== 'needs_approval' || input.row.approvalState !== 'pending') {
    throw new KakaoApprovalError('approval_not_pending', 'only pending rows can be approved');
  }
  assertApprovedSendCandidate({
    ...input.row,
    status: 'approved',
    approvalState: 'approved',
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt,
  });
  return {
    ...input.row,
    status: 'approved',
    approvalState: 'approved',
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt,
  };
}

export function selectApprovedSendCandidates(
  rows: readonly KakaoOutboundApprovalRow[],
): readonly ApprovedKakaoSendCandidate[] {
  assertUniqueJobIds(rows);
  const candidates: ApprovedKakaoSendCandidate[] = [];
  for (const row of rows) {
    if (row.status === 'approved' || row.approvalState === 'approved') {
      candidates.push(assertApprovedSendCandidate(row));
    }
  }
  return candidates;
}

export function assertApprovedSendCandidate(row: KakaoOutboundApprovalRow): ApprovedKakaoSendCandidate {
  assertUuid(row.id, 'invalid_job_id', 'job id must be a UUID');
  if (row.status !== 'approved' || row.approvalState !== 'approved') {
    throw new KakaoApprovalError('send_candidate_not_approved', 'send candidate must be approved');
  }
  if (row.status === 'approved' !== (row.approvalState === 'approved')) {
    throw new KakaoApprovalError('approval_state_mismatch', 'status and approval state disagree');
  }
  if (row.roomMappingId === null || !UUID_RE.test(row.roomMappingId) || row.messageBody?.trim() === '') {
    throw new KakaoApprovalError('approved_row_not_sendable', 'approved rows need mapping and message body');
  }
  if (row.messageBody === null) {
    throw new KakaoApprovalError('approved_row_not_sendable', 'approved rows need message body');
  }
  return {
    id: row.id,
    roomMappingId: row.roomMappingId,
    messageBody: row.messageBody,
    idempotencyKey: row.idempotencyKey,
  };
}

function assertUniqueJobIds(rows: readonly KakaoOutboundApprovalRow[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    assertUuid(row.id, 'invalid_job_id', 'job id must be a UUID');
    if (seen.has(row.id)) {
      throw new KakaoApprovalError('duplicate_job_id', 'duplicate job id in batch');
    }
    seen.add(row.id);
  }
}

function assertUuid(value: string, code: KakaoApprovalErrorCode, message: string): void {
  if (!UUID_RE.test(value)) throw new KakaoApprovalError(code, message);
}
