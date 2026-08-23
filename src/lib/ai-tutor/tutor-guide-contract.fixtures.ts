export const TUTOR_GUIDE_HASH_A = 'a'.repeat(64);
export const TUTOR_GUIDE_HASH_B = 'b'.repeat(64);
export const TUTOR_GUIDE_SOURCE_HASH = 'c'.repeat(64);

export function validGuide() {
  return {
    schemaVersion: 1,
    manifestKey: 'synthetic-lesson:1:1',
    target: { lessonKey: 'synthetic-lesson', level: 1, problemNumber: 1 },
    curriculum: {
      grade: 'synthetic-grade',
      subject: 'synthetic-subject',
      unit: 'synthetic-unit',
      allowedConcepts: ['synthetic-concept'],
      forbiddenMethods: ['synthetic-forbidden-method'],
    },
    officialApproach: {
      summary: 'synthetic official outline',
      steps: ['synthetic official step'],
    },
    hints: {
      concept: 'synthetic concept hint',
      start: 'synthetic start hint',
      decisive: 'synthetic decisive hint',
    },
    alternatives: [],
    solution: { answer: 'synthetic answer', steps: ['synthetic solution step'] },
    provenance: {
      problemSha256: TUTOR_GUIDE_HASH_A,
      solutionSha256: TUTOR_GUIDE_HASH_B,
      authoringModel: 'gpt-5.6-terra',
      verifierModel: 'gpt-5.6-sol',
    },
    qa: { status: 'verified', checks: ['schema_valid', 'official_solution_checked'] },
  };
}

export function validManifest() {
  return {
    schemaVersion: 1,
    entries: [
      {
        manifestKey: 'synthetic-lesson:1:1',
        target: { lessonKey: 'synthetic-lesson', level: 1, problemNumber: 1 },
        guidePath: 'guides/problem-1.json',
        status: 'verified',
        problemAsset: {
          assetKey: 'problems/problem-1.png',
          sourceSha256: TUTOR_GUIDE_SOURCE_HASH,
          sha256: TUTOR_GUIDE_HASH_A,
          dimensions: { width: 100, height: 100 },
          crop: { page: 1, left: 0, top: 0, right: 100, bottom: 100 },
        },
        solutionAsset: {
          assetKey: 'solutions/problem-1.png',
          sourceSha256: TUTOR_GUIDE_SOURCE_HASH,
          sha256: TUTOR_GUIDE_HASH_B,
          dimensions: { width: 100, height: 100 },
          crop: { page: 7, left: 0, top: 0, right: 100, bottom: 100 },
        },
      },
    ],
  };
}
