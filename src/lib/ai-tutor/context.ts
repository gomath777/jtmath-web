import type { TutorContext } from './contracts';
import { buildCurriculum } from './context-curriculum';
import {
  buildRecentTurns,
  hasRepeatedConcept,
  repeatedConceptScanLimit,
  repeatedConceptWindowDays,
} from './context-recent-turns';
import {
  noContext,
  type AiTutorSourceResult,
  type NoContextReason,
  type ResolveTutorContextInput,
  type ResolveTutorContextResult,
} from './context-types';

export type {
  AiTutorContextCaps,
  AiTutorContextSource,
  AiTutorSourceResult,
  RecentCompletedTutorTurnsInput,
  ResolveTutorContextInput,
  ResolveTutorContextResult,
  SourceCurriculumItem,
  SourceTutorTurn,
} from './context-types';

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
