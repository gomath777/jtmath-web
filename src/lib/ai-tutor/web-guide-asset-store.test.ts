import assert from 'node:assert/strict';
import test from 'node:test';

import { createPrivateWebProblemImageStore } from './web-problem-image';
import { createPrivateWebTutorGuideStore } from './web-tutor-guide-store';
import type { TutorGuideStore } from './tutor-guide-store';
import type { TutorGuideCatalogEntry } from './tutor-guide-catalog';
import type { TutorGuideV1 } from './tutor-guide-contract';

const entry: TutorGuideCatalogEntry = {
  manifestKey: 'lesson:41:1',
  target: { lessonKey: 'lesson', level: 41, problemNumber: 1 },
  guidePath: 'ignored.json',
  status: 'verified',
  problemAsset: { assetKey: 'ignored.png', sourceSha256: 'a'.repeat(64), sha256: 'b'.repeat(64), dimensions: { width: 1, height: 1 }, crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 } },
  solutionAsset: { assetKey: 'ignored.png', sourceSha256: 'a'.repeat(64), sha256: 'c'.repeat(64), dimensions: { width: 1, height: 1 }, crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 } },
};
const guide: TutorGuideV1 = {
  schemaVersion: 1, manifestKey: entry.manifestKey, target: entry.target,
  curriculum: { grade: 'grade', subject: 'subject', unit: 'unit', allowedConcepts: ['concept'], forbiddenMethods: ['method'] },
  officialApproach: { summary: 'summary', steps: ['step'] }, hints: { concept: 'concept', start: 'start', decisive: 'decisive' }, alternatives: [], solution: { answer: 'answer', steps: ['step'] },
  provenance: { problemSha256: entry.problemAsset.sha256, solutionSha256: entry.solutionAsset.sha256, authoringModel: 'gpt-5.6-terra', verifierModel: 'gpt-5.6-sol' }, qa: { status: 'verified', checks: ['schema_valid'] },
};

test('Given a private verified guide port When runtime adapters load Then only problem bytes and guide projection are exposed', async () => {
  // Given
  const guideStore: TutorGuideStore = {
    has: () => true,
    load: async () => ({ ok: true, entry, problemImage: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), guide }),
  };
  const privateGuideStore = createPrivateWebTutorGuideStore({ guideStore });
  const privateProblemStore = createPrivateWebProblemImageStore({ guideStore });

  // When
  const [loadedGuide, loadedImage] = await Promise.all([
    privateGuideStore.load({ lessonKey: 'lesson', level: 41, problemNumber: 1 }),
    privateProblemStore.load({ lessonSlug: 'lesson', level: 41, problemNumber: 1 }),
  ]);

  // Then
  assert.equal(loadedGuide.ok, true);
  assert.equal(loadedImage.ok, true);
  assert.equal('loadSolutionImage' in privateGuideStore, false);
  assert.equal('loadSolutionImage' in privateProblemStore, false);
  assert.equal(JSON.stringify([loadedGuide, loadedImage]).includes('solution.png'), false);
});
