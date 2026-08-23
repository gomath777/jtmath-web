import 'server-only';

import type {
  WebLessonAssignmentStatus,
  WebLessonContextQueryPort,
  WebLessonSessionBlock,
} from './web-lesson-context';

export function createSupabaseWebLessonPort(
  supabase: SupabaseWebLessonClient,
): WebLessonContextQueryPort {
  return {
    loadCurriculumItemBySlug: async (slug) => {
      const errorMessage = 'web lesson source unavailable';
      const selected = selectQuery(
        supabase.from('curriculum_items'),
        'id, public_slug, title, label, curricula(subject_slug, title)',
        errorMessage,
      );
      const filtered = eqQuery(selected, 'public_slug', slug, errorMessage);
      const { data, error } = await maybeSingleQuery(filtered, errorMessage);
      if (error !== null) throw new Error(errorMessage);
      if (!data) return null;
      return parseCurriculumItemRow(data);
    },
    loadStudentToken: async (input) => {
      const errorMessage = 'web token source unavailable';
      const selected = selectQuery(
        supabase.from('student_tokens'),
        'id, profile_id, slug, is_active, portal_expires_at',
        errorMessage,
      );
      const byProfile = eqQuery(selected, 'profile_id', input.profileId, errorMessage);
      const bySlug = eqQuery(byProfile, 'slug', input.slug, errorMessage);
      const { data, error } = await maybeSingleQuery(bySlug, errorMessage);
      if (error !== null) throw new Error(errorMessage);
      if (!data) return null;
      return parseStudentTokenRow(data);
    },
    loadStudentLessonAssignments: async (input) => {
      const errorMessage = 'web assignment source unavailable';
      const selected = selectQuery(
        supabase.from('student_lesson_assignments'),
        'id, curriculum_item_id, profile_id, status, scheduled_date, released_at, variant',
        errorMessage,
      );
      const byProfile = eqQuery(selected, 'profile_id', input.profileId, errorMessage);
      const byItem = eqQuery(byProfile, 'curriculum_item_id', input.curriculumItemId, errorMessage);
      const { data, error } = await orderQuery(byItem, 'scheduled_date', { ascending: false }, errorMessage);
      if (error !== null) throw new Error(errorMessage);
      return parseArray(data, errorMessage).map(parseAssignmentRow);
    },
    loadSessionBlocks: async (input) => {
      const errorMessage = 'web block source unavailable';
      const selected = selectQuery(
        supabase.from('session_blocks'),
        'id, block_type, order_index, variant, content',
        errorMessage,
      );
      const byItem = eqQuery(selected, 'curriculum_item_id', input.curriculumItemId, errorMessage);
      const byVariant = eqQuery(byItem, 'variant', input.variant, errorMessage);
      const { data, error } = await orderQuery(byVariant, 'order_index', { ascending: true }, errorMessage);
      if (error !== null) throw new Error(errorMessage);
      return parseArray(data, errorMessage).map(parseSessionBlockRow);
    },
  };
}

export type SupabaseWebLessonClient = {
  readonly from: (table: string) => unknown;
};

type QueryResult = { readonly data: unknown; readonly error: unknown };

function parseCurriculumItemRow(value: unknown) {
  const row = record(value, 'web lesson source unavailable');
  return {
    id: requiredString(row['id'], 'web lesson source unavailable'),
    publicSlug: requiredString(row['public_slug'], 'web lesson source unavailable'),
    title: nullableString(row['title'], 'web lesson source unavailable'),
    label: nullableString(row['label'], 'web lesson source unavailable'),
    curricula: row['curricula'] === null
      ? null
      : parseCurriculumRow(row['curricula']),
  };
}

function parseCurriculumRow(value: unknown) {
  const row = record(value, 'web lesson source unavailable');
  return {
    subjectSlug: requiredString(row['subject_slug'], 'web lesson source unavailable'),
    title: nullableString(row['title'], 'web lesson source unavailable'),
  };
}

