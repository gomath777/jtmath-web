import type { Metadata } from 'next';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import type { ConceptGateConfig } from '../_components/conceptAccess';
import { ConceptSharePage } from '../_components/ConceptSharePage';
import { MJ1_CONCEPT_PART2 } from '../mj1-concept/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '미적분1 · 개념강의 후반기',
  robots: { index: false, follow: false },
};

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'mj1_concept_part2_unlocked',
  path: '/share/mj1-concept-2',
  tokenSeed: 'mj1-concept-part2:v1',
  passcodeEnvKeys: ['MJ1_CONCEPT_PART2_PASSCODE', 'MJ1_CONCEPT_PASSCODE'],
};

type PageProps = {
  readonly searchParams?: {
    readonly gate?: string | readonly string[];
  };
};

export default function Mj1ConceptPart2Page({ searchParams }: PageProps) {
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="미적분1"
      heading="8~14차시 · 후반기"
      gate={searchParams?.gate}
    >
      <ConceptSharePage
        subjectLabel="미적분1"
        heading="8~14차시 · 후반기"
        lessons={MJ1_CONCEPT_PART2}
      />
    </ConceptAccessPage>
  );
}
