import 'server-only';

import type { TutorGuideCatalogEntry } from './tutor-guide-catalog';
import { TutorGuideV1Schema, type TutorGuideV1 } from './tutor-guide-contract';
import { MAX_TUTOR_GUIDE_IMAGE_BYTES, MAX_TUTOR_GUIDE_JSON_BYTES, sha256TutorGuideAsset } from './tutor-guide-asset-integrity';

export { MAX_TUTOR_GUIDE_IMAGE_BYTES, MAX_TUTOR_GUIDE_JSON_BYTES, sha256TutorGuideAsset } from './tutor-guide-asset-integrity';
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const TUTOR_GUIDE_ASSET_KINDS = ['problem', 'solution', 'guide'] as const;
export type TutorGuideAssetKind = (typeof TUTOR_GUIDE_ASSET_KINDS)[number];
export type TutorGuideAssetFailureReason = 'not_found' | 'invalid_manifest' | 'unsafe_path' | 'invalid_png' | 'invalid_mime' | 'too_large' | 'hash_mismatch' | 'unverified';

export type TutorGuideAssetReadResult =
  | { readonly ok: true; readonly bytes: Uint8Array; readonly mimeType: string }
  | { readonly ok: false; readonly reason: Extract<TutorGuideAssetFailureReason, 'not_found' | 'unsafe_path' | 'hash_mismatch'> };

export interface TutorGuideAssetReader {
  read(entry: TutorGuideCatalogEntry, kind: TutorGuideAssetKind): Promise<TutorGuideAssetReadResult>;
}

export type VerifiedTutorGuideAssetsResult =
  | { readonly ok: true; readonly entry: TutorGuideCatalogEntry; readonly problemImage: Uint8Array; readonly guide: TutorGuideV1 }
  | { readonly ok: false; readonly reason: TutorGuideAssetFailureReason };

export async function loadVerifiedTutorGuideRuntimeAssets(
  entry: TutorGuideCatalogEntry,
  reader: TutorGuideAssetReader,
): Promise<VerifiedTutorGuideAssetsResult> {
  if (entry.status !== 'verified') return { ok: false, reason: 'unverified' };
  const [problem, guide] = await Promise.all([
    reader.read(entry, 'problem'),
    reader.read(entry, 'guide'),
  ]);
  if (!problem.ok) return problem;
  if (!guide.ok) return guide;
  if (problem.mimeType !== 'image/png' || guide.mimeType !== 'application/json') {
    return { ok: false, reason: 'invalid_mime' };
  }
  if (!isPng(problem.bytes)) return { ok: false, reason: 'invalid_png' };
  if (problem.bytes.byteLength > MAX_TUTOR_GUIDE_IMAGE_BYTES || guide.bytes.byteLength > MAX_TUTOR_GUIDE_JSON_BYTES) {
    return { ok: false, reason: 'too_large' };
  }
  if (sha256TutorGuideAsset(problem.bytes) !== entry.problemAsset.sha256) {
    return { ok: false, reason: 'hash_mismatch' };
  }
  const parsed = parseGuide(guide.bytes);
  if (parsed === null) return { ok: false, reason: 'invalid_manifest' };
  if (
    parsed.qa.status !== 'verified'
    || parsed.manifestKey !== entry.manifestKey
    || parsed.provenance.problemSha256 !== entry.problemAsset.sha256
    || parsed.provenance.solutionSha256 !== entry.solutionAsset.sha256
  ) {
    return { ok: false, reason: 'unverified' };
  }
  return { ok: true, entry, problemImage: problem.bytes, guide: parsed };
}

export async function verifyTutorGuideAssetsForOffline(
  entry: TutorGuideCatalogEntry,
  reader: TutorGuideAssetReader,
): Promise<VerifiedTutorGuideAssetsResult> {
  const runtime = await loadVerifiedTutorGuideRuntimeAssets(entry, reader);
  if (!runtime.ok) return runtime;
  const solution = await reader.read(entry, 'solution');
  if (!solution.ok) return solution;
  if (solution.mimeType !== 'image/png') return { ok: false, reason: 'invalid_mime' };
  if (!isPng(solution.bytes)) return { ok: false, reason: 'invalid_png' };
  if (solution.bytes.byteLength > MAX_TUTOR_GUIDE_IMAGE_BYTES) return { ok: false, reason: 'too_large' };
  if (sha256TutorGuideAsset(solution.bytes) !== entry.solutionAsset.sha256) return { ok: false, reason: 'hash_mismatch' };
  return runtime;
}

function parseGuide(bytes: Uint8Array): TutorGuideV1 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  const result = TutorGuideV1Schema.safeParse(parsed);
  return result.success ? result.data : null;
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.byteLength >= PNG_MAGIC.length && PNG_MAGIC.every((value, index) => bytes[index] === value);
}
