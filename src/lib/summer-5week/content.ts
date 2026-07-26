import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';
import type { ConceptLesson } from '@/app/share/_components/ConceptSharePage';
import { DS_CONCEPT_PART1, DS_CONCEPT_PART2 } from '@/app/share/ds-concept/data';
import { MJ1_CONCEPT_PART1, MJ1_CONCEPT_PART2 } from '@/app/share/mj1-concept/data';
import type { SummerDay } from './schedule';
import { subjectCanHavePendingResources } from './schedule';
import type { SummerSubject } from './subjects';

export type DayResource = {
  readonly kind: 'pdf' | 'video';
  readonly label: string;
  readonly href: string;
};

export type DayContent =
  | {
      readonly kind: 'learning';
      readonly title: string;
      readonly resources: readonly DayResource[];
      readonly conceptBookTask: string;
      readonly typeBookTask: string;
      readonly pending: boolean;
    }
  | {
      readonly kind: 'label';
      readonly title: string;
      readonly body: string;
    };

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const GS1_LESSONS: readonly ConceptLesson[] = [
  {
    order: 1,
    title: '다항식의 연산',
    pdfs: [
      {
        name: '다항식의 사칙연산',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/01_%EB%8B%A4%ED%95%AD%EC%8B%9D%EC%97%B0%EC%82%B0/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%201.1.1.%EB%8B%A4%ED%95%AD%EC%8B%9D%EC%9D%98%20%EC%82%AC%EC%B9%99%EC%97%B0%EC%82%B0.pdf',
      },
    ],
    videos: [{ num: 1, title: '다항식의 연산', id: '0433291f-b6c1-40f6-9b95-cbfe183c81d2' }],
  },
  {
    order: 2,
    title: '나머지정리',
    pdfs: [
      {
        name: '항등식과 나머지정리',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/02_%EB%82%98%EB%A8%B8%EC%A7%80%EC%A0%95%EB%A6%AC/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%201.1.2.%20%ED%95%AD%EB%93%B1%EC%8B%9D%EA%B3%BC%20%EB%82%98%EB%A8%B8%EC%A7%80%EC%A0%95%EB%A6%AC.pdf',
      },
    ],
    videos: [{ num: 2, title: '나머지정리', id: '18d2abe9-9dcf-4288-933a-376e7a47e6ad' }],
  },
  {
    order: 3,
    title: '인수분해',
    pdfs: [
      {
        name: '다항식의 인수분해',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/03_%EC%9D%B8%EC%88%98%EB%B6%84%ED%95%B4/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%201.1.3.%20%EB%8B%A4%ED%95%AD%EC%8B%9D%EC%9D%98%20%EC%9D%B8%EC%88%98%EB%B6%84%ED%95%B4.pdf',
      },
    ],
    videos: [{ num: 3, title: '인수분해', id: '715d2be6-b623-41fd-b57c-712311ef865d' }],
  },
  {
    order: 4,
    title: '복소수',
    pdfs: [
      {
        name: '복소수의 뜻과 성질',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/04_%EB%B3%B5%EC%86%8C%EC%88%98/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.1.1.%20%EB%B3%B5%EC%86%8C%EC%88%98%EC%9D%98%20%EB%9C%BB%EA%B3%BC%20%EC%84%B1%EC%A7%88.pdf',
      },
    ],
    videos: [{ num: 4, title: '복소수', id: 'c108f45e-ada8-4b12-8690-8dcc3acced2e' }],
  },
  {
    order: 5,
    title: '이차방정식의 풀이',
    pdfs: [
      {
        name: '이차방정식의 풀이 · 판별식',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/05_%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.1.2.%20%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D%EC%9D%98%20%ED%92%80%EC%9D%B4.pdf',
      },
    ],
    videos: [{ num: 5, title: '이차방정식의 풀이', id: '39fdef7f-4e14-4bea-a357-2e1a3595040f' }],
  },
  {
    order: 6,
    title: '이차방정식의 근과 계수',
    pdfs: [
      {
        name: '근과 계수의 관계',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/05_%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.1.3.%20%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D%EC%9D%98%20%EA%B7%BC%EA%B3%BC%20%EA%B3%84%EC%88%98%EC%9D%98%20%EA%B4%80%EA%B3%84.pdf',
      },
    ],
    videos: [{ num: 6, title: '이차방정식의 근과 계수', id: '92d6e5f4-5084-49ec-879e-34bb72a1158d' }],
  },
  {
    order: 7,
    title: '이차방정식과 이차함수의 관계',
    pdfs: [
      {
        name: '이차방정식과 이차함수의 관계',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/06_%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EA%B4%80%EA%B3%84/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.2.1.%20%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D%EA%B3%BC%20%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EC%9D%98%20%EA%B4%80%EA%B3%84.pdf',
      },
    ],
    videos: [
      {
        num: 7,
        title: '이차방정식과 이차함수의 관계',
        id: '31a2bfa9-6d91-4f33-bddc-e89409e6b50d',
      },
    ],
  },
  {
    order: 8,
    title: '이차함수의 그래프와 최대·최소',
    pdfs: [
      {
        name: '이차함수 그래프와 직선의 위치관계',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/06_%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EA%B4%80%EA%B3%84/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.2.2.%20%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EC%9D%98%20%EA%B7%B8%EB%9E%98%ED%94%84%EC%99%80%20%EC%A7%81%EC%84%A0%EC%9D%98%20%EC%9C%84%EC%B9%98%20%EA%B4%80%EA%B3%84.pdf',
      },
      {
        name: '이차함수의 최대·최소',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/07_%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EC%B5%9C%EB%8C%80%EC%B5%9C%EC%86%8C/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.2.3.%20%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EC%9D%98%20%EC%B5%9C%EB%8C%80-%EC%B5%9C%EC%86%8C.pdf',
      },
    ],
    videos: [
      { num: 8, title: '이차함수 그래프와 직선의 위치관계', id: '2bb74c4f-a1e4-49c7-9599-e13c701ce615' },
      { num: 9, title: '이차함수의 최대·최소', id: '956cbf02-6a1e-4dd3-a660-dab0db1f5704' },
    ],
  },
  {
    order: 9,
    title: '삼차·사차방정식',
    pdfs: [
      {
        name: '삼차방정식과 사차방정식의 풀이',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/09_%EC%82%BC%EC%B0%A8%EC%82%AC%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D/2_3_1_%20%EC%82%BC%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D%EA%B3%BC%20%EC%82%AC%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D%EC%9D%98%20%ED%92%80%EC%9D%B4.pdf',
      },
    ],
    videos: [{ num: 10, title: '삼차·사차방정식', id: '2c8416f6-7e0d-4478-bfee-87fca1c96c7b' }],
  },
  {
    order: 10,
    title: '연립이차방정식',
    pdfs: [
      {
        name: '미지수가 2개인 연립이차방정식',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/10_%EC%97%B0%EB%A6%BD%EB%B0%A9%EC%A0%95%EC%8B%9D%EB%B6%80%EB%93%B1%EC%8B%9D/2_3_2_%20%EB%AF%B8%EC%A7%80%EC%88%98%EA%B0%80%202%EA%B0%9C%EC%9D%B8%20%EC%97%B0%EB%A6%BD%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D.pdf',
      },
    ],
    videos: [{ num: 11, title: '연립이차방정식', id: '2025c5d5-d6fc-4e4c-95c8-d8ee33243220' }],
  },
  {
    order: 11,
    title: '연립일차부등식',
    pdfs: [
      {
        name: '미지수가 1개인 연립일차부등식',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/10_%EC%97%B0%EB%A6%BD%EB%B0%A9%EC%A0%95%EC%8B%9D%EB%B6%80%EB%93%B1%EC%8B%9D/2_3_3_%20%EB%AF%B8%EC%A7%80%EC%88%98%EA%B0%80%201%EA%B0%9C%EC%9D%B8%20%EC%97%B0%EB%A6%BD%EC%9D%BC%EC%B0%A8%EB%B6%80%EB%93%B1%EC%8B%9D.pdf',
      },
    ],
    videos: [{ num: 12, title: '연립일차부등식', id: 'c3ddef0e-2d08-4ec3-8e0b-b8559b8b24fc' }],
  },
  {
    order: 12,
    title: '절댓값 부등식',
    pdfs: [
      {
        name: '절댓값을 포함한 일차부등식',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/11_%EC%A0%88%EB%8C%93%EA%B0%92%EB%B6%80%EB%93%B1%EC%8B%9D/2_3_4_%20%EC%A0%88%EB%8C%93%EA%B0%92%EC%9D%84%20%ED%8F%AC%ED%95%A8%ED%95%9C%20%EC%9D%BC%EC%B0%A8%EB%B6%80%EB%93%B1%EC%8B%9D.pdf',
      },
    ],
    videos: [{ num: 13, title: '절댓값 부등식', id: 'ee73dced-37ce-45fa-9282-229caa58ba3d' }],
  },
  {
    order: 13,
    title: '이차부등식과 연립이차부등식',
    pdfs: [
      {
        name: '이차부등식과 연립이차부등식',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/12_%EC%9D%B4%EC%B0%A8%EB%B6%80%EB%93%B1%EC%8B%9D/2_3_5_%20%EC%9D%B4%EC%B0%A8%EB%B6%80%EB%93%B1%EC%8B%9D%EA%B3%BC%20%EC%97%B0%EB%A6%BD%EC%9D%B4%EC%B0%A8%EB%B6%80%EB%93%B1%EC%8B%9D.pdf',
      },
    ],
    videos: [{ num: 14, title: '이차부등식', id: 'b237de19-3deb-499c-8e23-d9f972e97ed0' }],
  },
  {
    order: 14,
    title: '경우의 수',
    pdfs: [
      {
        name: '합의 법칙과 곱의 법칙',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/13_%EA%B2%BD%EC%9A%B0%EC%9D%98%EC%88%98/3_1_1_%20%ED%95%A9%EC%9D%98%EB%B2%95%EC%B9%99%EA%B3%BC%20%EA%B3%B1%EC%9D%98%20%EB%B2%95%EC%B9%99.pdf',
      },
    ],
    videos: [{ num: 15, title: '경우의 수', id: '207e2f00-3531-4ab0-a1a9-18c03eaa2627' }],
  },
  {
    order: 15,
    title: '순열',
    pdfs: [
      {
        name: '순열',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/13_%EA%B2%BD%EC%9A%B0%EC%9D%98%EC%88%98/3_2_1_%20%EC%88%9C%EC%97%B4.pdf',
      },
    ],
    videos: [{ num: 16, title: '순열', id: 'dd9d9ac5-9c18-4120-bb30-d2db53547275' }],
  },
  {
    order: 16,
    title: '조합',
    pdfs: [
      {
        name: '조합',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/14_%EC%A1%B0%ED%95%A9/3_2_2_%20%EC%A1%B0%ED%95%A9.pdf',
      },
    ],
    videos: [{ num: 17, title: '조합', id: 'ebefa957-f079-4403-9b9a-46f6b753ba36' }],
  },
  {
    order: 17,
    title: '행렬',
    pdfs: [
      {
        name: '행렬의 정의',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/15_%ED%96%89%EB%A0%AC/4_1_1_%20%ED%96%89%EB%A0%AC.pdf',
      },
    ],
    videos: [{ num: 18, title: '행렬', id: '0d284cfa-e18d-40d0-9c62-19b524697ba7' }],
  },
  {
    order: 18,
    title: '행렬의 연산',
    pdfs: [
      {
        name: '행렬의 연산',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/15_%ED%96%89%EB%A0%AC/4_1_2_%20%ED%96%89%EB%A0%AC%EC%9D%98%20%EC%97%B0%EC%82%B0.pdf',
      },
    ],
    videos: [{ num: 19, title: '행렬의 연산', id: 'bd1d8cc5-1755-49dd-9b85-01e4bef9cedd' }],
  },
];

