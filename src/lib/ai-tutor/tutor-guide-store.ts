import 'server-only';

import { readFile, realpath } from 'node:fs/promises';
import * as path from 'node:path';
import type { WebTutorLevel } from './web-input';
import { createTutorGuideCatalog, tutorGuideKey, type TutorGuideCatalog, type TutorGuideCatalogEntry } from './tutor-guide-catalog';
import { loadVerifiedTutorGuideRuntimeAssets, type TutorGuideAssetKind, type TutorGuideAssetReader, type VerifiedTutorGuideAssetsResult } from './tutor-guide-asset-store';

export type TutorGuideStoreTarget = Readonly<{ lessonKey: string; level: WebTutorLevel; problemNumber: number }>;
export type TutorGuideStoreResult = VerifiedTutorGuideAssetsResult | { readonly ok: false; readonly reason: 'disabled' };

export interface TutorGuideStore { load(target: TutorGuideStoreTarget): Promise<TutorGuideStoreResult>; has?(target: TutorGuideStoreTarget): boolean; }

export function createLocalTutorGuideStore(options: Readonly<{ cwd?: string; nodeEnv?: string; catalog?: TutorGuideCatalog }> = {}): TutorGuideStore {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const catalog = options.catalog ?? createTutorGuideCatalog();
  const assetRoot = path.join(cwd, 'tmp', 'ai-tutor-guide-assets');
  const reader = createLocalTutorGuideAssetReader({ cwd, assetRoot });
  return { has: (target) => catalog.has(tutorGuideKey(target.lessonKey, target.level, target.problemNumber)), load: async (target) => {
    if ((options.nodeEnv ?? process.env.NODE_ENV) === 'production') return { ok: false, reason: 'disabled' };
    const entry = catalog.get(tutorGuideKey(target.lessonKey, target.level, target.problemNumber));
    if (entry === undefined) return { ok: false, reason: 'not_found' };
    if (entry.status !== 'verified') return { ok: false, reason: 'unverified' };
    return loadVerifiedTutorGuideRuntimeAssets(entry, reader);
  } };
}

function createLocalTutorGuideAssetReader(options: Readonly<{ readonly cwd: string; readonly assetRoot: string }>): TutorGuideAssetReader {
  return {
    read: async (entry, kind) => {
      const filePath = await localAssetPath(options, entry, kind);
      if (filePath === null) return { ok: false, reason: 'unsafe_path' };
      const bytes = await readFile(filePath).catch((error: unknown) => {
        if (error instanceof Error) return null;
        throw error;
      });
      if (bytes === null) return { ok: false, reason: 'not_found' };
      return {
        ok: true,
        bytes: new Uint8Array(bytes),
        mimeType: kind === 'guide' ? 'application/json' : 'image/png',
      };
    },
  };
}

async function localAssetPath(
  options: Readonly<{ readonly cwd: string; readonly assetRoot: string }>,
  entry: TutorGuideCatalogEntry,
  kind: TutorGuideAssetKind,
): Promise<string | null> {
  switch (kind) {
    case 'problem':
      return resolveFirstContained(assetRootsForEntry(options.assetRoot, entry), entry.problemAsset.assetKey);
    case 'solution':
      return resolveFirstContained(assetRootsForEntry(options.assetRoot, entry), entry.solutionAsset.assetKey);
    case 'guide':
      return resolveFirstContained([options.cwd, ...assetRootsForEntry(options.assetRoot, entry)], entry.guidePath);
    default:
      return assertNever(kind);
  }
}

function assetRootsForEntry(assetRoot: string, entry: TutorGuideCatalogEntry): readonly string[] {
  const guidePathSegments = entry.guidePath.split('/');
  const problemsIndex = guidePathSegments.lastIndexOf('problems');
  const guideCatalogIndex = guidePathSegments.indexOf('ai-tutor-guides');
  const rolloutRoot = rolloutAssetRoot(assetRoot, entry.target.lessonKey);
  if (guideCatalogIndex === -1 || problemsIndex <= guideCatalogIndex + 1) {
    return rolloutRoot === undefined ? [assetRoot] : [assetRoot, rolloutRoot];
  }
  const worksheetKey = guidePathSegments.slice(guideCatalogIndex + 1, problemsIndex).join('/');
  return rolloutRoot === undefined
    ? [assetRoot, path.join(assetRoot, worksheetKey)]
    : [assetRoot, path.join(assetRoot, worksheetKey), rolloutRoot];
}

function rolloutAssetRoot(assetRoot: string, lessonKey: string): string | undefined {
  if (lessonKey.startsWith('gs2-')) return path.join(assetRoot, '2026-midterm-w1s2', 'gs2');
  if (lessonKey.startsWith('mj1-')) return path.join(assetRoot, '2026-midterm-w1s2', 'mj1');
  if (lessonKey.startsWith('gh-')) return path.join(assetRoot, '2026-midterm-w1s2', 'gh');
  if (lessonKey.startsWith('ds2-')) return path.join(assetRoot, '2026-midterm-w1s2', 'ds2', 'run-b');
  return undefined;
}

async function resolveFirstContained(roots: readonly string[], reference: string): Promise<string | null> {
  for (const root of roots) {
    const resolved = await resolveContained(root, reference);
    if (resolved !== null) return resolved;
  }
  return null;
}

async function resolveContained(root: string, reference: string): Promise<string | null> {
  if (path.isAbsolute(reference) || reference.includes('\\')) return null;
  const rootReal = await realpath(root).catch(() => null);
  if (rootReal === null) return null;
  const candidate = path.resolve(rootReal, reference);
  const relative = path.relative(rootReal, candidate);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  const candidateReal = await realpath(candidate).catch(() => null);
  if (candidateReal === null) return null;
  const finalRelative = path.relative(rootReal, candidateReal);
  return finalRelative !== '' && !finalRelative.startsWith('..') && !path.isAbsolute(finalRelative) ? candidateReal : null;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected tutor guide asset kind: ${String(value)}`);
}
