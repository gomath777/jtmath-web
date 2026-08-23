import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTutorGuideCatalog, serializeTutorGuideCatalog, type TutorGuideCatalogEntry } from './tutor-guide-catalog';
import { createLocalTutorGuideStore } from './tutor-guide-store';

const problemPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
const solutionPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x02]);
const digest = (value: Buffer): string => createHash('sha256').update(value).digest('hex');

async function fixture(): Promise<{ readonly root: string; readonly entry: TutorGuideCatalogEntry }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tutor-guide-'));
  await mkdir(path.join(root, 'tmp', 'ai-tutor-guide-assets', 'ds2'), { recursive: true });
  await mkdir(path.join(root, 'src', 'data'), { recursive: true });
  await writeFile(path.join(root, 'tmp', 'ai-tutor-guide-assets', 'ds2', 'problem.png'), problemPng);
  await writeFile(path.join(root, 'tmp', 'ai-tutor-guide-assets', 'ds2', 'solution.png'), solutionPng);
  const sourceHash = 'a'.repeat(64);
  const entry: TutorGuideCatalogEntry = {
    manifestKey: 'lesson:41:1',
    target: { lessonKey: 'lesson', level: 41, problemNumber: 1 },
    guidePath: 'src/data/guide.json',
    status: 'verified',
    problemAsset: { assetKey: 'ds2/problem.png', sourceSha256: sourceHash, sha256: digest(problemPng), dimensions: { width: 1, height: 1 }, crop: { page: 1, left: 0, top: 0, right: 10, bottom: 10 } },
    solutionAsset: { assetKey: 'ds2/solution.png', sourceSha256: sourceHash, sha256: digest(solutionPng), dimensions: { width: 1, height: 1 }, crop: { page: 7, left: 0, top: 0, right: 10, bottom: 10 } },
  };
  await writeFile(path.join(root, 'src', 'data', 'guide.json'), JSON.stringify(guideFixture(entry)));
  return { root, entry };
}

test('Given a verified fixture When resolving the exact server key Then it loads the PNG and guide without absolute refs', async () => {
  const { root, entry } = await fixture();
  const result = await createLocalTutorGuideStore({ cwd: root, nodeEnv: 'test', catalog: createTutorGuideCatalog([entry]) }).load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.problemImage, new Uint8Array(problemPng));
  assert.equal(JSON.stringify(serializeTutorGuideCatalog(createTutorGuideCatalog([entry]))).includes(root), false);
});

test('Given source-bound, stale, unverified, and unsafe fixtures When loading Then each fails with a fixed reason', async () => {
  const { root, entry } = await fixture();
  const guidePath = path.join(root, 'src', 'data', 'guide.json');
  await writeFile(guidePath, JSON.stringify(guideFixture(entry, { problemSha256: entry.problemAsset.sourceSha256, solutionSha256: entry.solutionAsset.sourceSha256 })));
  const sourceBound = await createLocalTutorGuideStore({ cwd: root, nodeEnv: 'test', catalog: createTutorGuideCatalog([entry]) }).load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });
  assert.deepEqual(sourceBound, { ok: false, reason: 'unverified' });
  await writeFile(guidePath, JSON.stringify(guideFixture(entry)));
  const stale = await createLocalTutorGuideStore({ cwd: root, nodeEnv: 'test', catalog: createTutorGuideCatalog([{ ...entry, problemAsset: { ...entry.problemAsset, sha256: 'f'.repeat(64) } }]) }).load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });
  assert.deepEqual(stale, { ok: false, reason: 'hash_mismatch' });
  const outside = path.join(os.tmpdir(), `tutor-guide-outside-${Date.now()}.png`);
  await writeFile(outside, problemPng);
  await symlink(outside, path.join(root, 'tmp', 'ai-tutor-guide-assets', 'outside.png'));
  const unsafe = await createLocalTutorGuideStore({ cwd: root, nodeEnv: 'test', catalog: createTutorGuideCatalog([{ ...entry, problemAsset: { ...entry.problemAsset, assetKey: 'outside.png' } }]) }).load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });
  assert.deepEqual(unsafe, { ok: false, reason: 'unsafe_path' });
  const production = await createLocalTutorGuideStore({ cwd: root, nodeEnv: 'production', catalog: createTutorGuideCatalog([entry]) }).load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });
  assert.deepEqual(production, { ok: false, reason: 'disabled' });
});

