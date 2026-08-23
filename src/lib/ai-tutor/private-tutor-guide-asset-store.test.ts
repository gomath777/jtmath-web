import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { createTutorGuideCatalog, type TutorGuideCatalogEntry } from './tutor-guide-catalog';
import { createPrivateTutorGuideAssetReader, createPrivateTutorGuideStore, privateTutorGuideAssetKeys, type PrivateTutorGuideObjectPort } from './private-tutor-guide-asset-store';
import { verifyTutorGuideAssetsForOffline } from './tutor-guide-asset-store';

const problemPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
const solutionPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x02]);
const digest = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');
const sourceSha256 = 'a'.repeat(64);

function entry(): TutorGuideCatalogEntry {
  return {
    manifestKey: 'lesson:41:1',
    target: { lessonKey: 'lesson', level: 41, problemNumber: 1 },
    guidePath: 'local-only-guide.json',
    status: 'verified',
    problemAsset: { assetKey: 'local/problem.png', sourceSha256, sha256: digest(problemPng), dimensions: { width: 1, height: 1 }, crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 } },
    solutionAsset: { assetKey: 'local/solution.png', sourceSha256, sha256: digest(solutionPng), dimensions: { width: 1, height: 1 }, crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 } },
  };
}

function guide(catalogEntry = entry(), provenance: Readonly<{ readonly problemSha256: string; readonly solutionSha256: string }> = {
  problemSha256: catalogEntry.problemAsset.sha256,
  solutionSha256: catalogEntry.solutionAsset.sha256,
}): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({
    schemaVersion: 1,
    manifestKey: 'lesson:41:1',
    target: { lessonKey: 'lesson', level: 41, problemNumber: 1 },
    curriculum: { grade: 'grade', subject: 'subject', unit: 'unit', allowedConcepts: ['concept'], forbiddenMethods: ['method'] },
    officialApproach: { summary: 'summary', steps: ['step'] },
    hints: { concept: 'concept', start: 'start', decisive: 'decisive' },
    alternatives: [],
    solution: { answer: 'answer', steps: ['solution'] },
    provenance: { ...provenance, authoringModel: 'gpt-5.6-terra', verifierModel: 'gpt-5.6-sol' },
    qa: { status: 'verified', checks: ['schema_valid'] },
  }));
}

test('Given immutable private objects When loading a verified target Then bytes match and no public URL is exposed', async () => {
  // Given
  const catalogEntry = entry();
  const guideBytes = guide(catalogEntry);
  const keys = privateTutorGuideAssetKeys(catalogEntry, digest(guideBytes));
  const objects = new Map<string, Readonly<{ readonly bytes: Uint8Array; readonly mimeType: string }>>([
    [keys.problem, { bytes: problemPng, mimeType: 'image/png' }],
    [keys.guide, { bytes: guideBytes, mimeType: 'application/json' }],
  ]);
  const reads: string[] = [];
  const objectPort: PrivateTutorGuideObjectPort = {
    readPrivateObject: async (input) => {
      reads.push(input.objectKey);
      if (input.objectKey === keys.solution) throw new Error('runtime_solution_read_forbidden');
      const object = objects.get(input.objectKey);
      return object === undefined ? { ok: false, reason: 'not_found' } : { ok: true, ...object };
    },
  };
  const store = createPrivateTutorGuideStore({ catalog: createTutorGuideCatalog([catalogEntry]), objectPort, guideAssetHashes: new Map([[catalogEntry.manifestKey, digest(guideBytes)]]) });

  // When
  const result = await store.load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });

  // Then
  assert.equal(result.ok, true);
  assert.deepEqual(reads.sort(), [keys.guide, keys.problem].sort());
  assert.equal(JSON.stringify(result).includes('publicUrl'), false);
  if (result.ok) assert.deepEqual(result.problemImage, problemPng);
});

test('Given a private guide-object read that never settles When loading a tutor target Then the request is bounded instead of remaining processing', { timeout: 100 }, async () => {
  // Given
  const catalogEntry = entry();
  const store = createPrivateTutorGuideStore({
    catalog: createTutorGuideCatalog([catalogEntry]),
    objectPort: { readPrivateObject: async () => new Promise(() => {}) },
    guideAssetHashes: new Map([[catalogEntry.manifestKey, digest(guide(catalogEntry))]]),
    assetReadDeadlineMs: 1,
  });

  // When
  const result = await store.load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'not_found' });
});

test('Given one transient private guide-object read failure When loading a tutor target Then the second bounded attempt returns the verified guide', async () => {
  // Given
  const catalogEntry = entry();
  const guideBytes = guide(catalogEntry);
  const keys = privateTutorGuideAssetKeys(catalogEntry, digest(guideBytes));
  const reads = new Map<string, number>();
  const objects = new Map<string, Readonly<{ readonly bytes: Uint8Array; readonly mimeType: string }>>([
    [keys.problem, { bytes: problemPng, mimeType: 'image/png' }],
    [keys.guide, { bytes: guideBytes, mimeType: 'application/json' }],
  ]);
  const store = createPrivateTutorGuideStore({
    catalog: createTutorGuideCatalog([catalogEntry]),
    objectPort: {
      readPrivateObject: async ({ objectKey }) => {
        const count = (reads.get(objectKey) ?? 0) + 1;
        reads.set(objectKey, count);
        const object = objects.get(objectKey);
        return count === 1 || object === undefined ? { ok: false as const, reason: 'not_found' as const } : { ok: true as const, ...object };
      },
    },
    guideAssetHashes: new Map([[catalogEntry.manifestKey, digest(guideBytes)]]),
    assetReadDeadlineMs: 1,
  });

  // When
  const result = await store.load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });

  // Then
  assert.equal(result.ok, true);
  assert.equal(reads.get(keys.problem), 2);
  assert.equal(reads.get(keys.guide), 2);
});

