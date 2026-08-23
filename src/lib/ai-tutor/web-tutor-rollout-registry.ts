import 'server-only';

import ds2Catalog from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/catalog.json';
import ghCatalog from '../../data/ai-tutor-guides/2026-midterm-w1s2/gh/catalog.json';
import gs2Catalog from '../../data/ai-tutor-guides/2026-midterm-w1s2/gs2/catalog.json';
import mj1Catalog from '../../data/ai-tutor-guides/2026-midterm-w1s2/mj1/catalog.json';
import { WorksheetTutorManifestEntryV1Schema, type WorksheetTutorManifestEntryV1 } from './tutor-guide-contract';
import type { TutorGuideStoreTarget } from './tutor-guide-store';
import type { WebTutorMaterial } from './web-input';
import type { WebLessonMaterialDescriptor } from './web-lesson-context';

type CatalogMaterial = {
  readonly worksheetKey: string;
  readonly materialKey?: string;
  readonly fileName?: string;
};

type RuntimeCatalog = {
  readonly entries: readonly unknown[];
  readonly materials?: readonly CatalogMaterial[];
};

type RegisteredMaterial = {
  readonly subjectSlug: string;
  readonly worksheetKey: string;
  readonly materialKeys: readonly string[];
  readonly fileNames: readonly string[];
  readonly sourceHashes: readonly string[];
  readonly firstProblem: number;
  readonly lastProblem: number;
  readonly level: number;
};

type MaterialAlias = {
  readonly materialKey: string;
  readonly fileName: string;
};

export type RegisteredWebTutorMaterial = RegisteredMaterial & {
  readonly materialKey: string;
  readonly label: string;
};

const SHARED_SLUGS = new Set([
  'gs2-midterm-2026-w1s2-plane-line',
  'mj1-midterm-2026-w1s2-limit',
  'gh-midterm-2026-w1s2-conic',
]);
const SHARED_SUBJECT_BY_SLUG: Readonly<Record<string, string>> = {
  'gs2-midterm-2026-w1s2-plane-line': 'gs2',
  'mj1-midterm-2026-w1s2-limit': 'mj1',
  'gh-midterm-2026-w1s2-conic': 'gh',
};

const CATALOGS: readonly {
  readonly subjectSlug: string;
  readonly catalog: RuntimeCatalog;
  readonly materials?: readonly CatalogMaterial[];
}[] = [
  { subjectSlug: 'gs2', catalog: gs2Catalog },
  { subjectSlug: 'mj1', catalog: mj1Catalog },
  { subjectSlug: 'gh', catalog: ghCatalog },
  { subjectSlug: 'ds2', catalog: ds2Catalog },
] as const;

const GS2_LIVE_ALIASES_BY_WORKSHEET_KEY: Readonly<Record<string, MaterialAlias>> = {
  'gs2-line-level4-2': { materialKey: 'm-0-content-pdf', fileName: '평면좌표 직선의 방정식 레벨4-2.pdf' },
  'gs2-line-level1': { materialKey: 'm-1-content-pdf', fileName: '평면좌표 직선의 방정식 1단계.pdf' },
  'gs2-line-level2': { materialKey: 'm-2-content-pdf', fileName: '평면좌표 직선의 방정식 2단계.pdf' },
  'gs2-line-level3': { materialKey: 'm-3-content-pdf', fileName: '평면좌표 직선의 방정식 3단계.pdf' },
  'gs2-line-level5': { materialKey: 'm-4-content-pdf', fileName: '평면좌표 직선의 방정식 레벨5.pdf' },
  'gs2-line-allscan': { materialKey: 'm-5-content-pdf', fileName: '올 스캔 중간범위#2.pdf' },
};

const registeredMaterials = buildRegisteredMaterials();
const registeredEntries = CATALOGS.flatMap((item) => catalogEntries(item.catalog));

export function defaultWebTutorRolloutCatalogEntries(): readonly WorksheetTutorManifestEntryV1[] {
  return registeredEntries;
}

export function resolveRegisteredWebTutorMaterial(input: Readonly<{
  readonly lessonSlug: string;
  readonly descriptor: WebLessonMaterialDescriptor;
}>): RegisteredWebTutorMaterial | undefined {
  if (!isRolloutEligible(input.lessonSlug, input.descriptor)) return undefined;
  const matches = candidateMaterials(input.descriptor);
  const resolved = uniqueByPriority(matches, input.descriptor);
  if (resolved === undefined || !sameSubject(resolved, input.descriptor)) return undefined;
  return {
    ...resolved,
    materialKey: input.descriptor.materialKey,
    label: input.descriptor.label,
  };
}

export function resolveRegisteredWebTutorTarget(input: Readonly<{
  readonly lessonSlug: string;
  readonly descriptor: WebLessonMaterialDescriptor;
  readonly problemNumber: number;
}>): TutorGuideStoreTarget | undefined {
  const material = resolveRegisteredWebTutorMaterial(input);
  if (material === undefined) return undefined;
  if (input.problemNumber < material.firstProblem || input.problemNumber > material.lastProblem) return undefined;
  return {
    lessonKey: material.worksheetKey,
    level: material.level,
    problemNumber: input.problemNumber,
  };
}

