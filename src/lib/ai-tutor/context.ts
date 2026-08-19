import type { TutorContext, TutorCurriculumItem, TutorRecentTurn } from './contracts';

export type AiTutorSourceResult<T> =
  | { readonly kind: 'ok'; readonly data: T }
  | { readonly kind: 'schema_missing'; readonly table: string }
  | { readonly kind: 'source_error'; readonly table: string };

export type AiTutorContextCaps = {
  readonly recentTurnCount: number;
  readonly recentTurnCharacters: number;
  readonly recentTotalCharacters: number;
};

export type SourceCurriculumItem = {
  readonly source: 'lesson' | 'concept';
  readonly subjectSlug: string | null;
  readonly label: string | null;
  readonly summary: string | null;
  readonly conceptTags: readonly string[];
  readonly occurredAt: string | null;
  readonly [extra: string]: unknown;
};

export type SourceTutorTurn = {
  readonly receivedAt: string;
  readonly questionText: string | null;
  readonly answerText: string | null;
  readonly conceptTags: readonly string[];
};

export type RecentCompletedTutorTurnsInput = {
  readonly profileId: string;
  readonly since: Date;
  readonly limit: number;
};

export interface AiTutorContextSource {
  loadProfileGrade(profileId: string): Promise<AiTutorSourceResult<number | null>>;
  loadReleasedLessonItems(profileId: string): Promise<AiTutorSourceResult<readonly SourceCurriculumItem[]>>;
  loadPublishedConceptItems(profileId: string): Promise<AiTutorSourceResult<readonly SourceCurriculumItem[]>>;
  loadRecentCompletedTutorTurns(
    input: RecentCompletedTutorTurnsInput,
  ): Promise<AiTutorSourceResult<readonly SourceTutorTurn[]>>;
}

export type ResolveTutorContextInput = {
  readonly profileId: string;
  readonly source: AiTutorContextSource;
  readonly caps: AiTutorContextCaps;
  readonly now?: Date;
};

export type ResolveTutorContextResult =
  | { readonly kind: 'resolved'; readonly context: TutorContext }
  | { readonly kind: 'no_context'; readonly context: TutorContext; readonly reason: 'schema_missing' | 'source_error' };

type NoContextReason = Extract<ResolveTutorContextResult, { readonly kind: 'no_context' }>['reason'];

const noContext: TutorContext = {
  gradeLabel: '학년 미확인',
  releasedCurriculum: [],
  recentTurns: [],
  repeatedConceptSignal: false,
};

const maxCurriculumItems = 20;
const maxPromptRecentTurns = 6;
const repeatedConceptWindowDays = 30;
const repeatedConceptScanLimit = 40;
const urlPattern = new RegExp('\\b(?:https?:\\/\\/|www\\.)\\S+', 'giu');
const emailPattern = new RegExp('\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b', 'giu');
const phonePattern = new RegExp('\\b(?:\\+?82[-.\\s]?)?0(?:10|2|[3-6][1-5])[-.\\s]?\\d{3,4}[-.\\s]?\\d{4}\\b', 'gu');
const privatePathPattern = new RegExp('\\bai-tutor-private\\/\\S+', 'gu');
const conceptTagAllowedPattern = new RegExp('[^\\p{L}\\p{N}_:-]+', 'gu');
const subjectSlugAllowedPattern = /^[a-z0-9-]+$/;

export async function resolveTutorContext(input: ResolveTutorContextInput): Promise<ResolveTutorContextResult> {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - repeatedConceptWindowDays * 24 * 60 * 60 * 1000);
  const recentLimit = Math.max(input.caps.recentTurnCount, repeatedConceptScanLimit);
  const [grade, lessons, concepts, turns] = await Promise.all([
    input.source.loadProfileGrade(input.profileId),
    input.source.loadReleasedLessonItems(input.profileId),
    input.source.loadPublishedConceptItems(input.profileId),
    input.source.loadRecentCompletedTutorTurns({ profileId: input.profileId, since, limit: recentLimit }),
  ]);
  const failedReason = firstFailedReason([grade, lessons, concepts, turns]);
  if (failedReason) {
    return {
      kind: 'no_context',
      context: noContext,
      reason: failedReason,
    };
  }
  if (grade.kind !== 'ok' || lessons.kind !== 'ok' || concepts.kind !== 'ok' || turns.kind !== 'ok') {
    return {
      kind: 'no_context',
      context: noContext,
      reason: 'source_error',
    };
  }

  return {
    kind: 'resolved',
    context: {
      gradeLabel: formatGradeLabel(grade.data),
      releasedCurriculum: buildCurriculum([...lessons.data, ...concepts.data]),
      recentTurns: buildRecentTurns(turns.data, input.caps),
      repeatedConceptSignal: hasRepeatedConcept(turns.data, since),
    },
  };
}

export function serializeTutorContextForProvider(context: TutorContext): string {
  return JSON.stringify({
    gradeLabel: context.gradeLabel,
    releasedCurriculum: context.releasedCurriculum.map((item) => ({
      subjectSlug: item.subjectSlug,
      title: item.title,
      summary: item.summary,
      conceptTags: item.conceptTags,
    })),
    recentTurns: context.recentTurns.map((turn) => ({
      role: turn.role,
      text: turn.text,
      conceptTags: turn.conceptTags,
    })),
    repeatedConceptSignal: context.repeatedConceptSignal,
  });
}

