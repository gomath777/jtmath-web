import {
  AI_TUTOR_ERROR_TYPES,
  AI_TUTOR_ESCALATION_REASONS,
  TutorProviderResultSchema,
  buildReviewResult,
  type TutorErrorType,
  type TutorEscalationReason,
  type TutorProviderResult,
} from './contracts';

export type GeminiGenerateContentResponse = {
  readonly text?: string;
  readonly candidates?: readonly { readonly finishReason?: string }[];
  readonly promptFeedback?: { readonly blockReason?: string };
  readonly usageMetadata?: {
    readonly promptTokenCount?: number;
    readonly candidatesTokenCount?: number;
    readonly totalTokenCount?: number;
  };
};

export const GEMINI_ERROR_TYPE_VALUES = [
  'timeout',
  'provider_error',
  'invalid_output',
  'unsupported_attachment',
  'out_of_curriculum',
] as const;
export const GEMINI_ESCALATION_VALUES = [...GEMINI_ERROR_TYPE_VALUES, 'low_confidence', 'repeated_concept', 'disallowed_method'] as const;

const errorTypeSet = new Set<string>(AI_TUTOR_ERROR_TYPES);
const escalationReasonSet = new Set<string>(AI_TUTOR_ESCALATION_REASONS);

export function parseGeminiResponse(response: GeminiGenerateContentResponse): TutorProviderResult {
  if (isSafetyBlocked(response)) return providerErrorResult();
  const text = response.text?.trim();
  if (text === undefined || text === '') return invalidOutputResult();
  const parsedText = parseTutorProviderResultText(text);
  if (parsedText !== undefined) return parsedText;
  if (!looksLikeJsonObject(text)) return plainTextProviderResult(text) ?? invalidOutputResult();
  return invalidOutputResult();
}

export function providerErrorResponse(): GeminiGenerateContentResponse {
  return { text: JSON.stringify(providerErrorResult()) };
}

export function timeoutResult(): TutorProviderResult {
  return buildReviewResult({ reason: 'timeout', errorType: 'timeout', answerText: '답변 시간이 길어졌어요. 같은 문제로 다시 물어보면 힌트부터 이어서 도와줄게요.' });
}

function parseTutorProviderResultText(text: string): TutorProviderResult | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    const strictResult = TutorProviderResultSchema.safeParse(parsed);
    if (strictResult.success) return strictResult.data;
    return recoverTutorProviderResult(parsed);
  } catch (error) {
    if (!(error instanceof SyntaxError || error instanceof Error)) return undefined;
  }
  const extracted = extractJsonObjectText(text);
  if (extracted === null || extracted === text) return undefined;
  return parseTutorProviderResultText(extracted);
}

function plainTextProviderResult(text: string): TutorProviderResult | undefined {
  const answerText = parseAnswerText(text);
  if (answerText === undefined) return undefined;
  const result = TutorProviderResultSchema.safeParse({
    answerText,
    confidence: 0.72,
    subjectSlug: null,
    conceptTags: [],
    errorType: null,
    needsTeacherReview: false,
    escalationReason: null,
  });
  return result.success ? result.data : undefined;
}

function extractJsonObjectText(text: string): string | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
  if (fenced?.[1] !== undefined && looksLikeJsonObject(fenced[1].trim())) return fenced[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) return null;
  return text.slice(firstBrace, lastBrace + 1).trim();
}

function looksLikeJsonObject(text: string): boolean {
  return text.trim().startsWith('{');
}

function recoverTutorProviderResult(value: unknown): TutorProviderResult | undefined {
  if (!isUnknownRecord(value)) return undefined;
  const answerText = parseAnswerText(value['answerText']);
  if (answerText === undefined) return undefined;
  const errorType = parseNullableEnum<TutorErrorType>(value['errorType'], errorTypeSet);
  const result = TutorProviderResultSchema.safeParse({
    answerText,
    confidence: parseConfidence(value['confidence'], errorType),
    subjectSlug: parseSubjectSlug(value['subjectSlug']),
    conceptTags: parseConceptTags(value['conceptTags']),
    errorType,
    needsTeacherReview: typeof value['needsTeacherReview'] === 'boolean' ? value['needsTeacherReview'] : errorType !== null,
    escalationReason: parseNullableEnum<TutorEscalationReason>(value['escalationReason'], escalationReasonSet),
  });
  return result.success ? result.data : undefined;
}

function parseAnswerText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 2000 ? trimmed : undefined;
}

function parseConfidence(value: unknown, errorType: TutorProviderResult['errorType']): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return errorType === null ? 0.72 : 0;
  return Math.min(1, Math.max(0, value));
}

function parseSubjectSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLocaleLowerCase('ko-KR');
  return /^[a-z0-9-]+$/.test(trimmed) && trimmed.length <= 40 ? trimmed : null;
}

function parseConceptTags(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const tag = item.trim().toLocaleLowerCase('ko-KR');
    if (tag.length === 0 || tag.length > 40 || !/^[\p{L}\p{N}_:-]+$/u.test(tag)) continue;
    tags.push(tag);
    if (tags.length >= 8) break;
  }
  return tags;
}

function parseNullableEnum<T extends string>(value: unknown, allowed: ReadonlySet<string>): T | null {
  return typeof value === 'string' && allowed.has(value) ? (value as T) : null;
}

function isUnknownRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafetyBlocked(response: GeminiGenerateContentResponse): boolean {
  const safetyReasons = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'SPII', 'BLOCKLIST']);
  return response.promptFeedback?.blockReason !== undefined || (response.candidates?.some((candidate) => safetyReasons.has(candidate.finishReason ?? '')) ?? false);
}

function providerErrorResult(): TutorProviderResult {
  return buildReviewResult({ reason: 'provider_error', errorType: 'provider_error', answerText: '답변 생성이 끊겼어요. 같은 문제로 다시 물어보면 힌트부터 이어서 도와줄게요.' });
}

function invalidOutputResult(): TutorProviderResult {
  return buildReviewResult({
    reason: 'invalid_output',
    errorType: 'invalid_output',
    answerText: '방금 답변을 정리하는 데 실패했어요. 같은 문제 번호로 다시 물어보면 힌트부터 차근히 도와줄게요.',
  });
}
