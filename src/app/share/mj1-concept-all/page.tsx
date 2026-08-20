import type { Metadata } from 'next';
import { ConceptSharePage } from '../_components/ConceptSharePage';
import { MJ1_CONCEPT_PART1, MJ1_CONCEPT_PART2 } from '../mj1-concept/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '미적분1 · 전체 개념보강',
  robots: { index: false, follow: false },
};

const MJ1_CONCEPT_ALL_LESSONS = [...MJ1_CONCEPT_PART1, ...MJ1_CONCEPT_PART2] as const;

export default function Mj1ConceptAllPage() {
  return (
    <ConceptSharePage
      subjectLabel="미적분1"
      heading="미적분1 전체 개념보강"
      lessons={MJ1_CONCEPT_ALL_LESSONS}
    />
  );
}
