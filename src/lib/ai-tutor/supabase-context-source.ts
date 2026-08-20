import { z } from 'zod';
import type {
  AiTutorContextSource,
  AiTutorSourceResult,
  RecentCompletedTutorTurnsInput,
  SourceCurriculumItem,
  SourceTutorTurn,
} from './context';

export type SupabaseAiTutorError = {
  readonly code?: string;
  readonly message?: string;
};

export type SupabaseAiTutorQueryResult<T> = {
  readonly data: T | null;
  readonly error: SupabaseAiTutorError | null;
};

export interface SupabaseAiTutorQueryStart<T> {
  select(columns: string): SupabaseAiTutorQuery<T>;
}

export interface SupabaseAiTutorQuery<T> extends PromiseLike<SupabaseAiTutorQueryResult<T>> {
  select(columns: string): SupabaseAiTutorQuery<T>;
  eq(column: string, value: unknown): SupabaseAiTutorQuery<T>;
  in(column: string, values: readonly unknown[]): SupabaseAiTutorQuery<T>;
  not(column: string, operator: string, value: unknown): SupabaseAiTutorQuery<T>;
  is(column: string, value: unknown): SupabaseAiTutorQuery<T>;
  lte(column: string, value: unknown): SupabaseAiTutorQuery<T>;
  gte(column: string, value: unknown): SupabaseAiTutorQuery<T>;
  order(column: string, options: { readonly ascending: boolean }): SupabaseAiTutorQuery<T>;
  limit(count: number): SupabaseAiTutorQuery<T>;
  single(): PromiseLike<SupabaseAiTutorQueryResult<T>>;
}

export interface SupabaseAiTutorClient {
  from(table: string): SupabaseAiTutorQueryStart<unknown>;
}

export type SupabaseAiTutorContextSourceInput = {
  readonly supabase: SupabaseAiTutorClient;
  readonly now?: () => Date;
};

const profileGradeSchema = z.object({
  grade: z.number().int().min(1).max(3).nullable().optional(),
});

