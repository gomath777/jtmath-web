import type { Metadata } from 'next';
import { GEOMETRY_UP_TO_LINE_EQUATION_LESSONS } from '../_data/geometryConceptLessons';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import { ConceptSharePage } from '../_components/ConceptSharePage';
import type { ConceptGateConfig } from '../_components/conceptAccess';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '인여 기하 개념 보충',
  description: '기하 평면과 구의 방정식까지 보충용 개념노트와 개념강의',
  robots: { index: false, follow: false },
};

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'incheon_yeogo2_geometry_supplement_unlocked',
  path: '/share/incheon-yeogo2-geometry-supplement',
  tokenSeed: 'incheon-yeogo2-geometry-supplement:v1',
  passcodeEnvKeys: [
    'INCHEON_YEOGO2_GEOMETRY_SUPPLEMENT_PASSCODE',
    'GEOMETRY_SUPPLEMENT_PASSCODE',
  ],
};

type PageProps = {
  readonly searchParams?: {
    readonly gate?: string | readonly string[];
  };
};

export default function IncheonYeogo2GeometrySupplementPage({ searchParams }: PageProps) {
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="기하"
      heading="인여 기하 개념 보충"
      gate={searchParams?.gate}
    >
      <ConceptSharePage
        subjectLabel="기하"
        heading="인여 기하 개념 보충"
        lessons={GEOMETRY_UP_TO_LINE_EQUATION_LESSONS}
      />
    </ConceptAccessPage>
  );
}
