export const KAKAO_REAL_SEND_FLAG = 'KAKAO_OPS_REAL_SEND_ENABLED';

export type KakaoDryRunTargetKind = 'self_chat' | 'test_room';

export type KakaoDryRunEvidence = {
  readonly status: 'ok' | 'failed';
  readonly targetKind: KakaoDryRunTargetKind;
  readonly receiptId: string;
  readonly recordedAt: string;
};

export type KakaoRealSendPolicy = {
  readonly allowRealSend: boolean;
  readonly requireDryRunReceipt: true;
  readonly reason:
    | 'enabled'
    | 'flag_disabled'
    | 'missing_dry_run_evidence';
};

export type KakaoRealSendPolicyInput = {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly dryRunEvidence?: KakaoDryRunEvidence;
  readonly now: string;
  readonly maxEvidenceAgeMinutes?: number;
};

export type KakaoSafetyPolicyErrorCode =
  | 'dry_run_failed'
  | 'invalid_dry_run_timestamp'
  | 'malformed_real_send_flag'
  | 'missing_dry_run_receipt'
  | 'stale_dry_run_evidence'
  | 'wrong_dry_run_target';

export class KakaoSafetyPolicyError extends Error {
  readonly name = 'KakaoSafetyPolicyError';

  constructor(
    readonly code: KakaoSafetyPolicyErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function createKakaoRealSendPolicy(input: KakaoRealSendPolicyInput): KakaoRealSendPolicy {
  const flag = parseRealSendFlag(input.env[KAKAO_REAL_SEND_FLAG]);
  if (!flag) {
    return { allowRealSend: false, requireDryRunReceipt: true, reason: 'flag_disabled' };
  }
  if (input.dryRunEvidence === undefined) {
    return { allowRealSend: false, requireDryRunReceipt: true, reason: 'missing_dry_run_evidence' };
  }
  assertValidDryRunEvidence({
    evidence: input.dryRunEvidence,
    now: input.now,
    maxEvidenceAgeMinutes: input.maxEvidenceAgeMinutes ?? 24 * 60,
  });
  return { allowRealSend: true, requireDryRunReceipt: true, reason: 'enabled' };
}

function parseRealSendFlag(value: string | undefined): boolean {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  throw new KakaoSafetyPolicyError('malformed_real_send_flag', 'real-send flag must be true or false');
}

function assertValidDryRunEvidence(input: {
  readonly evidence: KakaoDryRunEvidence;
  readonly now: string;
  readonly maxEvidenceAgeMinutes: number;
}): void {
  if (input.evidence.status !== 'ok') {
    throw new KakaoSafetyPolicyError('dry_run_failed', 'dry-run evidence must be successful');
  }
  if (input.evidence.targetKind !== 'self_chat' && input.evidence.targetKind !== 'test_room') {
    throw new KakaoSafetyPolicyError('wrong_dry_run_target', 'dry-run target must be self-chat or test room');
  }
  if (input.evidence.receiptId.trim() === '') {
    throw new KakaoSafetyPolicyError('missing_dry_run_receipt', 'dry-run receipt id is required');
  }
  const nowMs = Date.parse(input.now);
  const recordedAtMs = Date.parse(input.evidence.recordedAt);
  if (Number.isNaN(nowMs) || Number.isNaN(recordedAtMs)) {
    throw new KakaoSafetyPolicyError('invalid_dry_run_timestamp', 'dry-run timestamps must be parseable');
  }
  const ageMinutes = (nowMs - recordedAtMs) / 60000;
  if (ageMinutes < 0 || ageMinutes > input.maxEvidenceAgeMinutes) {
    throw new KakaoSafetyPolicyError('stale_dry_run_evidence', 'dry-run evidence is outside the allowed age');
  }
}
