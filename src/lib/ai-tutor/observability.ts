import { createHash, randomUUID } from 'node:crypto';

export type AiTutorEventClass =
  | 'config'
  | 'request'
  | 'repository'
  | 'storage'
  | 'provider';

export type AiTutorLogStatus =
  | 'accepted'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'timeout';

export type AiTutorErrorCategory =
  | 'configuration'
  | 'provider'
  | 'repository'
  | 'storage'
  | 'timeout'
  | 'unsupported'
  | 'validation'
  | 'unknown';

export type AiTutorModelAliasLabel = 'text' | 'vision' | 'none';

export type AiTutorTokenCounts = {
  readonly input: number;
  readonly output: number;
  readonly total: number;
};

export type AiTutorLogRecord = {
  readonly requestId: string;
  readonly eventClass: AiTutorEventClass;
  readonly status: AiTutorLogStatus;
  readonly externalIdHash?: string;
  readonly turnIdHash?: string;
  readonly durationMs?: number;
  readonly tokenCounts?: AiTutorTokenCounts;
  readonly modelAlias?: AiTutorModelAliasLabel;
  readonly errorCategory?: AiTutorErrorCategory;
};

export type AiTutorLogInput = {
  readonly eventClass: AiTutorEventClass;
  readonly status: AiTutorLogStatus;
  readonly externalId?: string;
  readonly turnId?: string;
  readonly durationMs?: number;
  readonly tokenCounts?: AiTutorTokenCounts;
  readonly modelAlias?: AiTutorModelAliasLabel;
  readonly errorCategory?: AiTutorErrorCategory;
  readonly error?: unknown;
};

export type AiTutorObservability = {
  readonly record: (input: AiTutorLogInput) => void;
};

export type AiTutorObservabilityOptions = {
  readonly hashSalt?: string;
  readonly requestIdFactory?: () => string;
  readonly sink?: (record: AiTutorLogRecord) => void;
};

const defaultHashSalt = 'mathgo-ai-tutor-log-v1';

export function createAiTutorObservability(
  options: AiTutorObservabilityOptions = {},
): AiTutorObservability {
  const requestIdFactory = options.requestIdFactory ?? randomUUID;
  const sink = options.sink ?? noopSink;
  const hashSalt = options.hashSalt ?? defaultHashSalt;

  return {
    record: (input) => {
      sink(toLogRecord(input, requestIdFactory(), hashSalt));
    },
  };
}

export function categorizeAiTutorError(error: unknown): AiTutorErrorCategory {
  if (hasKnownCategory(error)) {
    return error.category;
  }
  return 'unknown';
}

function toLogRecord(
  input: AiTutorLogInput,
  requestId: string,
  hashSalt: string,
): AiTutorLogRecord {
  const record: AiTutorLogRecord = {
    requestId,
    eventClass: input.eventClass,
    status: input.status,
    ...(input.externalId === undefined
      ? {}
      : { externalIdHash: hashIdentifier(input.externalId, hashSalt) }),
    ...(input.turnId === undefined
      ? {}
      : { turnIdHash: hashIdentifier(input.turnId, hashSalt) }),
    ...(input.durationMs === undefined ? {} : { durationMs: input.durationMs }),
    ...(input.tokenCounts === undefined ? {} : { tokenCounts: input.tokenCounts }),
    ...(input.modelAlias === undefined ? {} : { modelAlias: input.modelAlias }),
    ...(input.errorCategory === undefined && input.error === undefined
      ? {}
      : { errorCategory: input.errorCategory ?? categorizeAiTutorError(input.error) }),
  };
  return record;
}

function hashIdentifier(value: string, hashSalt: string): string {
  return createHash('sha256').update(hashSalt).update('\0').update(value).digest('hex');
}

function hasKnownCategory(error: unknown): error is { readonly category: AiTutorErrorCategory } {
  if (typeof error !== 'object' || error === null || !('category' in error)) {
    return false;
  }
  const category = error.category;
  switch (category) {
    case 'configuration':
    case 'provider':
    case 'repository':
    case 'storage':
    case 'timeout':
    case 'unsupported':
    case 'validation':
    case 'unknown':
      return true;
    default:
      return false;
  }
}

function noopSink(_record: AiTutorLogRecord): void {}