const lessonRowSchema = z.object({
  scheduled_date: z.string().nullable(),
  released_at: z.string().nullable().optional(),
  status: z.enum(['released', 'completed']),
  curriculum_item: z
    .object({
      title: z.string().nullable().optional(),
      label: z.string().nullable().optional(),
      week_number: z.number().int().nullable().optional(),
      session_number: z.number().int().nullable().optional(),
      curriculum: z
        .object({
          subject_slug: z.string().nullable().optional(),
          title: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable(),
});

const learningSetSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  subject_slug: z.string().nullable().optional(),
  chapter_order: z.number().int().nullable().optional(),
  kind: z.literal('concept'),
});

const conceptAssignmentRowSchema = z.object({
  published_at: z.string().nullable(),
  label: z.string().nullable().optional(),
  learning_set: learningSetSchema.nullable().optional(),
  learning_sets: learningSetSchema.nullable().optional(),
});

const recentTurnRowSchema = z.object({
  received_at: z.string(),
  question_text: z.string().nullable(),
  answer_text: z.string().nullable(),
  concept_tags: z.array(z.string()).nullable().optional(),
});

const missingSchemaCodes = new Set(['42P01', '42703', 'PGRST200', 'PGRST204']);
const defaultRowLimit = 40;

export function createSupabaseAiTutorContextSource(
  input: SupabaseAiTutorContextSourceInput,
): AiTutorContextSource {
  const now = input.now ?? (() => new Date());
  return {
    loadProfileGrade: async (profileId) => {
      const result = await input.supabase
        .from('profiles')
        .select('grade')
        .eq('id', profileId)
        .single();
      if (result.error) return convertError('profiles', result.error);
      const parsed = profileGradeSchema.safeParse(result.data);
      return { kind: 'ok', data: parsed.success ? parsed.data.grade ?? null : null };
    },
    loadReleasedLessonItems: async (profileId) => {
      const result = await input.supabase
        .from('student_lesson_assignments')
        .select(`
          scheduled_date, released_at, status,
          curriculum_item:curriculum_items!inner (
            title, label, week_number, session_number,
            curriculum:curricula ( subject_slug, title )
          )
        `)
        .eq('profile_id', profileId)
        .in('status', ['released', 'completed'])
        .not('released_at', 'is', null)
        .order('scheduled_date', { ascending: false })
        .limit(defaultRowLimit);
      if (result.error) return convertError('student_lesson_assignments', result.error);
      const parsed = z.array(lessonRowSchema).safeParse(result.data ?? []);
      return { kind: 'ok', data: parsed.success ? parsed.data.map(mapLessonRow) : [] };
    },
    loadPublishedConceptItems: async (profileId) => {
      const result = await input.supabase
        .from('assignments')
        .select(`
          published_at, label,
          learning_set:learning_sets!inner (
            id, title, subject_slug, chapter_order, kind
          )
        `)
        .eq('user_id', profileId)
        .not('set_id', 'is', null)
        .not('published_at', 'is', null)
        .lte('published_at', now().toISOString())
        .eq('learning_sets.kind', 'concept')
        .order('published_at', { ascending: false })
        .limit(defaultRowLimit);
      if (result.error) return convertError('assignments', result.error);
      const parsed = z.array(conceptAssignmentRowSchema).safeParse(result.data ?? []);
      return { kind: 'ok', data: parsed.success ? parsed.data.flatMap(mapConceptAssignmentRow) : [] };
    },
    loadRecentCompletedTutorTurns: async (request: RecentCompletedTutorTurnsInput) => {
      const result = await input.supabase
        .from('ai_tutor_turns')
        .select('received_at, question_text, answer_text, concept_tags')
        .eq('profile_id', request.profileId)
        .eq('status', 'completed')
        .is('raw_content_deleted_at', null)
        .gte('received_at', request.since.toISOString())
        .order('received_at', { ascending: false })
        .limit(request.limit);
      if (result.error) return convertError('ai_tutor_turns', result.error);
      const parsed = z.array(recentTurnRowSchema).safeParse(result.data ?? []);
      return { kind: 'ok', data: parsed.success ? parsed.data.map(mapRecentTurnRow) : [] };
    },
  };
}

function convertError<T>(table: string, error: SupabaseAiTutorError): AiTutorSourceResult<T> {
  if (error.code && missingSchemaCodes.has(error.code)) {
    return { kind: 'schema_missing', table };
  }
  return { kind: 'source_error', table };
}

function mapLessonRow(row: z.infer<typeof lessonRowSchema>): SourceCurriculumItem {
  const item = row.curriculum_item;
  const curriculum = item?.curriculum ?? null;
  const title = item?.title ?? item?.label ?? formatLessonFallbackTitle(item?.week_number ?? null, item?.session_number ?? null);
  const subjectSlug = curriculum?.subject_slug ?? null;
  return {
    source: 'lesson',
    subjectSlug,
    label: title,
    summary: curriculum?.title ?? '학습 페이지',
    conceptTags: [subjectSlug ?? '', title].filter(hasText),
    occurredAt: row.scheduled_date,
  };
}

function mapConceptAssignmentRow(row: z.infer<typeof conceptAssignmentRowSchema>): readonly SourceCurriculumItem[] {
  const set = row.learning_set ?? row.learning_sets ?? null;
  if (!set) return [];
  const title = set.title ?? row.label ?? '개념강의';
  return [
    {
      source: 'concept',
      subjectSlug: set.subject_slug ?? null,
      label: title,
      summary: '개념강의',
      conceptTags: [set.subject_slug ?? '', title].filter(hasText),
      occurredAt: row.published_at,
    },
  ];
}

function mapRecentTurnRow(row: z.infer<typeof recentTurnRowSchema>): SourceTutorTurn {
  return {
    receivedAt: row.received_at,
    questionText: row.question_text,
    answerText: row.answer_text,
    conceptTags: row.concept_tags ?? [],
  };
}

function formatLessonFallbackTitle(weekNumber: number | null, sessionNumber: number | null): string {
  if (weekNumber !== null && sessionNumber !== null) {
    return `${weekNumber}주차 ${sessionNumber}차시`;
  }
  return '학습 페이지';
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}
