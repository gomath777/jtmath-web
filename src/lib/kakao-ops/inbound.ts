export const KAKAO_INBOUND_CATEGORIES = [
  'progress_report',
  'question',
  'schedule',
  'completion_report',
  'admin_attention',
  'unknown',
] as const;

export type KakaoInboundCategory = (typeof KAKAO_INBOUND_CATEGORIES)[number];
export type KakaoInboundUrgency = 'low' | 'normal' | 'high' | 'urgent';
export type KakaoInboundStatus = 'inbound_pending' | 'inbound_summarized' | 'needs_attention';

export type KakaoInboundReadMessage = {
  readonly authorRole: 'student' | 'admin' | 'unknown';
  readonly text: string;
  readonly sentAt?: string;
};

export type KakaoInboundReadSample = {
  readonly roomMappingId: string;
  readonly sourceMessageAt: string;
  readonly messages: readonly KakaoInboundReadMessage[];
};

export type KakaoInboundSummaryDraft = {
  readonly direction: 'inbound_summary';
  readonly jobKind: 'inbound_summary';
  readonly roomMappingId: string;
  readonly status: KakaoInboundStatus;
  readonly inboundCategory: KakaoInboundCategory;
  readonly urgency: KakaoInboundUrgency;
  readonly sanitizedSummary: string;
  readonly suggestedReplyParams: {
    readonly category: KakaoInboundCategory;
    readonly messageCount: number;
    readonly summaryPolicy: 'summary_only';
    readonly source: 'openkakao_ax_read';
  };
  readonly needsReply: boolean;
  readonly sourceMessageAt: string;
  readonly sourceContentHash: string;
  readonly messageHash: string;
  readonly idempotencyKey: string;
};

export type KakaoInboundJobInsert = {
  readonly room_mapping_id: string;
  readonly direction: 'inbound_summary';
  readonly job_kind: 'inbound_summary';
  readonly status: KakaoInboundStatus;
  readonly message_hash: string;
  readonly idempotency_key: string;
  readonly inbound_category: KakaoInboundCategory;
  readonly urgency: KakaoInboundUrgency;
  readonly sanitized_summary: string;
  readonly suggested_reply_params: KakaoInboundSummaryDraft['suggestedReplyParams'];
  readonly needs_reply: boolean;
  readonly source_message_at: string;
  readonly source_content_hash: string;
};

export type KakaoInboundSummaryErrorCode =
  | 'invalid_room_mapping_id'
  | 'invalid_source_message_at'
  | 'empty_messages'
  | 'empty_message_text'
  | 'raw_durable_field';

export class KakaoInboundSummaryError extends Error {
  readonly name = 'KakaoInboundSummaryError';

