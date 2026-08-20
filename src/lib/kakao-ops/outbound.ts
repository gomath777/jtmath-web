import { normalizeKakaoDisplayName, type KakaoContactRole } from './mapping';

export type KakaoOutboundJobKind = 'progress' | 'custom';
export type KakaoOutboundStatus = 'needs_approval';
export type KakaoOutboundApprovalState = 'pending';
export type KakaoOutboundVerificationStatus = 'unverified' | 'dry_run_ok' | 'verified' | 'blocked' | 'retired';

export type KakaoOutboundRecipientMapping = {
  readonly id: string;
  readonly profileId: string;
  readonly contactRole: KakaoContactRole;
  readonly displayNameNormalized: string;
  readonly verificationStatus: KakaoOutboundVerificationStatus;
  readonly isActive: boolean;
};

export type OperatorOutboundRow = {
  readonly rowNumber: number;
  readonly recipientLabel: string;
  readonly recipientLabelNormalized: string;
  readonly messageBody: string;
};

export type KakaoOutboundJobDraft = {
  readonly direction: 'outbound';
  readonly jobKind: KakaoOutboundJobKind;
  readonly status: KakaoOutboundStatus;
  readonly approvalState: KakaoOutboundApprovalState;
  readonly roomMappingId: string;
  readonly profileId: string;
  readonly messageBody: string;
  readonly messageHash: string;
  readonly idempotencyKey: string;
  readonly sourceKind: 'operator_batch' | 'progress_schedule';
  readonly sourceKey: string;
};

export type BuildOutboundJobInput = {
  readonly mapping: KakaoOutboundRecipientMapping;
  readonly messageBody: string;
  readonly jobKind: KakaoOutboundJobKind;
  readonly sourceKind: KakaoOutboundJobDraft['sourceKind'];
  readonly sourceKey: string;
};

export type BuildOperatorBatchInput = {
  readonly batchText: string;
  readonly mappings: readonly KakaoOutboundRecipientMapping[];
  readonly sourceKey: string;
};

export type KakaoOutboundJobErrorCode =
  | 'ambiguous_recipient'
  | 'duplicate_batch_recipient'
  | 'empty_batch'
  | 'empty_message_body'
  | 'empty_recipient_label'
  | 'invalid_mapping_id'
  | 'invalid_profile_id'
  | 'malformed_batch_row'
  | 'mapping_not_send_ready'
  | 'non_student_mapping'
  | 'send_state_not_allowed'
  | 'unmapped_recipient';

export class KakaoOutboundJobError extends Error {
  readonly name = 'KakaoOutboundJobError';

  constructor(
    readonly code: KakaoOutboundJobErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEND_READY_STATUSES = new Set<KakaoOutboundVerificationStatus>(['dry_run_ok', 'verified']);

export function parseOperatorOutboundRows(batchText: string): readonly OperatorOutboundRow[] {
  const rows: OperatorOutboundRow[] = [];
  for (const [index, rawLine] of batchText.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (line === '') continue;
    const match = /^(.*?)\s*-\s*(.*)$/.exec(line);
    if (match === null) {
      throw new KakaoOutboundJobError('malformed_batch_row', `row ${index + 1} must use recipient - message`);
    }
    const recipientLabel = match[1]?.trim() ?? '';
    const messageBody = match[2]?.trim() ?? '';
    if (recipientLabel === '') {
      throw new KakaoOutboundJobError('empty_recipient_label', `row ${index + 1} recipient is empty`);
    }
    if (messageBody === '') {
      throw new KakaoOutboundJobError('empty_message_body', `row ${index + 1} message body is empty`);
    }
    rows.push({
      rowNumber: index + 1,
      recipientLabel,
      recipientLabelNormalized: normalizeKakaoDisplayName(recipientLabel),
      messageBody,
    });
  }
  if (rows.length === 0) throw new KakaoOutboundJobError('empty_batch', 'operator batch is empty');
  assertNoDuplicateRows(rows);
  return rows;
}

export function buildOutboundJobDraft(input: BuildOutboundJobInput): KakaoOutboundJobDraft {
  assertSendReadyMapping(input.mapping);
  const messageBody = input.messageBody.trim();
  if (messageBody === '') throw new KakaoOutboundJobError('empty_message_body', 'message body is required');
  const messageHash = stableHash(messageBody);
  const draft: KakaoOutboundJobDraft = {
    direction: 'outbound',
    jobKind: input.jobKind,
    status: 'needs_approval',
    approvalState: 'pending',
    roomMappingId: input.mapping.id,
    profileId: input.mapping.profileId,
    messageBody,
    messageHash,
    idempotencyKey: `kakao-outbound:${input.sourceKind}:${input.sourceKey}:${input.mapping.id}:${messageHash}`,
    sourceKind: input.sourceKind,
    sourceKey: input.sourceKey,
  };
  assertApprovalRequiredOutboundState(draft);
  return draft;
}

export function buildOutboundJobsFromOperatorBatch(input: BuildOperatorBatchInput): readonly KakaoOutboundJobDraft[] {
  return parseOperatorOutboundRows(input.batchText).map((row) => buildOutboundJobDraft({
    mapping: resolveRecipientMapping(input.mappings, row.recipientLabelNormalized),
    messageBody: row.messageBody,
    jobKind: 'custom',
    sourceKind: 'operator_batch',
    sourceKey: `${input.sourceKey}:row-${row.rowNumber}`,
  }));
}

export function assertApprovalRequiredOutboundState(value: {
  readonly status: string;
  readonly approvalState: string;
}): void {
  if (value.status !== 'needs_approval' || value.approvalState !== 'pending') {
    throw new KakaoOutboundJobError('send_state_not_allowed', 'outbound job drafts must require approval');
  }
}

function resolveRecipientMapping(
  mappings: readonly KakaoOutboundRecipientMapping[],
  recipientLabelNormalized: string,
): KakaoOutboundRecipientMapping {
  const matches = mappings.filter((mapping) => mapping.displayNameNormalized === recipientLabelNormalized);
  if (matches.length === 0) throw new KakaoOutboundJobError('unmapped_recipient', 'no exact recipient mapping');
  if (matches.length > 1) throw new KakaoOutboundJobError('ambiguous_recipient', 'multiple exact recipient mappings');
  return matches[0] ?? unreachableMapping();
}

function assertSendReadyMapping(mapping: KakaoOutboundRecipientMapping): void {
  if (!UUID_RE.test(mapping.id)) throw new KakaoOutboundJobError('invalid_mapping_id', 'mapping id must be a UUID');
  if (!UUID_RE.test(mapping.profileId)) throw new KakaoOutboundJobError('invalid_profile_id', 'profile id must be a UUID');
  if (mapping.contactRole !== 'student') {
    throw new KakaoOutboundJobError('non_student_mapping', 'only student mappings are sendable in v1');
  }
  if (!mapping.isActive || !SEND_READY_STATUSES.has(mapping.verificationStatus)) {
    throw new KakaoOutboundJobError('mapping_not_send_ready', 'mapping must be active and dry-run verified');
  }
}

function assertNoDuplicateRows(rows: readonly OperatorOutboundRow[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.recipientLabelNormalized)) {
      throw new KakaoOutboundJobError('duplicate_batch_recipient', 'duplicate recipient in operator batch');
    }
    seen.add(row.recipientLabelNormalized);
  }
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function unreachableMapping(): KakaoOutboundRecipientMapping {
  throw new KakaoOutboundJobError('unmapped_recipient', 'mapping result unexpectedly empty');
}
