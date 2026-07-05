import type { Metadata } from 'next';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import type { ConceptGateConfig } from '../_components/conceptAccess';
import { ConceptSharePage } from '../_components/ConceptSharePage';
import { DS_CONCEPT_PART2 } from '../ds-concept/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '대수 · 개념강의 후반기',
  robots: { index: false, follow: false },
};

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'ds_concept_part2_unlocked',
  path: '/share/ds-concept-2',
  tokenSeed: 'ds-concept-part2:v1',
  passcodeEnvKeys: ['DS_CONCEPT_PART2_PASSCODE', 'DS_CONCEPT_PASSCODE'],
};

type PageProps = {
  readonly searchParams?: {
    readonly gate?: string | readonly string[];
  };
};

export default function DsConceptPart2Page({ searchParams }: PageProps) {
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="대수"
      heading="8~14차시 · 후반기"
      gate={searchParams?.gate}
    >
      <ConceptSharePage
        subjectLabel="대수"
        heading="8~14차시 · 후반기"
        lessons={DS_CONCEPT_PART2}
      />
    </ConceptAccessPage>
  );
}