const DS_LESSONS = [...DS_CONCEPT_PART1, ...DS_CONCEPT_PART2];
const MJ1_LESSONS = [...MJ1_CONCEPT_PART1, ...MJ1_CONCEPT_PART2];
const GS2_LESSONS: readonly ConceptLesson[] = [
  {
    order: 1,
    title: '선분의 내분점',
    pdfs: [
      {
        name: '선분의 내분, 내분점의 좌표 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/01_%EB%8F%84%ED%98%95%EC%9D%98%EB%B0%A9%EC%A0%95%EC%8B%9D/1_1_1_%20%E1%84%89%E1%85%A5%E1%86%AB%E1%84%87%E1%85%AE%E1%86%AB%E1%84%8B%E1%85%B4%20%E1%84%82%E1%85%A2%E1%84%87%E1%85%AE%E1%86%AB_%E1%84%82%E1%85%A2%E1%84%87%E1%85%AE%E1%86%AB%E1%84%8C%E1%85%A5%E1%86%B7%E1%84%8B%E1%85%B4%20%E1%84%8C%E1%85%AA%E1%84%91%E1%85%AD.pdf?v=dd28d0ba5c',
      },
    ],
    videos: [{ num: 1, title: '선분의 내분점', id: 'd8ac7347-08c2-4e18-889c-945912bb343c' }],
  },
  {
    order: 2,
    title: '직선의 방정식·위치관계·거리',
    pdfs: [
      {
        name: '두 직선의 평행 조건과 수직 조건 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/01_%EB%8F%84%ED%98%95%EC%9D%98%EB%B0%A9%EC%A0%95%EC%8B%9D/1_2_1_%20%E1%84%83%E1%85%AE%20%E1%84%8C%E1%85%B5%E1%86%A8%E1%84%89%E1%85%A5%E1%86%AB%E1%84%8B%E1%85%B4%20%E1%84%91%E1%85%A7%E1%86%BC%E1%84%92%E1%85%A2%E1%86%BC%20%E1%84%8C%E1%85%A9%E1%84%80%E1%85%A5%E1%86%AB%E1%84%80%E1%85%AA%20%E1%84%89%E1%85%AE%E1%84%8C%E1%85%B5%E1%86%A8%20%E1%84%8C%E1%85%A9%E1%84%80%E1%85%A5%E1%86%AB.pdf?v=123598d795',
      },
      {
        name: '점과 직선 사이의 거리 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/01_%EB%8F%84%ED%98%95%EC%9D%98%EB%B0%A9%EC%A0%95%EC%8B%9D/1_2_2_%20%E1%84%8C%E1%85%A5%E1%86%B7%E1%84%80%E1%85%AA%20%E1%84%8C%E1%85%B5%E1%86%A8%E1%84%89%E1%85%A5%E1%86%AB%20%E1%84%89%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%8B%E1%85%B4%20%E1%84%80%E1%85%A5%E1%84%85%E1%85%B5.pdf?v=374cf8f3c0',
      },
    ],
    videos: [
      { num: 2, title: '직선의 방정식', id: '088e36a4-926e-4876-849b-cea45e5b62c6' },
      { num: 3, title: '두 직선의 위치관계', id: '522649b4-452f-45d4-bc4c-bb1c12b637e4' },
      { num: 4, title: '점과 직선 사이의 거리', id: '9b63b85f-18de-4ea4-a6ee-c26b916e1daa' },
    ],
  },
  {
    order: 3,
    title: '원의 방정식과 그래프',
    pdfs: [
      {
        name: '원의 방정식과 그래프 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/02_%EC%9B%90%EC%9D%98%EA%B8%B0%EC%B4%88/1_3_1_%20%EC%9B%90%EC%9D%98%20%EB%B0%A9%EC%A0%95%EC%8B%9D%EA%B3%BC%20%EA%B7%B8%EB%9E%98%ED%94%84.pdf?v=6f1d47bb3851',
      },
    ],
    videos: [{ num: 5, title: '원의 방정식과 그래프', id: '7f6b2c8d-f52d-42b7-8348-1d7b6769b3ff' }],
  },
  {
    order: 4,
    title: '원과 직선의 위치관계',
    pdfs: [
      {
        name: '원과 직선의 위치관계 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/02_%EC%9B%90%EC%9D%98%EA%B8%B0%EC%B4%88/1_3_2_%20%EC%A2%8C%ED%91%9C%ED%8F%89%EB%A9%B4%EC%97%90%EC%84%9C%20%EC%9B%90%EA%B3%BC%20%EC%A7%81%EC%84%A0%EC%9D%98%20%EC%9C%84%EC%B9%98%20%EA%B4%80%EA%B3%84.pdf?v=da2a6213c364',
      },
    ],
    videos: [{ num: 6, title: '원과 직선의 위치관계', id: '345facc4-4e4e-4089-bf6f-03ec0bbe77d5' }],
  },
  {
    order: 5,
    title: '평행이동·대칭이동',
    pdfs: [
      {
        name: '평행이동 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/03_%EB%8F%84%ED%98%95%EC%9D%98%EC%9D%B4%EB%8F%99/1_4_1_%20%ED%8F%89%ED%96%89%EC%9D%B4%EB%8F%99.pdf?v=0ff2a86a29',
      },
      {
        name: '대칭이동 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/03_%EB%8F%84%ED%98%95%EC%9D%98%EC%9D%B4%EB%8F%99/1_4_2_%20%EB%8C%80%EC%B9%AD%EC%9D%B4%EB%8F%99.pdf?v=efc24ed166',
      },
    ],
    videos: [
      { num: 7, title: '평행이동', id: '11c31370-fedf-4216-88d8-6f4a56174877' },
      { num: 8, title: '대칭이동', id: 'cd457a3e-b487-4342-964d-d1139dba5bc2' },
    ],
  },
  {
    order: 6,
    title: '집합의 개념과 표현',
    pdfs: [
      {
        name: '집합의 개념과 표현 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/04_%EC%A7%91%ED%95%A9/2_1_1_%20%EC%A7%91%ED%95%A9%EC%9D%98%20%EA%B0%9C%EB%85%90%EA%B3%BC%20%ED%91%9C%ED%98%84_v2.pdf?v=d7f674333a',
      },
    ],
    videos: [{ num: 9, title: '집합의 개념과 표현', id: '0c8fe127-d314-4505-a2db-a31e67ae0c4a' }],
  },
  {
    order: 7,
    title: '집합의 포함관계',
    pdfs: [
      {
        name: '두 집합 사이의 포함관계 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/04_%EC%A7%91%ED%95%A9/2_1_2_%20%EB%91%90%20%EC%A7%91%ED%95%A9%20%EC%82%AC%EC%9D%B4%EC%9D%98%20%ED%8F%AC%ED%95%A8%EA%B4%80%EA%B3%84.pdf?v=f4012bf5aa',
      },
    ],
    videos: [{ num: 10, title: '두 집합 사이의 포함관계', id: '884e061a-d1c1-45ca-8d35-e3a059d4d4c0' }],
  },
  {
    order: 8,
    title: '집합의 연산',
    pdfs: [
      {
        name: '집합의 연산과 벤 다이어그램 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/04_%EC%A7%91%ED%95%A9/2_1_3_%20%EC%A7%91%ED%95%A9%EC%9D%98%20%EC%97%B0%EC%82%B0%EA%B3%BC%20%EB%B2%A4%20%EB%8B%A4%EC%9D%B4%EC%96%B4%EA%B7%B8%EB%9E%A8.pdf?v=d8ba6ebe01',
      },
    ],
    videos: [{ num: 11, title: '집합의 연산과 벤 다이어그램', id: '7448cad6-95ae-4a0b-9d7f-ee90c53ecb48' }],
  },
  {
    order: 9,
    title: '중간범위 정리',
    pdfs: [],
    videos: [],
  },
  {
    order: 10,
    title: '명제와 조건',
    pdfs: [],
    videos: [],
  },
  {
    order: 11,
    title: '역·대우와 충분·필요조건',
    pdfs: [],
    videos: [],
  },
  {
    order: 12,
    title: '증명법과 절대부등식',
    pdfs: [],
    videos: [],
  },
  {
    order: 13,
    title: '함수의 개념과 그래프',
    pdfs: [],
    videos: [],
  },
  {
    order: 14,
    title: '함수의 합성',
    pdfs: [],
    videos: [],
  },
  {
    order: 15,
    title: '역함수',
    pdfs: [],
    videos: [],
  },
  {
    order: 16,
    title: '유리함수·무리함수 그래프',
    pdfs: [],
    videos: [],
  },
];
const GH_LESSONS: readonly ConceptLesson[] = [
  {
    order: 1,
    title: '포물선의 방정식',
    pdfs: [
      {
        name: '포물선 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/01_%ED%8F%AC%EB%AC%BC%EC%84%A0/1_1_1_%20%ED%8F%AC%EB%AC%BC%EC%84%A0.pdf',
      },
    ],
    videos: [{ num: 1, title: '포물선의 방정식', id: '8ff0facc-145e-4852-81ac-183dbbd668de' }],
  },
  {
    order: 2,
    title: '타원의 방정식',
    pdfs: [
      {
        name: '타원 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/02_%ED%83%80%EC%9B%90/1_1_2_%20%ED%83%80%EC%9B%90_v2.pdf',
      },
    ],
    videos: [{ num: 2, title: '타원의 방정식', id: '9b04fbd3-018d-44b7-af35-7a2bd3d6f2c3' }],
  },
  {
    order: 3,
    title: '쌍곡선과 이차곡선',
    pdfs: [
      {
        name: '쌍곡선과 이차곡선 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/03_%EC%8C%8D%EA%B3%A1%EC%84%A0_%EC%9D%B4%EC%B0%A8%EA%B3%A1%EC%84%A0/1_1_3_%20%EC%8C%8D%EA%B3%A1%EC%84%A0%EA%B3%BC%20%EC%9D%B4%EC%B0%A8%EA%B3%A1%EC%84%A0.pdf?v=3af2c760d57f',
      },
    ],
    videos: [{ num: 3, title: '쌍곡선과 이차곡선', id: '71c74973-b9cf-4a62-b328-f03272f3a4bb' }],
  },
  {
    order: 4,
    title: '포물선의 접선과 타원의 접선',
    pdfs: [
      {
        name: '포물선의 접선의 방정식 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/04_%EC%A0%91%EC%84%A0/1_2_1_%20%ED%8F%AC%EB%AC%BC%EC%84%A0%EC%9D%98%20%EC%A0%91%EC%84%A0%EC%9D%98%20%EB%B0%A9%EC%A0%95%EC%8B%9D.pdf?v=9c91b0efeeac',
      },
      {
        name: '타원의 접선의 방정식 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/04_%EC%A0%91%EC%84%A0/1_2_2_%20%ED%83%80%EC%9B%90%EC%9D%98%20%EC%A0%91%EC%84%A0%EC%9D%98%20%EB%B0%A9%EC%A0%95%EC%8B%9D.pdf?v=46f4abc657fc',
      },
    ],
    videos: [
      { num: 4, title: '포물선의 접선의 방정식', id: 'f961c224-b7c3-431f-b2e0-6e16dae0114c' },
      { num: 5, title: '타원의 접선의 방정식', id: 'e982297d-6795-455e-b273-a34e4f9306cd' },
    ],
  },
  {
    order: 5,
    title: '쌍곡선의 접선의 방정식',
    pdfs: [
      {
        name: '쌍곡선의 접선의 방정식 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/04_%EC%A0%91%EC%84%A0/1_2_3_%20%EC%8C%8D%EA%B3%A1%EC%84%A0%EC%9D%98%20%EC%A0%91%EC%84%A0%EC%9D%98%20%EB%B0%A9%EC%A0%95%EC%8B%9D_v2.pdf?v=bd9839bf2210',
      },
    ],
    videos: [{ num: 6, title: '쌍곡선의 접선의 방정식', id: 'bc46aa35-74c5-4168-97d0-a1ccef7a6572' }],
  },
  {
    order: 6,
    title: '직선과 평면의 위치 관계',
    pdfs: [
      {
        name: '직선과 평면의 위치 관계 개념노트',
        url: 'https://mathgo-pdfs.b-cdn.net/concept/gh/05_%EA%B3%B5%EA%B0%84%EB%8F%84%ED%98%95/2_1_1_%20%EC%A7%81%EC%84%A0%EA%B3%BC%20%ED%8F%89%EB%A9%B4%EC%9D%98%20%EC%9C%84%EC%B9%98%20%EA%B4%80%EA%B3%84_v2.pdf?v=ea757ea4ed',
      },
    ],
    videos: [{ num: 7, title: '직선과 평면의 위치관계', id: 'bbf3c969-aeba-499b-b5ce-ca7c2d39d7c2' }],
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
    videos: [{ num: 8, title: '삼수선의 정리', id: 'ee4ebd3d-202b-4fbf-bd43-7ef04eb53473' }],
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
    videos: [{ num: 9, title: '정사영', id: 'f1100fe5-7a9e-4a0f-a822-36bb3c09782b' }],
  },
  {
    order: 9,
    title: '공간에서 점의 좌표',
    pdfs: [],
    videos: [],
  },
  {
    order: 10,
    title: '공간좌표와 내분점',
    pdfs: [],
    videos: [],
  },
  {
    order: 11,
    title: '구의 방정식',
    pdfs: [],
    videos: [],
  },
  {
    order: 12,
    title: '벡터의 덧셈·뺄셈과 실수배',
    pdfs: [],
    videos: [],
  },
  {
    order: 13,
    title: '위치벡터와 벡터의 성분',
    pdfs: [],
    videos: [],
  },
  {
    order: 14,
    title: '벡터의 내적',
    pdfs: [],
    videos: [],
  },
  {
    order: 15,
    title: '직선의 방정식',
    pdfs: [],
    videos: [],
  },
  {
    order: 16,
    title: '평면과 구의 방정식',
    pdfs: [],
    videos: [],
  },
];

