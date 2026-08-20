import type { Metadata } from 'next';
import { ConceptSharePage } from '../_components/ConceptSharePage';
import { DS_CONCEPT_PART1, DS_CONCEPT_PART2 } from '../ds-concept/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '대수 · 전범위 개념보강',
  robots: { index: false, follow: false },
};

const DS_CONCEPT_ALL_LESSONS = [...DS_CONCEPT_PART1, ...DS_CONCEPT_PART2] as const;

export default function DsConceptAllPage() {
  return (
    <ConceptSharePage
      subjectLabel="대수"
      heading="대수 전범위 개념보강"
      lessons={DS_CONCEPT_ALL_LESSONS}
    />
  );
}
