import type { Metadata } from 'next';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import type { ConceptGateConfig } from '../_components/conceptAccess';
import { ConceptSharePage } from '../_components/ConceptSharePage';
import { MJ1_CONCEPT_PART1 } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '미적분1 · 개념강의 전반기',
  robots: { index: false, follow: false },
};

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'mj1_concept_part1_unlocked',
  path: '/share/mj1-concept',
  tokenSeed: 'mj1-concept-part1:v1',
  passcodeEnvKeys: ['MJ1_CONCEPT_PART1_PASSCODE', 'MJ1_CONCEPT_PASSCODE'],
};

type PageProps = {
  readonly searchParams?: Promise<{
    readonly gate?: string | readonly string[];
  }>;
};

export default async function Mj1ConceptPart1Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="미적분1"
      heading="1~7차시 · 전반기"
      gate={resolvedSearchParams?.gate}
    >
      <ConceptSharePage
        subjectLabel="미적분1"
        heading="1~7차시 · 전반기"
        lessons={MJ1_CONCEPT_PART1}
      />
    </ConceptAccessPage>
  );
}