const SUBJECT_LESSONS: Partial<Record<SummerSubject, readonly ConceptLesson[]>> = {
  gs1: GS1_LESSONS,
  gs2: GS2_LESSONS,
  ds: DS_LESSONS,
  mj1: MJ1_LESSONS,
  gh: GH_LESSONS,
};

function lessonResources(lesson: ConceptLesson): readonly DayResource[] {
  return [
    ...lesson.pdfs.map((pdf) => ({ kind: 'pdf' as const, label: pdf.name, href: pdf.url })),
    ...lesson.videos.map((video) => ({
      kind: 'video' as const,
      label: `${video.num}강 ${video.title.replace(/\.mp4$/i, '')}`,
      href: EMBED(video.id),
    })),
  ];
}

function labelContent(day: SummerDay): DayContent {
  if (day.role === 'review') {
    return { kind: 'label', title: '오답 총정리', body: '별도 학습 페이지 없이 수업 중 오답과 질문을 정리합니다.' };
  }
  if (day.role === 'mock') {
    return { kind: 'label', title: day.title, body: '시험 운영일입니다. 자료 링크는 따로 공개하지 않습니다.' };
  }
  if (day.role === 'rest') {
    return { kind: 'label', title: '휴식', body: '오늘은 정규 학습 자료 공개가 없습니다.' };
  }
  return { kind: 'label', title: '보충 / 질문', body: '수업 보충, 질문, 과제 점검을 위한 날입니다.' };
}

