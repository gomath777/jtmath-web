import type { TutorContext } from './contracts';

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

export type NoContextReason = Extract<ResolveTutorContextResult, { readonly kind: 'no_context' }>['reason'];

export const noContext: TutorContext = {
  gradeLabel: '학년 미확인',
  releasedCurriculum: [],
  recentTurns: [],
  repeatedConceptSignal: false,
};
