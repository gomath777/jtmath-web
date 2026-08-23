import { createHash } from 'node:crypto';
import type { TutorGuideCatalogEntry } from './tutor-guide-catalog';
import type { TutorGuideV1 } from './tutor-guide-contract';
import type { WebTutorLevel } from './web-input';
import type { WebLessonMaterialDescriptor } from './web-lesson-context';
import type { WebTutorGuideStore, WebTutorGuideStoreTarget } from './web-tutor-guide-store';

export const CURRENT_PDF_BYTES = new TextEncoder().encode('%PDF- current worksheet');
export const CURRENT_PDF_HASH = digest(CURRENT_PDF_BYTES);

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function descriptor(level: WebTutorLevel): WebLessonMaterialDescriptor {
  return {
    materialKey: materialKey(level),
    blockId: `block-${level}`,
    sourcePath: 'content.pdf',
    sourceHash: null,
    label: level === 42 ? '레벨4-2' : '레벨4-1',
    order: level,
    sideLabel: null,
    subjectSlug: 'ds2',
    unit: '삼각함수',
    variant: 'default',
    level,
    fileName: level === 42 ? '삼각함수 레벨4-2.pdf' : '삼각함수 레벨4-1.pdf',
    url: `https://mathgo-pdfs.b-cdn.net/lv${level}.pdf`,
  };
}

export function sharedDescriptor(input: Readonly<{
  readonly materialKey: string;
  readonly subjectSlug: string;
  readonly label: string;
  readonly fileName: string;
  readonly level: WebTutorLevel;
}>): WebLessonMaterialDescriptor {
  return {
    materialKey: input.materialKey,
    blockId: `block-${input.materialKey}`,
    sourcePath: 'content.pdf',
    sourceHash: null,
    label: input.label,
    order: 1,
    sideLabel: null,
    subjectSlug: input.subjectSlug,
    unit: input.label,
    variant: 'default',
    level: input.level,
    fileName: input.fileName,
    url: `https://mathgo-pdfs.b-cdn.net/${input.materialKey}.pdf`,
  };
}

export function materialKey(level: WebTutorLevel): string {
  return `m-${level}`;
}

export function registeredGuideStore(input: Readonly<{
  readonly loadedTargets: WebTutorGuideStoreTarget[];
  readonly lessonKey: string;
  readonly level: WebTutorLevel;
  readonly problemNumber: number;
  readonly sourceHash: string;
}>): WebTutorGuideStore {
  const entry = guideEntry({
    lessonKey: input.lessonKey,
    level: input.level,
    problemNumber: input.problemNumber,
    sourceHash: input.sourceHash,
  });
  const guide = guideForEntry(entry);
  return storeForEntry(input.loadedTargets, entry, guide);
}

export function verifiedGuideStore(
  loadedTargets: WebTutorGuideStoreTarget[],
  sourceHash = CURRENT_PDF_HASH,
): WebTutorGuideStore {
  const entry = guideEntry({ lessonKey: 'ds2-trigonometry', level: 41, problemNumber: 3, sourceHash });
  return storeForEntry(loadedTargets, entry, guideForEntry(entry));
}

function storeForEntry(
  loadedTargets: WebTutorGuideStoreTarget[],
  entry: TutorGuideCatalogEntry,
  guide: TutorGuideV1,
): WebTutorGuideStore {
  return {
    isRegistered: (target) =>
      target.lessonKey === entry.target.lessonKey &&
      target.level === entry.target.level &&
      target.problemNumber === entry.target.problemNumber,
    load: async (target) => {
      loadedTargets.push(target);
      return { ok: true, entry, problemImage: PNG_BYTES, guide };
    },
  };
}

function guideEntry(input: Readonly<{
  readonly lessonKey: string;
  readonly level: WebTutorLevel;
  readonly problemNumber: number;
  readonly sourceHash: string;
}>): TutorGuideCatalogEntry {
  return {
    manifestKey: `${input.lessonKey}:${input.level}:${input.problemNumber}`,
    target: { lessonKey: input.lessonKey, level: input.level, problemNumber: input.problemNumber },
    guidePath: 'synthetic-guide.json',
    status: 'verified',
    problemAsset: {
      assetKey: 'synthetic/problem.png',
      sourceSha256: input.sourceHash,
      sha256: 'b'.repeat(64),
      dimensions: { width: 1, height: 1 },
      crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 },
    },
    solutionAsset: {
      assetKey: 'synthetic/solution.png',
      sourceSha256: input.sourceHash,
      sha256: 'd'.repeat(64),
      dimensions: { width: 1, height: 1 },
      crop: { page: 2, left: 0, top: 0, right: 1, bottom: 1 },
    },
  };
}

function guideForEntry(entry: TutorGuideCatalogEntry): TutorGuideV1 {
  return {
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
  };
}

function digest(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
