import type { Metadata } from 'next';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import type { ConceptGateConfig } from '../_components/conceptAccess';
import { ConceptSharePage } from '../_components/ConceptSharePage';
import { DS_CONCEPT_PART1 } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '대수 · 개념강의 전반기',
  robots: { index: false, follow: false },
};

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'ds_concept_part1_unlocked',
  path: '/share/ds-concept',
  tokenSeed: 'ds-concept-part1:v1',
  passcodeEnvKeys: ['DS_CONCEPT_PART1_PASSCODE', 'DS_CONCEPT_PASSCODE'],
};

type PageProps = {
  readonly searchParams?: Promise<{
    readonly gate?: string | readonly string[];
  }>;
};

export default async function DsConceptPart1Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="대수"
      heading="1~7차시 · 전반기"
      gate={resolvedSearchParams?.gate}
    >
      <ConceptSharePage
        subjectLabel="대수"
        heading="1~7차시 · 전반기"
        lessons={DS_CONCEPT_PART1}
      />
    </ConceptAccessPage>
  );
}
