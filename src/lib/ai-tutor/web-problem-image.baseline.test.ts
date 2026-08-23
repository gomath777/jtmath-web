import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalWebProblemImageStore } from './web-problem-image';
import type { TutorGuideStore } from './tutor-guide-store';
import type { TutorGuideCatalogEntry } from './tutor-guide-catalog';
import type { TutorGuideV1 } from './tutor-guide-contract';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('Given the legacy ds2 4-1 crop When loading locally Then it returns the PNG and production stays disabled', async () => {
  const entry: TutorGuideCatalogEntry = { manifestKey: 'ds2-gichul-03-b1273c:41:1', target: { lessonKey: 'ds2-gichul-03-b1273c', level: 41, problemNumber: 1 }, guidePath: 'guide.json', status: 'verified', problemAsset: { assetKey: 'problem.png', sourceSha256: '0'.repeat(64), sha256: '0'.repeat(64), dimensions: { width: 1, height: 1 }, crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 } }, solutionAsset: { assetKey: 'solution.png', sourceSha256: '0'.repeat(64), sha256: '0'.repeat(64), dimensions: { width: 1, height: 1 }, crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 } } };
  const guide: TutorGuideV1 = { schemaVersion: 1, manifestKey: 'ds2-gichul-03-b1273c:41:1', target: { lessonKey: 'ds2-gichul-03-b1273c', level: 41, problemNumber: 1 }, curriculum: { grade: 'grade', subject: 'subject', unit: 'unit', allowedConcepts: ['concept'], forbiddenMethods: ['method'] }, officialApproach: { summary: 'summary', steps: ['step'] }, hints: { concept: 'concept', start: 'start', decisive: 'decisive' }, alternatives: [], solution: { answer: 'answer', steps: ['step'] }, provenance: { problemSha256: '0'.repeat(64), solutionSha256: '0'.repeat(64), authoringModel: 'gpt-5.6-terra', verifierModel: 'gpt-5.6-sol' }, qa: { status: 'verified', checks: ['schema_valid'] } };
  const guideStore: TutorGuideStore = { load: async () => ({ ok: true, entry, problemImage: png, guide }) };
  const local = await createLocalWebProblemImageStore({ nodeEnv: 'test', guideStore }).load({ lessonSlug: 'ds2-gichul-03-b1273c', level: 41, problemNumber: 1 });
  assert.equal(local.ok, true);
  if (local.ok) assert.deepEqual(Array.from(local.image.bytes), Array.from(png));

  const production = await createLocalWebProblemImageStore({ nodeEnv: 'production', guideStore: { load: async () => ({ ok: false, reason: 'disabled' }) } }).load({ lessonSlug: 'ds2-gichul-03-b1273c', level: 41, problemNumber: 1 });
  assert.deepEqual(production, { ok: false, reason: 'disabled' });
});