function formatGradeLabel(grade: number | null): string {
  if (grade === 1 || grade === 2 || grade === 3) {
    return `고${grade}`;
  }
  return noContext.gradeLabel;
}

function firstFailedReason(
  results: readonly AiTutorSourceResult<unknown>[],
): NoContextReason | null {
  for (const result of results) {
    if (result.kind === 'ok') continue;
    return result.kind;
  }
  return null;
}

function buildCurriculum(items: readonly SourceCurriculumItem[]): readonly TutorCurriculumItem[] {
  const seen = new Set<string>();
  const sortedItems = [...items].sort((left, right) => timestampOf(right.occurredAt) - timestampOf(left.occurredAt));
  const curriculum: TutorCurriculumItem[] = [];
  for (const item of sortedItems) {
    const subjectSlug = normalizeSubjectSlug(item.subjectSlug);
    const title = sanitizeText(item.label, 120);
    if (!title) continue;
    const key = `${subjectSlug}:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    curriculum.push({
      subjectSlug,
      title,
      summary: sanitizeText(item.summary, 500) ?? `${title} 관련 수업`,
      conceptTags: normalizeTags(item.conceptTags).slice(0, 8),
    });
    if (curriculum.length >= maxCurriculumItems) break;
  }
  return curriculum;
}

function buildRecentTurns(
  turns: readonly SourceTutorTurn[],
  caps: AiTutorContextCaps,
): readonly TutorRecentTurn[] {
  const maxTurns = Math.min(caps.recentTurnCount, maxPromptRecentTurns);
  const sortedTurns = [...turns].sort((left, right) => timestampOf(right.receivedAt) - timestampOf(left.receivedAt));
  const recentTurns: TutorRecentTurn[] = [];
  let usedCharacters = 0;
  for (const turn of sortedTurns) {
    for (const candidate of turnToRecentCandidates(turn, caps.recentTurnCharacters)) {
      const remainingCharacters = caps.recentTotalCharacters - usedCharacters;
      if (recentTurns.length >= maxTurns || remainingCharacters <= 0) {
        return recentTurns;
      }
      const text = truncateText(candidate.text, remainingCharacters);
      if (!text) continue;
      recentTurns.push({ ...candidate, text });
      usedCharacters += text.length;
    }
  }
  return recentTurns;
}

function turnToRecentCandidates(
  turn: SourceTutorTurn,
  characterCap: number,
): readonly TutorRecentTurn[] {
  const conceptTags = normalizeTags(turn.conceptTags).slice(0, 8);
  const question = sanitizeText(turn.questionText, characterCap);
  const answer = sanitizeText(turn.answerText, characterCap);
  const candidates: TutorRecentTurn[] = [];
  if (question) {
    candidates.push({ role: 'student', text: question, conceptTags });
  }
  if (answer) {
    candidates.push({ role: 'tutor', text: answer, conceptTags });
  }
  return candidates;
}

function hasRepeatedConcept(turns: readonly SourceTutorTurn[], since: Date): boolean {
  const counts = new Map<string, number>();
  for (const turn of turns) {
    if (timestampOf(turn.receivedAt) < since.getTime()) continue;
    for (const tag of Array.from(new Set(normalizeTags(turn.conceptTags)))) {
      const nextCount = (counts.get(tag) ?? 0) + 1;
      if (nextCount >= 3) {
        return true;
      }
      counts.set(tag, nextCount);
    }
  }
  return false;
}

function normalizeTags(tags: readonly string[]): readonly string[] {
  const normalizedTags: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    normalizedTags.push(normalized);
  }
  return normalizedTags;
}

function normalizeTag(tag: string): string | null {
  const normalized = tag.normalize('NFKC').trim().toLocaleLowerCase('ko-KR').replace(new RegExp('\\s+', 'gu'), '-').replace(conceptTagAllowedPattern, '');
  return normalized.length > 0 ? truncateText(normalized, 40) : null;
}

function normalizeSubjectSlug(subjectSlug: string | null): string {
  const normalized = (subjectSlug ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
  return subjectSlugAllowedPattern.test(normalized) ? truncateText(normalized, 40) : 'unknown';
}

function sanitizeText(value: string | null, maxLength: number): string | null {
  if (value === null) return null;
  const sanitized = value
    .replace(urlPattern, '[redacted-url]')
    .replace(emailPattern, '[redacted-email]')
    .replace(phonePattern, '[redacted-contact]')
    .replace(privatePathPattern, '[redacted-private-path]')
    .replace(new RegExp('[\\u0000-\\u001f\\u007f]+', 'gu'), ' ')
    .trim();
  return sanitized.length > 0 ? truncateText(sanitized, maxLength) : null;
}

function truncateText(value: string, maxLength: number): string {
  return Array.from(value).slice(0, Math.max(0, maxLength)).join('');
}

function timestampOf(iso: string | null): number {
  if (iso === null) return 0;
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : 0;
}
