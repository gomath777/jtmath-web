import type { TutorCurriculumItem } from './contracts';
import { normalizeSubjectSlug, normalizeTags, sanitizeText, timestampOf } from './context-sanitization';
import type { SourceCurriculumItem } from './context-types';

const maxCurriculumItems = 20;

export function buildCurriculum(items: readonly SourceCurriculumItem[]): readonly TutorCurriculumItem[] {
  const seen = new Set<string>();
  const sortedItems = [...items].sort((left, right) => timestampOf(right.occurredAt) - timestampOf(left.occurredAt));
  const curriculum: TutorCurriculumItem[] = [];
  for (const item of sortedItems) {
    const subjectSlug = normalizeSubjectSlug(item.subjectSlug);
    const title = sanitizeText(item.label, 120);
    if (!title) continue;
    const key = `${subjectSlug}:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    curriculum.push({
      subjectSlug,
      title,
      summary: sanitizeText(item.summary, 500) ?? `${title} 관련 수업`,
      conceptTags: normalizeTags(item.conceptTags).slice(0, 8),
    });
    if (curriculum.length >= maxCurriculumItems) break;
  }
  return curriculum;
}
