import { createHash } from 'node:crypto';
import { lesson } from './web-lesson-context.test-support';
import type { TutorGuideCatalogEntry } from './tutor-guide-catalog';
import type { TutorGuideV1 } from './tutor-guide-contract';
import type { WebTutorGuideStore } from './web-tutor-guide-store';

export const GUIDE_LESSON_SLUG = 'ds2-gichul-03-b1273c';
export const guideLesson = { ...lesson, publicSlug: GUIDE_LESSON_SLUG } as const;
const syntheticPdfSourceHash = digest(new TextEncoder().encode('%PDF- synthetic'));

export function verifiedGuideStore(
  loadedTargets: unknown[],
  guideOverrides: Partial<TutorGuideV1> = {},
): WebTutorGuideStore {
  const entry: TutorGuideCatalogEntry = {
    manifestKey: 'ds2-trigonometry:41:3',
    target: { lessonKey: 'ds2-trigonometry', level: 41, problemNumber: 3 },
    guidePath: 'synthetic-guide.json',
    status: 'verified',
    problemAsset: {
      assetKey: 'synthetic/problem.png',
      sourceSha256: syntheticPdfSourceHash,
      sha256: 'b'.repeat(64),
      dimensions: { width: 1, height: 1 },
      crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 },
    },
    solutionAsset: {
      assetKey: 'synthetic/solution.png',
      sourceSha256: syntheticPdfSourceHash,
      sha256: 'd'.repeat(64),
      dimensions: { width: 1, height: 1 },
      crop: { page: 2, left: 0, top: 0, right: 1, bottom: 1 },
    },
  };
  const guide: TutorGuideV1 = {
    schemaVersion: 1,
    manifestKey: entry.manifestKey,
    target: entry.target,
    curriculum: {
      grade: 'synthetic-grade',
      subject: 'synthetic-subject',
      unit: 'synthetic-unit',
      allowedConcepts: ['synthetic-concept'],
      forbiddenMethods: ['synthetic-forbidden-method'],
    },
    officialApproach: { summary: 'synthetic official outline', steps: ['synthetic official step'] },
    hints: { concept: 'synthetic concept hint', start: 'synthetic start hint', decisive: 'synthetic decisive hint' },
    alternatives: [],
    solution: { answer: 'synthetic answer', steps: ['synthetic solution step'] },
    provenance: {
      problemSha256: entry.problemAsset.sha256,
      solutionSha256: entry.solutionAsset.sha256,
      authoringModel: 'gpt-5.6-terra',
      verifierModel: 'gpt-5.6-sol',
    },
    qa: { status: 'verified', checks: ['schema_valid'] },
    ...guideOverrides,
  };
  return {
    isRegistered: (target) => target.lessonKey === entry.target.lessonKey && target.level === entry.target.level && target.problemNumber === entry.target.problemNumber,
    load: async (target) => {
      loadedTargets.push(target);
      return { ok: true, entry, problemImage: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), guide };
    },
  };
}

function digest(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function unavailableRegisteredGuideStore(reason: 'hash_mismatch' | 'not_found'): WebTutorGuideStore {
  return {
    isRegistered: () => true,
    load: async () => ({ ok: false, reason }),
  };
}

export function unregisteredGuideStore(): WebTutorGuideStore {
  return {
    isRegistered: () => false,
    load: async () => ({ ok: false, reason: 'not_found' }),
  };
}
