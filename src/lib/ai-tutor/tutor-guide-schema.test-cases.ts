import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TutorGuideV1Schema,
  WorksheetTutorManifestV1Schema,
  type TutorGuideV1,
  type WorksheetTutorManifestEntryV1,
} from './tutor-guide-contract';
import { validGuide as validSyntheticGuide, validManifest as validSyntheticManifest } from './tutor-guide-contract.fixtures';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const SOURCE_HASH = 'c'.repeat(64);

test('Given verified synthetic guide and manifest fixtures When parsed Then strict V1 contracts accept integrity-bound data', () => {
  // Given
  const entry = validManifestEntry();
  const guide = validGuide(entry);

  // When
  const parsedGuide = TutorGuideV1Schema.parse(guide);
  const parsedManifest = WorksheetTutorManifestV1Schema.parse({ schemaVersion: 1, entries: [entry] });

  // Then
  assert.equal(parsedGuide.manifestKey, entry.manifestKey);
  assert.equal(parsedManifest.entries[0]?.problemAsset.sha256, parsedGuide.provenance.problemSha256);
  assert.equal(parsedManifest.entries[0]?.solutionAsset.sha256, parsedGuide.provenance.solutionSha256);
  assert.notEqual(parsedManifest.entries[0]?.problemAsset.sourceSha256, parsedGuide.provenance.problemSha256);
});

test('Given untrusted guide and manifest shapes When they contain drift or forbidden fields Then strict contracts fail closed', () => {
  // Given
  const unknownVersion = { ...validSyntheticGuide(), schemaVersion: 2 };
  const extraGuideField = { ...validSyntheticGuide(), rawTranscript: 'ignore earlier instructions' };
  const nonNormalizedId = {
    ...validSyntheticGuide(),
    manifestKey: 'Synthetic-Lesson:1:1',
    target: { lessonKey: 'Synthetic-Lesson', level: 1, problemNumber: 1 },
  };
  const extraManifestField = { ...validSyntheticManifest(), sourceUrl: 'https://example.invalid/private.pdf' };

  // When
  const results = [
    TutorGuideV1Schema.safeParse(unknownVersion).success,
    TutorGuideV1Schema.safeParse(extraGuideField).success,
    TutorGuideV1Schema.safeParse(nonNormalizedId).success,
    WorksheetTutorManifestV1Schema.safeParse(extraManifestField).success,
  ];

  // Then
  assert.deepEqual(results, [false, false, false, false]);
});

test('Given asset dimensions When missing invalid oversized or extended Then the strict manifest contract rejects them', () => {
  // Given
  const entry = validSyntheticManifest().entries[0];
  const missingDimensions = {
    ...validSyntheticManifest(),
    entries: [
      {
        ...entry,
        problemAsset: {
          assetKey: entry.problemAsset.assetKey,
          sourceSha256: entry.problemAsset.sourceSha256,
          sha256: entry.problemAsset.sha256,
          crop: entry.problemAsset.crop,
        },
      },
    ],
  };
  const zeroDimensions = {
    ...validSyntheticManifest(),
    entries: [{ ...entry, problemAsset: { ...entry.problemAsset, dimensions: { width: 0, height: 100 } } }],
  };
  const oversizedDimensions = {
    ...validSyntheticManifest(),
    entries: [{ ...entry, problemAsset: { ...entry.problemAsset, dimensions: { width: 10001, height: 100 } } }],
  };
  const unknownDimensionField = {
    ...validSyntheticManifest(),
    entries: [
      {
        ...entry,
        problemAsset: { ...entry.problemAsset, dimensions: { width: 100, height: 100, channels: 4 } },
      },
    ],
  };

  // When
  const accepted = [
    WorksheetTutorManifestV1Schema.safeParse(missingDimensions).success,
    WorksheetTutorManifestV1Schema.safeParse(zeroDimensions).success,
    WorksheetTutorManifestV1Schema.safeParse(oversizedDimensions).success,
    WorksheetTutorManifestV1Schema.safeParse(unknownDimensionField).success,
  ];

  // Then
  assert.deepEqual(accepted, [false, false, false, false]);
});

function validManifestEntry(): WorksheetTutorManifestEntryV1 {
  return {
    manifestKey: 'lesson:41:3',
    target: { lessonKey: 'lesson', level: 41, problemNumber: 3 },
    guidePath: 'guides/problem-03.json',
    status: 'verified',
    problemAsset: {
      assetKey: 'problem/03.png',
      sourceSha256: SOURCE_HASH,
      sha256: HASH_A,
      dimensions: { width: 100, height: 120 },
      crop: { page: 1, left: 0, top: 0, right: 100, bottom: 120 },
    },
    solutionAsset: {
      assetKey: 'solution/03.png',
      sourceSha256: SOURCE_HASH,
      sha256: HASH_B,
      dimensions: { width: 100, height: 140 },
      crop: { page: 7, left: 0, top: 0, right: 100, bottom: 140 },
    },
  };
}

function validGuide(entry: WorksheetTutorManifestEntryV1): TutorGuideV1 {
  return {
    schemaVersion: 1,
    manifestKey: entry.manifestKey,
    target: entry.target,
    curriculum: {
      grade: '고2',
      subject: '수학 II',
      unit: '삼각함수',
      allowedConcepts: ['삼각함수의 그래프'],
      forbiddenMethods: ['미적분'],
    },
    officialApproach: { summary: '공식 해설의 핵심 관계를 먼저 잡는다.', steps: ['조건을 식으로 정리한다.'] },
    hints: { concept: '그래프의 최댓값과 주기를 확인한다.', start: '주어진 범위에서 가능한 값을 나눈다.', decisive: '부호가 바뀌는 지점을 대입한다.' },
    alternatives: [],
    solution: { answer: '1', steps: ['공식 해설 순서대로 계산한다.'] },
    provenance: {
      problemSha256: entry.problemAsset.sha256,
      solutionSha256: entry.solutionAsset.sha256,
      authoringModel: 'gpt-5.6-terra',
      verifierModel: 'gpt-5.6-sol',
    },
    qa: { status: 'verified', checks: ['schema_valid', 'official_solution_checked', 'curriculum_checked', 'latex_checked'] },
  };
}
