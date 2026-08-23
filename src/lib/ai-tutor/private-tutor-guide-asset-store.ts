import 'server-only';

import type { TutorGuideCatalog, TutorGuideCatalogEntry } from './tutor-guide-catalog';
import { tutorGuideKey } from './tutor-guide-catalog';
import { AI_TUTOR_GUIDES_PRIVATE_BUCKET, privateTutorGuideAssetKeys } from './tutor-guide-private-asset-keys';
import {
  loadVerifiedTutorGuideRuntimeAssets,
  sha256TutorGuideAsset,
  type TutorGuideAssetKind,
  type TutorGuideAssetReadResult,
  type TutorGuideAssetReader,
} from './tutor-guide-asset-store';
import type { TutorGuideStore, TutorGuideStoreTarget } from './tutor-guide-store';

export { AI_TUTOR_GUIDES_PRIVATE_BUCKET, privateTutorGuideAssetKeys } from './tutor-guide-private-asset-keys';

export type PrivateTutorGuideObjectRead =
  | { readonly ok: true; readonly bytes: Uint8Array; readonly mimeType: string }
  | { readonly ok: false; readonly reason: 'not_found' };

const DEFAULT_PRIVATE_GUIDE_ASSET_READ_DEADLINE_MS = 3_000;
const PRIVATE_GUIDE_ASSET_READ_ATTEMPTS = 2;

export interface PrivateTutorGuideObjectPort {
  readPrivateObject(input: Readonly<{ readonly bucket: typeof AI_TUTOR_GUIDES_PRIVATE_BUCKET; readonly objectKey: string }>): Promise<PrivateTutorGuideObjectRead>;
}

export type { PrivateTutorGuideAssetKeys } from './tutor-guide-private-asset-keys';

export function createPrivateTutorGuideStore(options: Readonly<{
  readonly catalog: TutorGuideCatalog;
  readonly objectPort: PrivateTutorGuideObjectPort;
  readonly guideAssetHashes: ReadonlyMap<string, string>;
  readonly assetReadDeadlineMs?: number;
}>): TutorGuideStore {
  const reader = createPrivateTutorGuideAssetReader(options);
  return {
    has: (target) => options.catalog.has(tutorGuideKey(target.lessonKey, target.level, target.problemNumber)),
    load: async (target) => {
      const entry = options.catalog.get(tutorGuideKey(target.lessonKey, target.level, target.problemNumber));
      if (entry === undefined) return { ok: false, reason: 'not_found' };
      return loadVerifiedTutorGuideRuntimeAssets(entry, reader);
    },
  };
}

export function createPrivateTutorGuideAssetReader(options: Readonly<{
  readonly objectPort: PrivateTutorGuideObjectPort;
  readonly guideAssetHashes: ReadonlyMap<string, string>;
  readonly assetReadDeadlineMs?: number;
}>): TutorGuideAssetReader {
  return {
    read: async (entry, kind) => readPrivateTutorGuideAsset(options, entry, kind),
  };
}

async function readPrivateTutorGuideAsset(
  options: Readonly<{
    readonly objectPort: PrivateTutorGuideObjectPort;
    readonly guideAssetHashes: ReadonlyMap<string, string>;
    readonly assetReadDeadlineMs?: number;
  }>,
  entry: TutorGuideCatalogEntry,
  kind: TutorGuideAssetKind,
): Promise<TutorGuideAssetReadResult> {
  const guideSha256 = options.guideAssetHashes.get(entry.manifestKey);
  if (guideSha256 === undefined || !isSha256(guideSha256)) return { ok: false, reason: 'unsafe_path' };
  const keys = privateTutorGuideAssetKeys(entry, guideSha256);
  const objectKey = keys[kind];
  const read = await readPrivateObjectWithRetry({
    objectPort: options.objectPort,
    objectKey,
    deadlineMs: options.assetReadDeadlineMs ?? DEFAULT_PRIVATE_GUIDE_ASSET_READ_DEADLINE_MS,
  });
  if (!read.ok) return read;
  if (kind === 'guide' && sha256TutorGuideAsset(read.bytes) !== guideSha256) return { ok: false, reason: 'hash_mismatch' };
  return read;
}

async function readPrivateObjectWithRetry(input: Readonly<{
  readonly objectPort: PrivateTutorGuideObjectPort;
  readonly objectKey: string;
  readonly deadlineMs: number;
}>): Promise<PrivateTutorGuideObjectRead> {
  let result: PrivateTutorGuideObjectRead = { ok: false, reason: 'not_found' };
  for (let attempt = 0; attempt < PRIVATE_GUIDE_ASSET_READ_ATTEMPTS; attempt += 1) {
    result = await readPrivateObjectWithinDeadline(input);
    if (result.ok) return result;
  }
  return result;
}

async function readPrivateObjectWithinDeadline(input: Readonly<{
  readonly objectPort: PrivateTutorGuideObjectPort;
  readonly objectKey: string;
  readonly deadlineMs: number;
}>): Promise<PrivateTutorGuideObjectRead> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      input.objectPort.readPrivateObject({ bucket: AI_TUTOR_GUIDES_PRIVATE_BUCKET, objectKey: input.objectKey }),
      new Promise<PrivateTutorGuideObjectRead>((resolve) => {
        timeout = setTimeout(() => resolve({ ok: false, reason: 'not_found' }), input.deadlineMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}
