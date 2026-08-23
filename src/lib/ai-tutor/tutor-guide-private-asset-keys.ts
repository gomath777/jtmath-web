import type { TutorGuideCatalogEntry } from './tutor-guide-catalog';

export const AI_TUTOR_GUIDES_PRIVATE_BUCKET = 'ai-tutor-guides';

export type PrivateTutorGuideAssetKeys = Readonly<{
  readonly problem: string;
  readonly solution: string;
  readonly guide: string;
}>;

export function privateTutorGuideAssetKeys(entry: TutorGuideCatalogEntry, guideSha256: string): PrivateTutorGuideAssetKeys {
  const prefix = `v1/${entry.target.lessonKey}/level-${entry.target.level}/problem-${entry.target.problemNumber}`;
  return {
    problem: `${prefix}/problem/${entry.problemAsset.sha256}.png`,
    solution: `${prefix}/solution/${entry.solutionAsset.sha256}.png`,
    guide: `${prefix}/guide/${guideSha256}.json`,
  };
}