function dsLessonForDay(learningNumber: number): ConceptLesson | undefined {
  if (learningNumber <= 7) return DS_LESSONS[learningNumber - 1];
  if (learningNumber === 8) {
    const graphLesson = DS_LESSONS[6];
    if (!graphLesson) return undefined;
    return { ...graphLesson, title: '삼각함수 그래프 정리' };
  }
  return DS_LESSONS[learningNumber - 2];
}

function mj1LessonForDay(learningNumber: number): ConceptLesson | undefined {
  if (learningNumber <= 9) return MJ1_LESSONS[learningNumber - 1];
  if (learningNumber === 10) {
    const graphLesson = MJ1_LESSONS[8];
    if (!graphLesson) return undefined;
    return { ...graphLesson, title: '함수의 그래프 정리' };
  }
  return MJ1_LESSONS[learningNumber - 2];
}

function lessonForDay(subject: SummerSubject, learningNumber: number): ConceptLesson | undefined {
  if (subject === 'ds') return dsLessonForDay(learningNumber);
  if (subject === 'mj1') return mj1LessonForDay(learningNumber);
  return SUBJECT_LESSONS[subject]?.[learningNumber - 1];
}

export function contentForDay(subject: SummerSubject, day: SummerDay): DayContent {
  if (day.role !== 'learning' || day.learningNumber === null) return labelContent(day);

  const lesson = lessonForDay(subject, day.learningNumber);
  if (!lesson) {
    if (!subjectCanHavePendingResources(subject)) {
      return {
        kind: 'learning',
        title: `${day.learningNumber}일차 누적 학습`,
        resources: [],
        conceptBookTask: '수업 안내 범위의 개념노트 진행',
        typeBookTask: '개념서와 유형서 공통 과제 진행',
        pending: false,
      };
    }

    return {
      kind: 'learning',
      title: `${day.learningNumber}일차 학습 예정`,
      resources: [],
      conceptBookTask: '개념노트와 영상이 준비되는 대로 공개됩니다.',
      typeBookTask: '수업 안내에 따라 공통 과제를 진행하세요.',
      pending: true,
    };
  }

  const resources = lessonResources(lesson);
  const pending = subjectCanHavePendingResources(subject) && resources.length === 0;
  return {
    kind: 'learning',
    title: lesson.title,
    resources,
    conceptBookTask: pending
      ? `${lesson.title} 범위로 수업 예정입니다. 개념노트와 영상은 업로드 후 연결됩니다.`
      : `${lesson.title} 개념노트를 먼저 풀고 영상으로 확인하세요.`,
    typeBookTask: '유형서는 수업에서 안내한 공통 범위를 진행하고 질문을 표시해 오세요.',
    pending,
  };
}
