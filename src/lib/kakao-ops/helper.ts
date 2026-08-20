import {
  KakaoApprovalError,
  assertApprovedSendCandidate,
  type KakaoOutboundApprovalRow,
} from './approval';

export type KakaoHelperJob = KakaoOutboundApprovalRow & {
  readonly targetRoomLabel: string;
};

export type KakaoHelperPolicy = {
  readonly allowRealSend: boolean;
};

export type KakaoHelperTransportResult = {
  readonly ok: boolean;
  readonly receiptId: string;
  readonly sanitizedCode: 'ok' | 'transport_failed';
};

export type KakaoHelperTransport = {
  readonly transportName: 'fake' | 'openkakao';
  readonly localSend: (argv: readonly string[]) => Promise<KakaoHelperTransportResult>;
};

export type KakaoHelperJobResult = {
  readonly jobId: string;
  readonly status: 'dry_run_ok' | 'sent' | 'failed';
  readonly transport: KakaoHelperTransport['transportName'];
  readonly sanitizedCode: 'ok' | 'transport_failed';
};

export type KakaoHelperPollInput = {
  readonly helperToken: string;
  readonly limit: number;
  readonly fetcher: (request: {
    readonly method: 'GET';
    readonly path: string;
    readonly helperToken: string;
  }) => Promise<unknown>;
};

export type KakaoHelperErrorCode =
  | 'dry_run_failed'
  | 'helper_token_missing'
  | 'invalid_helper_response'
  | 'job_not_approved'
  | 'missing_dry_run_receipt'
  | 'real_send_disabled'
  | 'sender_lock_busy'
  | 'shell_command_string';

export class KakaoHelperError extends Error {
  readonly name = 'KakaoHelperError';

  constructor(
    readonly code: KakaoHelperErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export class InMemorySenderLock {
  private locked = false;

  acquire(): () => void {
    if (this.locked) throw new KakaoHelperError('sender_lock_busy', 'sender lock is already held');
    this.locked = true;
    return () => {
      this.locked = false;
    };
  }
}

export async function pollKakaoHelperJobs(input: KakaoHelperPollInput): Promise<readonly KakaoHelperJob[]> {
  if (input.helperToken.trim() === '') {
    throw new KakaoHelperError('helper_token_missing', 'helper token is required');
  }
  const response = await input.fetcher({
    method: 'GET',
    path: `/api/admin/kakao-ops/helper/jobs?limit=${input.limit}`,
    helperToken: input.helperToken,
  });
  if (!isHelperPollResponse(response)) {
    throw new KakaoHelperError('invalid_helper_response', 'helper API response shape is invalid');
  }
  return response.jobs;
}

export async function runKakaoHelperOnce(input: {
  readonly jobs: readonly KakaoHelperJob[];
  readonly policy: KakaoHelperPolicy;
  readonly lock: InMemorySenderLock;
  readonly transport: KakaoHelperTransport;
}): Promise<readonly KakaoHelperJobResult[]> {
  const release = input.lock.acquire();
  try {
    const results: KakaoHelperJobResult[] = [];
    for (const job of input.jobs) {
      results.push(await runOneJob(job, input.policy, input.transport));
    }
    return results;
  } finally {
    release();
  }
}

export function buildOpenKakaoLocalSendArgv(input: {
  readonly job: KakaoHelperJob;
  readonly mode: 'dry_run' | 'real_send';
  readonly policy: KakaoHelperPolicy;
  readonly dryRunReceipt?: KakaoHelperTransportResult;
}): readonly string[] {
  assertApprovedHelperJob(input.job);
  if (input.mode === 'real_send') {
    if (!input.policy.allowRealSend) {
      throw new KakaoHelperError('real_send_disabled', 'real send is disabled by policy');
    }
    if (input.dryRunReceipt?.ok !== true) {
      throw new KakaoHelperError('missing_dry_run_receipt', 'real send requires a successful dry-run receipt');
    }
  }
  return [
    'local-send',
    input.job.targetRoomLabel,
    input.job.messageBody ?? '',
    input.mode === 'dry_run' ? '--dry-run' : '-y',
  ];
}

export function assertOpenKakaoArgv(value: unknown): asserts value is readonly string[] {
  if (typeof value === 'string') {
    throw new KakaoHelperError('shell_command_string', 'openkakao commands must be argv arrays');
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new KakaoHelperError('invalid_helper_response', 'openkakao argv must be a string array');
  }
}

async function runOneJob(
  job: KakaoHelperJob,
  policy: KakaoHelperPolicy,
  transport: KakaoHelperTransport,
): Promise<KakaoHelperJobResult> {
  const dryRun = await transport.localSend(buildOpenKakaoLocalSendArgv({
    job,
    mode: 'dry_run',
    policy,
  }));
  if (!dryRun.ok) {
    return helperResult(job.id, 'failed', transport.transportName, 'transport_failed');
  }
  if (!policy.allowRealSend) {
    return helperResult(job.id, 'dry_run_ok', transport.transportName, 'ok');
  }
  const sent = await transport.localSend(buildOpenKakaoLocalSendArgv({
    job,
    mode: 'real_send',
    policy,
    dryRunReceipt: dryRun,
  }));
  return helperResult(job.id, sent.ok ? 'sent' : 'failed', transport.transportName, sent.sanitizedCode);
}

function assertApprovedHelperJob(job: KakaoHelperJob): void {
  try {
    assertApprovedSendCandidate(job);
  } catch (error: unknown) {
    if (error instanceof KakaoApprovalError) {
      throw new KakaoHelperError('job_not_approved', 'helper can only process approved jobs');
    }
    throw error;
  }
}

function helperResult(
  jobId: string,
  status: KakaoHelperJobResult['status'],
  transport: KakaoHelperTransport['transportName'],
  sanitizedCode: KakaoHelperJobResult['sanitizedCode'],
): KakaoHelperJobResult {
  return { jobId, status, transport, sanitizedCode };
}

function isHelperPollResponse(value: unknown): value is { readonly jobs: readonly KakaoHelperJob[] } {
  if (value === null || typeof value !== 'object') return false;
  const jobs = (value as { readonly jobs?: unknown }).jobs;
  return Array.isArray(jobs) && jobs.every(isHelperJob);
}

function isHelperJob(value: unknown): value is KakaoHelperJob {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<KakaoHelperJob>;
  return (
    typeof candidate.id === 'string'
    && typeof candidate.idempotencyKey === 'string'
    && typeof candidate.messageBody === 'string'
    && typeof candidate.roomMappingId === 'string'
    && typeof candidate.targetRoomLabel === 'string'
    && candidate.status === 'approved'
    && candidate.approvalState === 'approved'
  );
}