test('Given private objects with MIME, hash, source, or status drift When loading Then each fails closed', async () => {
  // Given
  const catalogEntry = entry();
  const guideBytes = guide(catalogEntry);
  const expectedGuideHash = digest(guideBytes);
  const keys = privateTutorGuideAssetKeys(catalogEntry, expectedGuideHash);
  const read = (overrides: Readonly<Record<string, Readonly<{ readonly bytes: Uint8Array; readonly mimeType: string }>>>) => {
    const objects = new Map<string, Readonly<{ readonly bytes: Uint8Array; readonly mimeType: string }>>([
      [keys.problem, { bytes: problemPng, mimeType: 'image/png' }],
      [keys.solution, { bytes: solutionPng, mimeType: 'image/png' }],
      [keys.guide, { bytes: guideBytes, mimeType: 'application/json' }],
      ...Object.entries(overrides),
    ]);
    return createPrivateTutorGuideStore({
      catalog: createTutorGuideCatalog([catalogEntry]),
      objectPort: { readPrivateObject: async ({ objectKey }) => {
        const object = objects.get(objectKey);
        return object === undefined ? { ok: false as const, reason: 'not_found' as const } : { ok: true as const, ...object };
      } },
      guideAssetHashes: new Map([[catalogEntry.manifestKey, expectedGuideHash]]),
    });
  };

  // When
  const target = { lessonKey: 'lesson', level: 41 as const, problemNumber: 1 };
  const invalidMime = await read({ [keys.problem]: { bytes: problemPng, mimeType: 'image/jpeg' } }).load(target);
  const stale = await read({ [keys.problem]: { bytes: new Uint8Array([...problemPng, 3]), mimeType: 'image/png' } }).load(target);
  const tooLargeBytes = new Uint8Array(5 * 1024 * 1024 + 1);
  tooLargeBytes.set(problemPng);
  const tooLarge = await read({ [keys.problem]: { bytes: tooLargeBytes, mimeType: 'image/png' } }).load(target);
  const sourceDriftGuide = guide(catalogEntry, { problemSha256: sourceSha256, solutionSha256: sourceSha256 });
  const sourceDriftStore = createPrivateTutorGuideStore({
    catalog: createTutorGuideCatalog([catalogEntry]),
    objectPort: { readPrivateObject: async ({ objectKey }) => {
      const sourceDriftKeys = privateTutorGuideAssetKeys(catalogEntry, digest(sourceDriftGuide));
      if (objectKey === sourceDriftKeys.guide) return { ok: true as const, bytes: sourceDriftGuide, mimeType: 'application/json' };
      if (objectKey === sourceDriftKeys.problem) return { ok: true as const, bytes: problemPng, mimeType: 'image/png' };
      if (objectKey === sourceDriftKeys.solution) return { ok: true as const, bytes: solutionPng, mimeType: 'image/png' };
      return { ok: false as const, reason: 'not_found' as const };
    } },
    guideAssetHashes: new Map([[catalogEntry.manifestKey, digest(sourceDriftGuide)]]),
  });
  const sourceDrift = await sourceDriftStore.load(target);
  const unverified = await createPrivateTutorGuideStore({ catalog: createTutorGuideCatalog([{ ...catalogEntry, status: 'draft' }]), objectPort: { readPrivateObject: async () => ({ ok: false, reason: 'not_found' }) }, guideAssetHashes: new Map([[catalogEntry.manifestKey, expectedGuideHash]]) }).load(target);

  // Then
  assert.deepEqual(invalidMime, { ok: false, reason: 'invalid_mime' });
  assert.deepEqual(stale, { ok: false, reason: 'hash_mismatch' });
  assert.deepEqual(tooLarge, { ok: false, reason: 'too_large' });
  assert.deepEqual(sourceDrift, { ok: false, reason: 'unverified' });
  assert.deepEqual(unverified, { ok: false, reason: 'unverified' });
});

test('Given a verified private asset set When offline verification runs Then it alone reads the solution crop', async () => {
  // Given
  const catalogEntry = entry();
  const guideBytes = guide(catalogEntry);
  const keys = privateTutorGuideAssetKeys(catalogEntry, digest(guideBytes));
  const reads: string[] = [];
  const objects = new Map<string, Readonly<{ readonly bytes: Uint8Array; readonly mimeType: string }>>([
    [keys.problem, { bytes: problemPng, mimeType: 'image/png' }],
    [keys.solution, { bytes: solutionPng, mimeType: 'image/png' }],
    [keys.guide, { bytes: guideBytes, mimeType: 'application/json' }],
  ]);
  const reader = createPrivateTutorGuideAssetReader({
    objectPort: { readPrivateObject: async ({ objectKey }) => {
      reads.push(objectKey);
      const object = objects.get(objectKey);
      return object === undefined ? { ok: false as const, reason: 'not_found' as const } : { ok: true as const, ...object };
    } },
    guideAssetHashes: new Map([[catalogEntry.manifestKey, digest(guideBytes)]]),
  });

  // When
  const result = await verifyTutorGuideAssetsForOffline(catalogEntry, reader);

  // Then
  assert.equal(result.ok, true);
  assert.deepEqual(reads.sort(), [keys.guide, keys.problem, keys.solution].sort());
});
