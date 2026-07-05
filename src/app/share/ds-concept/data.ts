import type { ConceptLesson } from '../_components/ConceptSharePage';

export const DS_CONCEPT_PART1: readonly ConceptLesson[] = [
  {
    order: 1,
    title: '지수',
    pdfs: [
      { name: '거듭제곱과 거듭제곱근', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/01_%EC%A7%80%EC%88%98/1_1_1_%20%EA%B1%B0%EB%93%AD%EC%A0%9C%EA%B3%B1%EA%B3%BC%20%EA%B1%B0%EB%93%AD%EC%A0%9C%EA%B3%B1%EA%B7%BC.pdf' },
      { name: '지수의 확장과 지수법칙', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/01_%EC%A7%80%EC%88%98/1_1_2_%20%EC%A7%80%EC%88%98%EC%9D%98%20%ED%99%95%EC%9E%A5%EA%B3%BC%20%EC%A7%80%EC%88%98%EB%B2%95%EC%B9%99.pdf' },
    ],
    videos: [
      { num: 1, title: '대수 개념 1강 1.1.1. 거듭제곱과 거듭제곱근.mp4', id: '4a0331cc-a9ad-46ac-a61d-d64107bffd62' },
      { num: 2, title: '대수 개념 2강 1.1.2. 지수의 확장과 지수법칙.mp4', id: 'd9d0b779-6e02-4720-998d-2df13833cdb7' },
    ],
  },
  {
    order: 2,
    title: '로그',
    pdfs: [
      { name: '로그의 뜻과 성질', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/02_%EB%A1%9C%EA%B7%B8/1_1_3_%20%EB%A1%9C%EA%B7%B8%EC%9D%98%20%EB%9C%BB%EA%B3%BC%20%EC%84%B1%EC%A7%88.pdf' },
      { name: '상용로그', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/02_%EB%A1%9C%EA%B7%B8/1_1_4_%20%EC%83%81%EC%9A%A9%EB%A1%9C%EA%B7%B8.pdf' },
    ],
    videos: [
      { num: 3, title: '대수 개념 3강 1.1.3. 로그의 뜻과 성질', id: 'b9cd1477-1d4d-44d9-a5ac-a77103228ec5' },
      { num: 4, title: '대수 개념 4강 1.1.4. 상용로그.mp4', id: 'd0be9a74-fd0b-4d35-a138-5621eaedab6e' },
    ],
  },
  {
    order: 3,
    title: '지수함수, 로그함수',
    pdfs: [
      { name: '지수함수의 뜻과 그래프', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/03_%EC%A7%80%EC%88%98%ED%95%A8%EC%88%98_%EB%A1%9C%EA%B7%B8%ED%95%A8%EC%88%98/1_2_1_%20%EC%A7%80%EC%88%98%ED%95%A8%EC%88%98%EC%9D%98%20%EB%9C%BB%EA%B3%BC%20%EA%B7%B8%EB%9E%98%ED%94%84_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf' },
      { name: '로그함수의 뜻과 그래프', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/03_%EC%A7%80%EC%88%98%ED%95%A8%EC%88%98_%EB%A1%9C%EA%B7%B8%ED%95%A8%EC%88%98/1_2_2_%20%EB%A1%9C%EA%B7%B8%ED%95%A8%EC%88%98%EC%9D%98%20%EB%9C%BB%EA%B3%BC%20%EA%B7%B8%EB%9E%98%ED%94%84_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf' },
    ],
    videos: [
      { num: 5, title: '대수 개념 5강 1.2.1. 지수함수의 뜻과 그래프.mp4', id: '6cf05900-3e67-47f0-bef6-ea905f9876de' },
      { num: 6, title: '대수 개념 6강 1.2.2. 로그함수의 뜻과 그래프.mp4', id: '7ac9f40f-bef5-46ee-9b56-2e966a4c404d' },
    ],
  },
  {
    order: 4,
    title: '지수함수, 로그함수 활용',
    pdfs: [
      { name: '지수함수의 활용', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/04_%EC%A7%80%EC%88%98%EB%A1%9C%EA%B7%B8%ED%95%A8%EC%88%98_%ED%99%9C%EC%9A%A9/1_2_3_%20%EC%A7%80%EC%88%98%ED%95%A8%EC%88%98%EC%9D%98%20%ED%99%9C%EC%9A%A9.pdf' },
      { name: '로그함수의 활용', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/04_%EC%A7%80%EC%88%98%EB%A1%9C%EA%B7%B8%ED%95%A8%EC%88%98_%ED%99%9C%EC%9A%A9/1_2_4_%20%EB%A1%9C%EA%B7%B8%ED%95%A8%EC%88%98%EC%9D%98%20%ED%99%9C%EC%9A%A9.pdf' },
    ],
    videos: [
      { num: 7, title: '대수 개념 7강 1.2.3. 지수함수의 활용.mp4', id: '712b99eb-7dd5-4159-b467-3afd8d199714' },
      { num: 8, title: '대수 개념 8강 1.2.4. 로그함수의 활용.mp4', id: 'f997c460-4160-41be-92b9-0010d9e32182' },
    ],
  },
  {
    order: 5,
    title: '삼각함수',
    pdfs: [
      { name: '일반각과 호도법', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/05_%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98/2_1_1_%20%EC%9D%BC%EB%B0%98%EA%B0%81%EA%B3%BC%20%ED%98%B8%EB%8F%84%EB%B2%95_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf' },
      { name: '삼각함수', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/05_%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98/2_1_2_%20%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf' },
    ],
    videos: [
      { num: 9, title: '대수 개념 9강 2.1.1. 일반각과 호도법.mp4', id: 'a1d24968-9d0d-4d39-bd8d-83305cc05d47' },
      { num: 10, title: '대수 개념 10강 2.1.2. 삼각함수.mp4', id: '04c18f2b-8e8e-4d12-b12b-24cdcbf7deb8' },
    ],
  },
  {
    order: 6,
    title: '삼각함수의 그래프 (1)',
    pdfs: [
      { name: '삼각함수의 그래프(1)', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/06_%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98_%EA%B7%B8%EB%9E%98%ED%94%84_1/2_1_3_%20%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98%EC%9D%98%20%EA%B7%B8%EB%9E%98%ED%94%84%281%29_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf' },
    ],
    videos: [
      { num: 11, title: '대수 개념 11강 2.1.3. 삼각함수 그래프(1) 사인,코사인.mp4', id: '748bda38-e088-4f17-9a78-455611a27c03' },
    ],
  },
  {
    order: 7,
    title: '삼각함수의 그래프 (2, 3)',
    pdfs: [
      { name: '삼각함수의 그래프(2)', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/07_%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98_%EA%B7%B8%EB%9E%98%ED%94%84_2/2_1_3_%20%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98%EC%9D%98%20%EA%B7%B8%EB%9E%98%ED%94%84%282%29.pdf' },
      { name: '삼각함수의 그래프(3)', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/07_%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98_%EA%B7%B8%EB%9E%98%ED%94%84_2/2_1_3_%20%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98%EC%9D%98%20%EA%B7%B8%EB%9E%98%ED%94%84%283%29.pdf' },
    ],
    videos: [
      { num: 12, title: '대수 개념 12강 2.1.3. 삼각함수 그래프(2) 탄젠트 평행대칭이동.mp4', id: '40b1b2f1-71d2-489e-8767-a468b9b5f2ab' },
      { num: 13, title: '대수 개념 13강 2.1.3. 삼각함수 그래프(3) 방정식부등식.mp4', id: '61305c99-5d30-4dbc-9a5e-5e547b475537' },
    ],
  },
];

export const DS_CONCEPT_PART2: readonly ConceptLesson[] = [
  {
    order: 8,
    title: '사인법칙과 코사인법칙',
    pdfs: [
      { name: '사인법칙과 코사인법칙', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/08_%EC%82%AC%EC%9D%B8_%EC%BD%94%EC%82%AC%EC%9D%B8%EB%B2%95%EC%B9%99/2_1_1_%20%EC%82%AC%EC%9D%B8%EB%B2%95%EC%B9%99%EA%B3%BC%20%EC%BD%94%EC%82%AC%EC%9D%B8%EB%B2%95%EC%B9%99_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf' },
    ],
    videos: [
      { num: 14, title: '대수 개념 14강 2.2.1. 사인법칙과 코사인법칙', id: 'feda2e45-5303-4b75-b9c7-1d06577ca789' },
    ],
  },
  {
    order: 9,
    title: '수열의 뜻, 등차수열',
    pdfs: [
      { name: '수열의 뜻', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/09_%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4/3_1_1_%20%EC%88%98%EC%97%B4%EC%9D%98%20%EB%9C%BB.pdf' },
      { name: '등차수열', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/09_%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4/3_1_2_%20%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4.pdf' },
      { name: '등차수열의 합', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/09_%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4/3_1_2_%20%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4%EC%9D%98%20%ED%95%A9.pdf' },
    ],
    videos: [
      { num: 15, title: '대수 개념 15강 3.1.1. 수열의 뜻.mp4', id: 'b567c16b-ae11-4b9f-87ef-7d25f670db39' },
      { num: 16, title: '대수 개념 16강 3.1.2. 등차수열(1).mp4', id: 'f2b88484-e776-410d-8ca7-dbbb0792d146' },
      { num: 17, title: '대수 개념 17강 3.1.2. 등차수열(2) 합과 일반항.mp4', id: '248d9767-8fe7-4aeb-a943-3fd9867bc36a' },
    ],
  },
  {
    order: 10,
    title: '등비수열',
    pdfs: [
      { name: '등비수열', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/10_%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4/3_1_3_%20%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4.pdf' },
      { name: '등비수열의 합', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/10_%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4/3_1_3_%20%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4%EC%9D%98%20%ED%95%A9.pdf' },
    ],
    videos: [
      { num: 18, title: '대수 개념 18강 3.1.3. 등비수열(1) .mp4', id: 'f62215fb-9392-4630-8253-1ff68ae715c1' },
      { num: 19, title: '대수 개념 19강 3.1.3. 등비수열(2) 합.mp4', id: '3c9d13b9-b4b4-461c-aeb8-4a15b46743cd' },
    ],
  },
  {
    order: 11,
    title: '수열의 합 (시그마)',
    pdfs: [
      { name: '합의 기호 시그마', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/11_%EC%88%98%EC%97%B4%EC%9D%98%ED%95%A9_%EC%8B%9C%EA%B7%B8%EB%A7%88/3_2_1_%20%ED%95%A9%EC%9D%98%20%EA%B8%B0%ED%98%B8%20%EC%8B%9C%EA%B7%B8%EB%A7%88.pdf' },
    ],
    videos: [
      { num: 20, title: '대수 개념 20강 3.2.1. 합의 기호 시그마.mp4', id: '6eec82d7-1936-4d5d-a6c8-3cb4b6751867' },
    ],
  },
  {
    order: 12,
    title: '여러 가지 수열의 합',
    pdfs: [
      { name: '여러 가지 수열의 합', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/12_%EC%97%AC%EB%9F%AC%EA%B0%80%EC%A7%80%EC%88%98%EC%97%B4%EC%9D%98%ED%95%A9/3_2_2_%20%EC%97%AC%EB%9F%AC%20%EA%B0%80%EC%A7%80%20%EC%88%98%EC%97%B4%EC%9D%98%20%ED%95%A9_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf' },
    ],
    videos: [
      { num: 21, title: '대수 개념 21강 3.2.2. 여러가지 수열의 합.mp4', id: '5e95ea9b-cb96-4c52-9be7-2f36e522d018' },
    ],
  },
  {
    order: 13,
    title: '수열의 귀납적 정의',
    pdfs: [
      { name: '수열의 귀납적 정의', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/13_%EA%B7%80%EB%82%A9%EC%A0%81%EC%A0%95%EC%9D%98/3_2_1_%20%EC%88%98%EC%97%B4%EC%9D%98%20%EA%B7%80%EB%82%A9%EC%A0%81%20%EC%A0%95%EC%9D%98_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf' },
    ],
    videos: [
      { num: 22, title: '대수 개념 22강 3.3.1. 수열의 귀납적 정의.mp4', id: 'efa2112f-757b-4c78-a6c8-a815b21a9547' },
    ],
  },
  {
    order: 14,
    title: '수학적 귀납법',
    pdfs: [
      { name: '수학적 귀납법', url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/14_%EC%88%98%ED%95%99%EC%A0%81%EA%B7%80%EB%82%A9%EB%B2%95/3_2_2_%20%EC%88%98%ED%95%99%EC%A0%81%20%EA%B7%80%EB%82%A9%EB%B2%95_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf' },
    ],
    videos: [
      { num: 23, title: '대수 개념 23강 3.3.2. 수학적 귀납법.mp4', id: 'a568e94a-889f-41c5-b93d-e6b9deac7a61' },
    ],
  },
];