function parseStudentTokenRow(value: unknown) {
  const row = record(value, 'web token source unavailable');
  if (typeof row['is_active'] !== 'boolean') throw new Error('web token source unavailable');
  return {
    id: requiredString(row['id'], 'web token source unavailable'),
    profileId: requiredString(row['profile_id'], 'web token source unavailable'),
    slug: requiredString(row['slug'], 'web token source unavailable'),
    isActive: row['is_active'],
    portalExpiresAt: nullableString(row['portal_expires_at'], 'web token source unavailable'),
  };
}

function parseAssignmentRow(value: unknown) {
  const row = record(value, 'web assignment source unavailable');
  return {
    id: requiredString(row['id'], 'web assignment source unavailable'),
    curriculumItemId: requiredString(row['curriculum_item_id'], 'web assignment source unavailable'),
    profileId: requiredString(row['profile_id'], 'web assignment source unavailable'),
    status: parseAssignmentStatus(row['status']),
    scheduledDate: nullableString(row['scheduled_date'], 'web assignment source unavailable'),
    releasedAt: nullableString(row['released_at'], 'web assignment source unavailable'),
    variant: nullableString(row['variant'], 'web assignment source unavailable'),
  };
}

function parseSessionBlockRow(value: unknown): WebLessonSessionBlock {
  const row = record(value, 'web block source unavailable');
  return {
    id: requiredString(row['id'], 'web block source unavailable'),
    blockType: requiredString(row['block_type'], 'web block source unavailable'),
    orderIndex: requiredInteger(row['order_index'], 'web block source unavailable'),
    variant: requiredString(row['variant'], 'web block source unavailable'),
    content: record(row['content'], 'web block source unavailable'),
  };
}

function parseAssignmentStatus(value: unknown): WebLessonAssignmentStatus {
  switch (value) {
    case 'pending':
    case 'assigned':
    case 'released':
    case 'completed':
    case 'cancelled':
      return value;
    default:
      throw new Error('web assignment source unavailable');
  }
}

function parseArray(value: unknown, errorMessage: string): readonly unknown[] {
  if (value === null) return [];
  if (!Array.isArray(value)) throw new Error(errorMessage);
  return value;
}

function requiredString(value: unknown, errorMessage: string): string {
  if (typeof value !== 'string') throw new Error(errorMessage);
  return value;
}

function nullableString(value: unknown, errorMessage: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(errorMessage);
  return value;
}

function requiredInteger(value: unknown, errorMessage: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || !Number.isFinite(value)) {
    throw new Error(errorMessage);
  }
  return value;
}

function record(value: unknown, errorMessage: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(errorMessage);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function selectQuery(query: unknown, columns: string, errorMessage: string): unknown {
  const source = record(query, errorMessage);
  const method = source['select'];
  if (typeof method !== 'function') throw new Error(errorMessage);
  const selected: unknown = method.call(query, columns);
  return selected;
}

function eqQuery(query: unknown, column: string, value: string, errorMessage: string): unknown {
  const source = record(query, errorMessage);
  const method = source['eq'];
  if (typeof method !== 'function') throw new Error(errorMessage);
  const selected: unknown = method.call(query, column, value);
  return selected;
}

async function maybeSingleQuery(query: unknown, errorMessage: string): Promise<QueryResult> {
  const source = record(query, errorMessage);
  const method = source['maybeSingle'];
  if (typeof method !== 'function') throw new Error(errorMessage);
  return parseQueryResult(await method.call(query), errorMessage);
}

async function orderQuery(
  query: unknown,
  column: string,
  options: { readonly ascending: boolean },
  errorMessage: string,
): Promise<QueryResult> {
  const source = record(query, errorMessage);
  const method = source['order'];
  if (typeof method !== 'function') throw new Error(errorMessage);
  return parseQueryResult(await method.call(query, column, options), errorMessage);
}

function parseQueryResult(value: unknown, errorMessage: string): QueryResult {
  const result = record(value, errorMessage);
  if (!('data' in result) || !('error' in result)) throw new Error(errorMessage);
  return { data: result['data'], error: result['error'] };
}
