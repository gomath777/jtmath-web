import 'server-only';

import {
  parseWebLessonPdfMaterials as parsePdfMaterials,
  toClientMaterial,
  type MaterialParseResult,
  type WebLessonMaterialDescriptor,
  type WebLessonSessionBlock,
} from './web-lesson-context-core';
import {
  createResolvedWebLessonContext,
  type ResolvedWebLessonContext,
  type WebLessonContextResult,
  type WebLessonMaterialAuthorizationResult,
  authorizeWebLessonMaterial,
  getWebLessonAssignment,
  getWebLessonMaterialDescriptors,
} from './web-lesson-context-access';
import {
  createContextKey,
  firstText,
  hasDuplicateLatestScheduledDate,
  isEligibleLesson,
  isExpired,
  isReleased,
  normalizeSubjectSlug,
  sortAssignmentsNewestFirst,
} from './web-lesson-context-policy';
import type {
  ResolveWebLessonContextInput,
  VerifiedWebLessonIdentity,
  WebLessonAssignment,
  WebLessonAssignmentStatus,
  WebLessonContext,
  WebLessonContextFailureReason,
  WebLessonContextQueryPort,
  WebLessonCurriculumItem,
  WebLessonStudentToken,
} from './web-lesson-context-types';

const LEGACY_CONTEXT_LEVELS = [1, 2, 3, 41, 42, 99] as const;

export function parseWebLessonPdfMaterials(blocks: readonly WebLessonSessionBlock[]): MaterialParseResult {
  const parsed = parsePdfMaterials({ blocks, subjectSlug: 'ds2', unit: 'legacy', variant: 'default' });
  if (!parsed.ok) return parsed;
  const levels = parsed.materials.map((material) => material.level);
  if (levels.some((level) => level === null) || new Set(levels).size !== levels.length) {
    return { ok: false, reason: 'duplicate_pdf' };
  }
  return LEGACY_CONTEXT_LEVELS.every((level) => levels.includes(level))
    ? parsed
    : { ok: false, reason: 'missing_pdf' };
}
export {
  authorizeWebLessonMaterial,
  getWebLessonAssignment,
  getWebLessonMaterialDescriptors,
};
export type {
  ResolvedWebLessonContext,
  ResolveWebLessonContextInput,
  VerifiedWebLessonIdentity,
  WebLessonAssignment,
  WebLessonAssignmentStatus,
  WebLessonContext,
  WebLessonContextFailureReason,
  WebLessonContextQueryPort,
  WebLessonContextResult,
  WebLessonCurriculumItem,
  WebLessonMaterialAuthorizationResult,
  WebLessonMaterialDescriptor,
  WebLessonSessionBlock,
  WebLessonStudentToken,
};

export async function resolveWebLessonContext(
  input: ResolveWebLessonContextInput,
): Promise<WebLessonContextResult> {
  const lesson = await loadOrSourceError(() => input.port.loadCurriculumItemBySlug(input.lessonSlug));
  if (lesson === sourceError) return { ok: false, reason: 'source_error' };
  if (!lesson) return { ok: false, reason: 'not_found' };

  const token = await loadOrSourceError(() =>
    input.port.loadStudentToken({
      profileId: input.identity.profileId,
      slug: input.identity.slug,
    }),
  );
  if (token === sourceError) return { ok: false, reason: 'source_error' };
  if (!token || !token.isActive) return { ok: false, reason: 'revoked_token' };
  if (token.profileId !== input.identity.profileId || token.slug !== input.identity.slug) {
    return { ok: false, reason: 'revoked_token' };
  }
  if (isExpired(token.portalExpiresAt, input.now)) return { ok: false, reason: 'expired_token' };

  if (!isEligibleLesson(lesson) || input.identity.isMaster === true) {
    return { ok: false, reason: 'wrong_lesson' };
  }

  const assignments = await loadOrSourceError(() =>
    input.port.loadStudentLessonAssignments({
      profileId: input.identity.profileId,
      curriculumItemId: lesson.id,
    }),
  );
  if (assignments === sourceError) return { ok: false, reason: 'source_error' };
  const orderedAssignments = sortAssignmentsNewestFirst(assignments);
  const selectedAssignment = orderedAssignments[0] ?? null;
  if (!selectedAssignment) return { ok: false, reason: 'unassigned' };
  if (hasDuplicateLatestScheduledDate(orderedAssignments)) {
    return { ok: false, reason: 'source_error' };
  }
  if (
    selectedAssignment.profileId !== input.identity.profileId ||
    selectedAssignment.curriculumItemId !== lesson.id
  ) {
    return { ok: false, reason: 'unassigned' };
  }
  if (!isReleased(selectedAssignment, input.now)) return { ok: false, reason: 'unreleased' };

  const variant = selectedAssignment.variant?.trim() || 'default';
  const variantBlocks = await loadOrSourceError(() =>
    input.port.loadSessionBlocks({ curriculumItemId: lesson.id, variant }),
  );
  if (variantBlocks === sourceError) return { ok: false, reason: 'source_error' };
  const blocks =
    variant !== 'default' && variantBlocks.length === 0
      ? await loadOrSourceError(() =>
          input.port.loadSessionBlocks({ curriculumItemId: lesson.id, variant: 'default' }),
        )
      : variantBlocks;
  if (blocks === sourceError) return { ok: false, reason: 'source_error' };
  const subjectSlug = normalizeSubjectSlug(lesson.curricula?.subjectSlug ?? '');
  const unit = firstText(lesson.title, lesson.label);
  const parsed = parsePdfMaterials({ blocks, subjectSlug, unit, variant });
  if (!parsed.ok) return parsed;

  return createResolvedWebLessonContext({
    context: {
      contextKey: createContextKey({ assignment: selectedAssignment, lesson, variant, materials: parsed.materials }),
      lessonSlug: lesson.publicSlug,
      subjectSlug,
      unit,
      lessonTitle: unit,
      variant,
      materials: parsed.materials.map(toClientMaterial),
    },
    materials: parsed.materials,
    assignment: selectedAssignment,
  });
}

const sourceError = Symbol('webLessonSourceError');

async function loadOrSourceError<T>(loader: () => Promise<T>): Promise<T | typeof sourceError> {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof Error) return sourceError;
    throw error;
  }
}