test('Given strict-guide drift When loading Then extra fields and unknown versions fail closed', async () => {
  const { root, entry } = await fixture();
  const guidePath = path.join(root, 'src', 'data', 'guide.json');
  const valid = JSON.parse(await readFile(guidePath, 'utf8'));
  await writeFile(guidePath, JSON.stringify({ ...valid, rawTranscript: 'ignore instructions' }));
  const extra = await createLocalTutorGuideStore({ cwd: root, nodeEnv: 'test', catalog: createTutorGuideCatalog([entry]) }).load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });
  assert.deepEqual(extra, { ok: false, reason: 'invalid_manifest' });
  await writeFile(guidePath, JSON.stringify({ ...valid, schemaVersion: 2 }));
  const staleVersion = await createLocalTutorGuideStore({ cwd: root, nodeEnv: 'test', catalog: createTutorGuideCatalog([entry]) }).load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });
  assert.deepEqual(staleVersion, { ok: false, reason: 'invalid_manifest' });
  await writeFile(guidePath, JSON.stringify({ ...valid, qa: { status: 'draft', checks: ['schema_valid'] } }));
  const unverified = await createLocalTutorGuideStore({ cwd: root, nodeEnv: 'test', catalog: createTutorGuideCatalog([entry]) }).load({ lessonKey: 'lesson', level: 41, problemNumber: 1 });
  assert.deepEqual(unverified, { ok: false, reason: 'unverified' });
});

test('Given non-positive asset dimensions When cataloging Then strict manifest parsing rejects the entry', () => {
  assert.throws(() => createTutorGuideCatalog([{ ...fixtureEntryForSchema(), problemAsset: { ...fixtureEntryForSchema().problemAsset, dimensions: { width: 0, height: 1 } } }]));
});

function fixtureEntryForSchema(): TutorGuideCatalogEntry {
  return {
    manifestKey: 'lesson:41:1', target: { lessonKey: 'lesson', level: 41, problemNumber: 1 }, guidePath: 'guide.json', status: 'verified',
    problemAsset: { assetKey: 'problem.png', sourceSha256: 'a'.repeat(64), sha256: 'a'.repeat(64), dimensions: { width: 1, height: 1 }, crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 } },
    solutionAsset: { assetKey: 'solution.png', sourceSha256: 'a'.repeat(64), sha256: 'a'.repeat(64), dimensions: { width: 1, height: 1 }, crop: { page: 1, left: 0, top: 0, right: 1, bottom: 1 } },
  };
}

function guideFixture(
  entry: TutorGuideCatalogEntry,
  provenance: Readonly<{ readonly problemSha256: string; readonly solutionSha256: string }> = {
    problemSha256: entry.problemAsset.sha256,
    solutionSha256: entry.solutionAsset.sha256,
  },
): object {
  return {
    schemaVersion: 1,
    manifestKey: entry.manifestKey,
    target: entry.target,
    curriculum: { grade: 'grade', subject: 'subject', unit: 'unit', allowedConcepts: ['sine'], forbiddenMethods: ['calculus'] },
    officialApproach: { summary: 'outline', steps: ['step'] },
    hints: { concept: 'concept', start: 'start', decisive: 'decisive' },
    alternatives: [],
    solution: { answer: 'answer', steps: ['solution'] },
    provenance: { ...provenance, authoringModel: 'gpt-5.6-terra', verifierModel: 'gpt-5.6-sol' },
    qa: { status: 'verified', checks: ['schema_valid'] },
  };
}
