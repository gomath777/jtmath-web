import type { Metadata } from 'next';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import { ConceptSharePage, type ConceptLesson } from '../_components/ConceptSharePage';
import type { ConceptGateConfig } from '../_components/conceptAccess';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '도영 기하보충',
  description: '기하 6~9일차 보충용 개념노트와 개념강의',
  robots: { index: false, follow: false },
};

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'doyoung_geometry_supplement_unlocked',
  path: '/share/doyoung-geometry-supplement',
  tokenSeed: 'doyoung-geometry-supplement:v1',
  passcodeEnvKeys: ['DOYOUNG_GEOMETRY_SUPPLEMENT_PASSCODE', 'GEOMETRY_SUPPLEMENT_PASSCODE'],
};

const LESSONS: readonly ConceptLesson[] = [
  {
    order: 6,
    title: '직선과 평면의 위치 관계',
    pdfs: [
      {
        name: '직선과 평면의 위치 관계 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/05_%EA%B3%B5%EA%B0%84%EB%8F%84%ED%98%95/2_1_1_%20%EC%A7%81%EC%84%A0%EA%B3%BC%20%ED%8F%89%EB%A9%B4%EC%9D%98%20%EC%9C%84%EC%B9%98%20%EA%B4%80%EA%B3%84_v2.pdf?v=ea757ea4ed',
      },
    ],
    videos: [
      {
        num: 7,
        title: '직선과 평면의 위치관계',
        id: 'bbf3c969-aeba-499b-b5ce-ca7c2d39d7c2',
      },
    ],
  },
  {
    order: 7,
    title: '삼수선 정리',
    pdfs: [
      {
        name: '삼수선 정리 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/05_%EA%B3%B5%EA%B0%84%EB%8F%84%ED%98%95/2_1_2_%20%EC%82%BC%EC%88%98%EC%84%A0%20%EC%A0%95%EB%A6%AC_v2.pdf?v=a3513f908aa3',
      },
    ],
    videos: [
      {
        num: 8,
        title: '삼수선의 정리',
        id: 'ee4ebd3d-202b-4fbf-bd43-7ef04eb53473',
      },
    ],
  },
  {
    order: 8,
    title: '정사영',
    pdfs: [
      {
        name: '정사영 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/05_%EA%B3%B5%EA%B0%84%EB%8F%84%ED%98%95/2_1_3_%20%EC%A0%95%EC%82%AC%EC%98%81_v2.pdf?v=ef39ffd680',
      },
    ],
    videos: [
      {
        num: 9,
        title: '정사영',
        id: 'f1100fe5-7a9e-4a0f-a822-36bb3c09782b',
      },
    ],
  },
  {
    order: 9,
    title: '공간에서 점의 좌표와 내분점',
    pdfs: [
      {
        name: '공간에서 점의 좌표 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/06_%EA%B3%B5%EA%B0%84%EC%A2%8C%ED%91%9C/2_2_1_%20%EA%B3%B5%EA%B0%84%EC%97%90%EC%84%9C%20%EC%A0%90%EC%9D%98%20%EC%A2%8C%ED%91%9C.pdf?v=20260727',
      },
      {
        name: '공간좌표와 내분점 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/06_%EA%B3%B5%EA%B0%84%EC%A2%8C%ED%91%9C/2_2_1_%20%EA%B3%B5%EA%B0%84%EC%A2%8C%ED%91%9C%EC%99%80%20%EB%82%B4%EB%B6%84%EC%A0%90_v2.pdf?v=87aed20790',
      },
    ],
    videos: [
      {
        num: 10,
        title: '공간에서 점의 좌표',
        id: 'bff2f821-546b-4cfc-b641-859f1fc96786',
      },
      {
        num: 11,
        title: '공간좌표의 내분점',
        id: 'acdfd9fc-94df-42b6-a3d8-d74addc01458',
      },
    ],
  },
];

type PageProps = {
  readonly searchParams?: {
    readonly gate?: string | readonly string[];
  };
};

export default function DoyoungGeometrySupplementPage({ searchParams }: PageProps) {
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="기하"
      heading="도영 기하보충"
      gate={searchParams?.gate}
    >
      <ConceptSharePage subjectLabel="기하" heading="도영 기하보충" lessons={LESSONS} />
    </ConceptAccessPage>
  );
}
