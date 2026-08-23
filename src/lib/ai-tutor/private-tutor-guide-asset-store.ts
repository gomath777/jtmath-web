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

export interface PrivateTutorGuideObjectPort {
  readPrivateObject(input: Readonly<{ readonly bucket: typeof AI_TUTOR_GUIDES_PRIVATE_BUCKET; readonly objectKey: string }>): Promise<PrivateTutorGuideObjectRead>;
}

export type { PrivateTutorGuideAssetKeys } from './tutor-guide-private-asset-keys';

export function createPrivateTutorGuideStore(options: Readonly<{
  readonly catalog: TutorGuideCatalog;
  readonly objectPort: PrivateTutorGuideObjectPort;
  readonly guideAssetHashes: ReadonlyMap<string, string>;
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
}>): TutorGuideAssetReader {
  return {
    read: async (entry, kind) => readPrivateTutorGuideAsset(options, entry, kind),
  };
}

async function readPrivateTutorGuideAsset(
  options: Readonly<{ readonly objectPort: PrivateTutorGuideObjectPort; readonly guideAssetHashes: ReadonlyMap<string, string> }>,
  entry: TutorGuideCatalogEntry,
  kind: TutorGuideAssetKind,
): Promise<TutorGuideAssetReadResult> {
  const guideSha256 = options.guideAssetHashes.get(entry.manifestKey);
  if (guideSha256 === undefined || !isSha256(guideSha256)) return { ok: false, reason: 'unsafe_path' };
  const keys = privateTutorGuideAssetKeys(entry, guideSha256);
  const objectKey = keys[kind];
  const read = await options.objectPort.readPrivateObject({ bucket: AI_TUTOR_GUIDES_PRIVATE_BUCKET, objectKey });
  if (!read.ok) return read;
  if (kind === 'guide' && sha256TutorGuideAsset(read.bytes) !== guideSha256) return { ok: false, reason: 'hash_mismatch' };
  return read;
}

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}