  constructor(
    readonly code: KakaoInboundSummaryErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RAW_DURABLE_KEYS = new Set(['raw_message', 'rawKakao', 'transcript', 'messages', 'text', 'body']);

export function buildKakaoInboundSummaryDraft(input: KakaoInboundReadSample): KakaoInboundSummaryDraft {
  assertInboundReadSample(input);
  const normalizedTexts = input.messages.map((message) => normalizeMessageText(message.text));
  const joined = normalizedTexts.join('\n');
  const category = classifyInboundMessage(joined);
  const needsReply = category === 'question' || category === 'admin_attention';
  const sourceContentHash = stableHash(`${input.roomMappingId}\n${input.sourceMessageAt}\n${joined}`);
  const draft: KakaoInboundSummaryDraft = {
    direction: 'inbound_summary',
    jobKind: 'inbound_summary',
    roomMappingId: input.roomMappingId,
    status: needsReply ? 'needs_attention' : 'inbound_pending',
    inboundCategory: category,
    urgency: inferUrgency(joined, category),
    sanitizedSummary: summaryForCategory(category),
    suggestedReplyParams: {
      category,
      messageCount: input.messages.length,
      summaryPolicy: 'summary_only',
      source: 'openkakao_ax_read',
    },
    needsReply,
    sourceMessageAt: input.sourceMessageAt,
    sourceContentHash,
    messageHash: stableHash(summaryForCategory(category)),
    idempotencyKey: `kakao-inbound:${input.roomMappingId}:${sourceContentHash}`,
  };
  assertNoDurableRawKakaoFields(draft);
  return draft;
}

export function toKakaoInboundJobInsert(draft: KakaoInboundSummaryDraft): KakaoInboundJobInsert {
  assertNoDurableRawKakaoFields(draft);
  const insert: KakaoInboundJobInsert = {
    room_mapping_id: draft.roomMappingId,
    direction: draft.direction,
    job_kind: draft.jobKind,
    status: draft.status,
    message_hash: draft.messageHash,
    idempotency_key: draft.idempotencyKey,
    inbound_category: draft.inboundCategory,
    urgency: draft.urgency,
    sanitized_summary: draft.sanitizedSummary,
    suggested_reply_params: draft.suggestedReplyParams,
    needs_reply: draft.needsReply,
    source_message_at: draft.sourceMessageAt,
    source_content_hash: draft.sourceContentHash,
  };
  assertNoDurableRawKakaoFields(insert);
  return insert;
}

export function assertNoDurableRawKakaoFields(value: unknown): void {
  visitValue(value, (key) => {
    if (RAW_DURABLE_KEYS.has(key)) {
      throw new KakaoInboundSummaryError('raw_durable_field', `durable inbound payload contains ${key}`);
    }
  });
}

function assertInboundReadSample(input: KakaoInboundReadSample): void {
  if (!UUID_RE.test(input.roomMappingId)) {
    throw new KakaoInboundSummaryError('invalid_room_mapping_id', 'room mapping id must be a UUID');
  }
  if (Number.isNaN(Date.parse(input.sourceMessageAt))) {
    throw new KakaoInboundSummaryError('invalid_source_message_at', 'source message timestamp must be parseable');
  }
  if (input.messages.length === 0) {
    throw new KakaoInboundSummaryError('empty_messages', 'inbound read sample must include at least one message');
  }
  for (const message of input.messages) {
    if (normalizeMessageText(message.text) === '') {
      throw new KakaoInboundSummaryError('empty_message_text', 'inbound message text cannot be empty');
    }
  }
}

function classifyInboundMessage(text: string): KakaoInboundCategory {
  const value = text.toLowerCase();
  if (value.includes('[fixture_question]') || value.includes('질문') || value.includes('모르')) return 'question';
  if (value.includes('[fixture_schedule]') || value.includes('일정') || value.includes('시간')) return 'schedule';
  if (value.includes('[fixture_completion]') || value.includes('완료') || value.includes('제출')) return 'completion_report';
  if (value.includes('[fixture_progress]') || value.includes('진도') || value.includes('학습')) return 'progress_report';
  if (value.includes('[fixture_attention]') || value.includes('오류') || value.includes('급')) return 'admin_attention';
  return 'unknown';
}

function inferUrgency(text: string, category: KakaoInboundCategory): KakaoInboundUrgency {
  const value = text.toLowerCase();
  if (value.includes('urgent') || value.includes('급') || value.includes('오류')) return 'high';
  if (category === 'question' || category === 'admin_attention') return 'high';
  if (category === 'unknown') return 'low';
  return 'normal';
}

function summaryForCategory(category: KakaoInboundCategory): string {
  switch (category) {
    case 'progress_report':
      return '학습 진행 상황 공유';
    case 'question':
      return '질문 또는 도움 요청';
    case 'schedule':
      return '일정 확인 또는 변경 요청';
    case 'completion_report':
      return '완료 또는 제출 보고';
    case 'admin_attention':
      return '운영자 확인 필요';
    case 'unknown':
      return '분류 대기 메시지';
  }
}

function normalizeMessageText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function visitValue(value: unknown, visitKey: (key: string) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) visitValue(item, visitKey);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    visitKey(key);
    visitValue(child, visitKey);
  }
}
