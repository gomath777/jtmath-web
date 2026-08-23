import 'server-only';

import { createHash } from 'node:crypto';

import type { WebLessonMaterialDescriptor } from './web-lesson-context-core';
import type {
  WebLessonAssignment,
  WebLessonCurriculumItem,
} from './web-lesson-context-types';

const ELIGIBLE_SUBJECTS = new Set(['gs2', 'mj1', 'gh', 'ds2']);
const SHARED_PAGE_SLUGS = new Set([
  'gs2-midterm-2026-w1s2-plane-line',
  'mj1-midterm-2026-w1s2-limit',
  'gh-midterm-2026-w1s2-conic',
]);

export function isEligibleLesson(lesson: WebLessonCurriculumItem): boolean {
  const subjectSlug = lesson.curricula?.subjectSlug ?? '';
  if (!ELIGIBLE_SUBJECTS.has(subjectSlug)) return false;
  return subjectSlug === 'ds2' || SHARED_PAGE_SLUGS.has(lesson.publicSlug);
}

export function firstText(...values: readonly (string | null)[]): string {
  for (const value of values) {
    if (value && value.trim().length > 0) return value;
  }
  return '';
}

export function isExpired(expiresAt: string | null, now: Date): boolean {
  if (expiresAt === null) return false;
  const time = Date.parse(expiresAt);
  return Number.isNaN(time) || time <= now.getTime();
}

export function isReleased(assignment: WebLessonAssignment, now: Date): boolean {
  if (assignment.status !== 'released' && assignment.status !== 'completed') return false;
  if (!assignment.releasedAt) return false;
  const releasedAt = Date.parse(assignment.releasedAt);
  return !Number.isNaN(releasedAt) && releasedAt <= now.getTime();
}

export function sortAssignmentsNewestFirst(
  assignments: readonly WebLessonAssignment[],
): readonly WebLessonAssignment[] {
  return [...assignments].sort((left, right) =>
    compareNullableDateDesc(left.scheduledDate, right.scheduledDate),
  );
}

export function hasDuplicateLatestScheduledDate(assignments: readonly WebLessonAssignment[]): boolean {
  const latest = assignments[0]?.scheduledDate ?? null;
  return latest !== null && assignments.filter((assignment) => assignment.scheduledDate === latest).length > 1;
}

export function normalizeSubjectSlug(subjectSlug: string): 'gs2' | 'mj1' | 'gh' | 'ds2' {
  switch (subjectSlug) {
    case 'gs2':
    case 'mj1':
    case 'gh':
    case 'ds2':
      return subjectSlug;
    default:
      return 'ds2';
  }
}

export function createContextKey(input: {
  readonly assignment: WebLessonAssignment;
  readonly lesson: WebLessonCurriculumItem;
  readonly variant: string;
  readonly materials: readonly WebLessonMaterialDescriptor[];
}): string {
  const materialSet = input.materials.map((material) => {
    if ('materialKey' in material) {
      return [material.materialKey, material.blockId, material.sourcePath, material.fileName, material.url, material.sourceHash];
    }
    return [material.level, material.fileName, material.url];
  });
  return `ctx_${createHash('sha256').update(JSON.stringify([input.assignment.id, input.lesson.id, input.variant, materialSet])).digest('base64url')}`;
}

function compareNullableDateDesc(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right.localeCompare(left);
}
