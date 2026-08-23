import { createHash } from 'node:crypto';
import { privateTutorGuideAssetKeys, type PrivateTutorGuideObjectPort } from './private-tutor-guide-asset-store';
import { createTutorGuideCatalog, type TutorGuideCatalog, type TutorGuideCatalogEntry } from './tutor-guide-catalog';

const PROBLEM_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
const SOLUTION_SHA256 = 'b'.repeat(64);

export type PrivateReadinessFixture = {
  readonly catalog: TutorGuideCatalog;
  readonly guideAssetHashes: ReadonlyMap<string, string>;
  readonly target: TutorGuideCatalogEntry['target'];
  readonly problemSha256: string;
  readonly objectPort: PrivateTutorGuideObjectPort;
};

export function createPrivateReadinessFixture(): PrivateReadinessFixture {
  const problemSha256 = digest(PROBLEM_PNG);
  const entry = fixtureEntry(problemSha256);
  const guideBytes = new TextEncoder().encode(JSON.stringify(guideFixture(entry)));
  const guideSha256 = digest(guideBytes);
  const keys = privateTutorGuideAssetKeys(entry, guideSha256);
  const assets = new Map<string, { readonly ok: true; readonly bytes: Uint8Array; readonly mimeType: string }>([
    [keys.problem, { ok: true, bytes: PROBLEM_PNG, mimeType: 'image/png' }],
    [keys.guide, { ok: true, bytes: guideBytes, mimeType: 'application/json' }],
  ]);
  return {
    catalog: createTutorGuideCatalog([entry]),
    guideAssetHashes: new Map([[entry.manifestKey, guideSha256]]),
    target: entry.target,
    problemSha256,
    objectPort: {
      readPrivateObject: async (input) => assets.get(input.objectKey) ?? { ok: false, reason: 'not_found' },
    },
  };
}

function fixtureEntry(problemSha256: string): TutorGuideCatalogEntry {
  const sourceSha256 = 'a'.repeat(64);
  return {
    manifestKey: 'readiness-fixture:41:1',
    target: { lessonKey: 'readiness-fixture', level: 41, problemNumber: 1 },
    guidePath: 'guides/readiness-fixture/01.json',
    status: 'verified',
    problemAsset: {
      assetKey: 'readiness-fixture/problem/01.png',
      sourceSha256,
      sha256: problemSha256,
      dimensions: { width: 1, height: 1 },
      crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 },
    },
    solutionAsset: {
      assetKey: 'readiness-fixture/solution/01.png',
      sourceSha256,
      sha256: SOLUTION_SHA256,
      dimensions: { width: 1, height: 1 },
      crop: { page: 2, left: 0, top: 0, right: 1, bottom: 1 },
    },
  };
}

function guideFixture(entry: TutorGuideCatalogEntry): object {
  return {
    schemaVersion: 1,
    manifestKey: entry.manifestKey,
    target: entry.target,
    curriculum: {
      grade: 'high-school',
      subject: 'mathematics',
      unit: 'fixture-unit',
      allowedConcepts: ['fixture-concept'],
      forbiddenMethods: ['advanced-method'],
    },
    officialApproach: { summary: 'fixture-summary', steps: ['fixture-step'] },
    hints: { concept: 'fixture-concept-hint', start: 'fixture-start-hint', decisive: 'fixture-decisive-hint' },
    alternatives: [],
    solution: { answer: 'fixture-answer', steps: ['fixture-solution-step'] },
    provenance: {
      problemSha256: entry.problemAsset.sha256,
      solutionSha256: entry.solutionAsset.sha256,
      authoringModel: 'gpt-5.6-terra',
      verifierModel: 'gpt-5.6-sol',
    },
    qa: { status: 'verified', checks: ['schema_valid'] },
  };
}

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