export function resolveRegisteredWebTutorMaterials(input: Readonly<{
  readonly lessonSlug: string;
  readonly descriptors: readonly WebLessonMaterialDescriptor[];
}>): readonly WebTutorMaterial[] | undefined {
  if (!SHARED_SLUGS.has(input.lessonSlug) && !hasRolloutDescriptor(input.descriptors)) return undefined;
  const materials = input.descriptors.map((descriptor) => {
    const registered = resolveRegisteredWebTutorMaterial({ lessonSlug: input.lessonSlug, descriptor });
    return registered === undefined
      ? undefined
      : {
          materialKey: registered.materialKey,
          label: registered.label,
          problemRange: { first: registered.firstProblem, last: registered.lastProblem },
        };
  });
  return materials.every((material): material is WebTutorMaterial => material !== undefined)
    ? materials
    : undefined;
}

function buildRegisteredMaterials(): readonly RegisteredMaterial[] {
  return CATALOGS.flatMap((item) => {
    const entries = catalogEntries(item.catalog);
    const materials = item.materials ?? (item.catalog as RuntimeCatalog).materials ?? [];
    return materials.flatMap((material) => {
      const worksheetEntries = entries.filter((entry) => entry.target.lessonKey === material.worksheetKey);
      if (worksheetEntries.length === 0) return [];
      return [materialFromEntries({ subjectSlug: item.subjectSlug, material, entries: worksheetEntries })];
    });
  });
}

function materialFromEntries(input: Readonly<{
  readonly subjectSlug: string;
  readonly material: CatalogMaterial;
  readonly entries: readonly WorksheetTutorManifestEntryV1[];
}>): RegisteredMaterial {
  const numbers = input.entries.map((entry) => entry.target.problemNumber);
  const firstEntry = input.entries[0];
  if (firstEntry === undefined) throw new Error('empty_runtime_material');
  const alias = materialAlias(input.subjectSlug, input.material.worksheetKey);
  const materialKeys = input.material.materialKey === undefined ? [] : [input.material.materialKey];
  const fileNames = input.material.fileName === undefined ? [] : [input.material.fileName.normalize('NFC')];
  return {
    subjectSlug: input.subjectSlug,
    worksheetKey: input.material.worksheetKey,
    materialKeys: unique(alias === null ? materialKeys : [...materialKeys, alias.materialKey]),
    fileNames: unique(alias === null ? fileNames : [...fileNames, alias.fileName.normalize('NFC')]),
    sourceHashes: unique(input.entries.map((entry) => entry.problemAsset.sourceSha256)),
    firstProblem: Math.min(...numbers),
    lastProblem: Math.max(...numbers),
    level: firstEntry.target.level,
  };
}

function catalogEntries(catalog: RuntimeCatalog): readonly WorksheetTutorManifestEntryV1[] {
  return catalog.entries.map((entry) => WorksheetTutorManifestEntryV1Schema.parse(entry));
}

function materialAlias(subjectSlug: string, worksheetKey: string): MaterialAlias | null {
  if (subjectSlug !== 'gs2') return null;
  return GS2_LIVE_ALIASES_BY_WORKSHEET_KEY[worksheetKey] ?? null;
}

function isRolloutEligible(lessonSlug: string, descriptor: WebLessonMaterialDescriptor): descriptor is Extract<WebLessonMaterialDescriptor, { readonly materialKey: string }> {
  if (!('materialKey' in descriptor)) return false;
  const sharedSubject = SHARED_SUBJECT_BY_SLUG[lessonSlug];
  if (sharedSubject !== undefined) return descriptor.subjectSlug === sharedSubject;
  return descriptor.subjectSlug === 'ds2';
}

function hasRolloutDescriptor(descriptors: readonly WebLessonMaterialDescriptor[]): boolean {
  return descriptors.some((descriptor) => 'materialKey' in descriptor && descriptor.subjectSlug === 'ds2');
}

function candidateMaterials(descriptor: Extract<WebLessonMaterialDescriptor, { readonly materialKey: string }>): readonly RegisteredMaterial[] {
  const sourceHash = descriptor.sourceHash ?? '';
  const fileName = descriptor.fileName.normalize('NFC');
  return registeredMaterials.filter((material) =>
    material.subjectSlug === descriptor.subjectSlug
      && (
        material.materialKeys.includes(descriptor.materialKey)
        || (sourceHash.length > 0 && material.sourceHashes.includes(sourceHash))
        || material.fileNames.includes(fileName)
      ),
  );
}

function uniqueByPriority(
  matches: readonly RegisteredMaterial[],
  descriptor: Extract<WebLessonMaterialDescriptor, { readonly materialKey: string }>,
): RegisteredMaterial | undefined {
  const sourceHash = descriptor.sourceHash;
  if (sourceHash !== null) {
    return firstUnique(matches.filter((material) => material.sourceHashes.includes(sourceHash)));
  }
  return firstUnique(matches.filter((material) => material.materialKeys.includes(descriptor.materialKey)))
    ?? firstUnique(matches.filter((material) => material.fileNames.includes(descriptor.fileName.normalize('NFC'))));
}

function firstUnique(matches: readonly RegisteredMaterial[]): RegisteredMaterial | undefined {
  return matches.length === 1 ? matches[0] : undefined;
}

function sameSubject(material: RegisteredMaterial, descriptor: Extract<WebLessonMaterialDescriptor, { readonly materialKey: string }>): boolean {
  return material.subjectSlug === descriptor.subjectSlug;
}

function unique(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}
