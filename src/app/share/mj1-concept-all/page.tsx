import type { Metadata } from 'next';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import type { ConceptGateConfig } from '../_components/conceptAccess';
import { ConceptSharePage } from '../_components/ConceptSharePage';
import { MJ1_CONCEPT_PART1, MJ1_CONCEPT_PART2 } from '../mj1-concept/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '미적분1 · 전체 개념보강',
  robots: { index: false, follow: false },
};

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'mj1_concept_all_unlocked',
  path: '/share/mj1-concept-all',
  tokenSeed: 'mj1-concept-all:v1',
  passcodeEnvKeys: ['MJ1_CONCEPT_ALL_PASSCODE', 'MJ1_CONCEPT_PASSCODE'],
};

const MJ1_CONCEPT_ALL_LESSONS = [...MJ1_CONCEPT_PART1, ...MJ1_CONCEPT_PART2] as const;

type PageProps = {
  readonly searchParams?: {
    readonly gate?: string | readonly string[];
  };
};

export default function Mj1ConceptAllPage({ searchParams }: PageProps) {
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="미적분1"
      heading="전체 개념보강"
      gate={searchParams?.gate}
    >
      <ConceptSharePage
        subjectLabel="미적분1"
        heading="미적분1 전체 개념보강"
        lessons={MJ1_CONCEPT_ALL_LESSONS}
      />
    </ConceptAccessPage>
  );
}
