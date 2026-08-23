import type { Metadata } from 'next';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import type { ConceptGateConfig } from '../_components/conceptAccess';
import { ConceptSharePage } from '../_components/ConceptSharePage';
import { DS_CONCEPT_PART1, DS_CONCEPT_PART2 } from '../ds-concept/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '수학1 · 개념보강',
  robots: { index: false, follow: false },
};

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'math1_concept_all_unlocked',
  path: '/share/math1-concept',
  tokenSeed: 'math1-concept-all:v1',
  passcodeEnvKeys: ['MATH1_CONCEPT_PASSCODE', 'DS_CONCEPT_PASSCODE'],
};

const MATH1_CONCEPT_LESSONS = [...DS_CONCEPT_PART1, ...DS_CONCEPT_PART2] as const;

type PageProps = {
  readonly searchParams?: Promise<{
    readonly gate?: string | readonly string[];
  }>;
};

export default async function Math1ConceptPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="수학1"
      heading="전체 개념보강"
      gate={resolvedSearchParams?.gate}
    >
      <ConceptSharePage
        subjectLabel="수학1"
        heading="수학1 전체 개념보강"
        lessons={MATH1_CONCEPT_LESSONS}
      />
    </ConceptAccessPage>
  );
}
