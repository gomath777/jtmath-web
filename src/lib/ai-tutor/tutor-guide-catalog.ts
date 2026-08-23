import 'server-only';

import guideManifest from '../../data/ai-tutor-guides/ds2-trigonometry/level-4-1/manifest.json';
import {
  WorksheetTutorManifestEntryV1Schema,
  WorksheetTutorManifestV1Schema,
  type WorksheetTutorManifestEntryV1,
} from './tutor-guide-contract';
import { defaultWebTutorRolloutCatalogEntries } from './web-tutor-rollout-registry';

export type TutorGuideCatalogEntry = WorksheetTutorManifestEntryV1;
export type TutorGuideCatalog = ReadonlyMap<string, TutorGuideCatalogEntry>;

export const DEFAULT_TUTOR_GUIDE_CATALOG: readonly TutorGuideCatalogEntry[] =
  [...WorksheetTutorManifestV1Schema.parse(guideManifest).entries, ...defaultWebTutorRolloutCatalogEntries()];

export function tutorGuideKey(lessonKey: string, level: number, problemNumber: number): string {
  return `${lessonKey}:${level}:${problemNumber}`;
}

export function createTutorGuideCatalog(entries: readonly unknown[] = DEFAULT_TUTOR_GUIDE_CATALOG): TutorGuideCatalog {
  const map = new Map<string, TutorGuideCatalogEntry>();
  for (const raw of entries) {
    const entry = WorksheetTutorManifestEntryV1Schema.parse(raw);
    const key = tutorGuideKey(entry.target.lessonKey, entry.target.level, entry.target.problemNumber);
    if (map.has(key)) throw new Error('duplicate_tutor_guide_key');
    map.set(key, entry);
  }
  return map;
}

export function serializeTutorGuideCatalog(catalog: TutorGuideCatalog): readonly TutorGuideCatalogEntry[] {
  return Array.from(catalog.values());
}
