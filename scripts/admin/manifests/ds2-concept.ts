/**
 * [대수] 개념강의 14차시 매니페스트 (시그니처 교재 기준)
 *
 * 원본 노션: https://www.notion.so/2cfbb7915b7180e1816eda4009030c3e
 * Bunny Stream Library: 566809
 * PDF Drive 폴더: content/ds_concept/  (※ subject_slug 는 ds2, 폴더는 ds_concept)
 * CDN 업로드 prefix: concept/ds2/<subfolder>/<filename>
 *
 * Notion 추출 (자동): `npm run admin:extract-notion -- --subject ds2`
 *
 * 알려진 누락 PDF (rebuild 시 자동 skip):
 *   - 6차시  06_삼각함수_그래프_1/2_1_3_ 삼각함수의 그래프(2).pdf
 *   - 11차시 11_수열의합_시그마/등차, 등비 추가 학습지#1_문제지.pdf
 */

import type { ConceptLecture } from './gs1-concept.js';

export const DS2_CONCEPT_SUBJECT_SLUG = 'ds2';
export const DS2_CONCEPT_CURRICULUM_TITLE = '[대수] 개념강의';
export const DS2_CONCEPT_PDF_BASE = 'content/ds_concept';
export const DS2_CONCEPT_CDN_PREFIX = 'concept/ds2';

export const DS2_CONCEPT_LECTURES: ConceptLecture[] = [
  {
    session: 1,
    title: '대수 1차시 1.1. 지수',
    videos: [
      { bunny_video_id: '4a0331cc-a9ad-46ac-a61d-d64107bffd62', title: '대수 1차시 1.1. 지수 - 1', order_index: 0 },
      { bunny_video_id: 'd9d0b779-6e02-4720-998d-2df13833cdb7', title: '대수 1차시 1.1. 지수 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '01_지수/1_1_1_ 거듭제곱과 거듭제곱근.pdf',
        filename: '1_1_1_ 거듭제곱과 거듭제곱근.pdf',
      },
      {
        relativePath: '01_지수/1_1_2_ 지수의 확장과 지수법칙.pdf',
        filename: '1_1_2_ 지수의 확장과 지수법칙.pdf',
      },
    ],
  },
  {
    session: 2,
    title: '대수 2차시 1.1. 로그',
    videos: [
      { bunny_video_id: 'b9cd1477-1d4d-44d9-a5ac-a77103228ec5', title: '대수 2차시 1.1. 로그 - 1', order_index: 0 },
      { bunny_video_id: 'd0be9a74-fd0b-4d35-a138-5621eaedab6e', title: '대수 2차시 1.1. 로그 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '02_로그/1_1_3_ 로그의 뜻과 성질.pdf',
        filename: '1_1_3_ 로그의 뜻과 성질.pdf',
      },
      {
        relativePath: '02_로그/1_1_4_ 상용로그.pdf',
        filename: '1_1_4_ 상용로그.pdf',
      },
    ],
  },
  {
    session: 3,
    title: '대수 3차시 지수함수, 로그함수',
    videos: [
      { bunny_video_id: 'a126000f-f02d-4d5c-9aa1-1fc422b0dfe2', title: '대수 3차시 지수함수, 로그함수 - 1', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '03_지수함수_로그함수/1_2_1_ 지수함수의 뜻과 그래프_문제지.pdf',
        filename: '1_2_1_ 지수함수의 뜻과 그래프_문제지.pdf',
      },
      {
        relativePath: '03_지수함수_로그함수/1_2_2_ 로그함수의 뜻과 그래프_문제지.pdf',
        filename: '1_2_2_ 로그함수의 뜻과 그래프_문제지.pdf',
      },
    ],
  },
  {
    session: 4,
    title: '대수 4차시 지수로그함수 활용',
    videos: [
      { bunny_video_id: '712b99eb-7dd5-4159-b467-3afd8d199714', title: '대수 4차시 지수로그함수 활용 - 1', order_index: 0 },
      { bunny_video_id: 'f997c460-4160-41be-92b9-0010d9e32182', title: '대수 4차시 지수로그함수 활용 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '04_지수로그함수_활용/1_2_3_ 지수함수의 활용.pdf',
        filename: '1_2_3_ 지수함수의 활용.pdf',
      },
      {
        relativePath: '04_지수로그함수_활용/1_2_4_ 로그함수의 활용.pdf',
        filename: '1_2_4_ 로그함수의 활용.pdf',
      },
    ],
  },
  {
    session: 5,
    title: '대수 5차시 삼각함수',
    videos: [
      { bunny_video_id: 'eded7e58-5cf2-4cc5-914c-f8910d58cbf2', title: '대수 5차시 삼각함수 - 1', order_index: 0 },
      { bunny_video_id: '56fe4f06-9fb9-4378-965c-10ce506e2ef3', title: '대수 5차시 삼각함수 - 2', order_index: 1 },
      { bunny_video_id: '04c18f2b-8e8e-4d12-b12b-24cdcbf7deb8', title: '대수 5차시 삼각함수 - 3', order_index: 2 },
    ],
    pdfs: [
      {
        relativePath: '05_삼각함수/2_1_1_ 일반각과 호도법_문제지.pdf',
        filename: '2_1_1_ 일반각과 호도법_문제지.pdf',
      },
      {
        relativePath: '05_삼각함수/2_1_2_ 삼각함수_문제지.pdf',
        filename: '2_1_2_ 삼각함수_문제지.pdf',
      },
    ],
  },
  {
    session: 6,
    title: '대수 6차시 2.1. 삼각함수의 그래프 (1)',
    videos: [
      { bunny_video_id: '748bda38-e088-4f17-9a78-455611a27c03', title: '대수 6차시 2.1. 삼각함수의 그래프 (1) - 1', order_index: 0 },
      { bunny_video_id: '40b1b2f1-71d2-489e-8767-a468b9b5f2ab', title: '대수 6차시 2.1. 삼각함수의 그래프 (1) - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '06_삼각함수_그래프_1/2_1_3_ 삼각함수의 그래프(1)_문제지.pdf',
        filename: '2_1_3_ 삼각함수의 그래프(1)_문제지.pdf',
      },
      {
        relativePath: '06_삼각함수_그래프_1/2_1_3_ 삼각함수의 그래프(2).pdf',
        filename: '2_1_3_ 삼각함수의 그래프(2).pdf',
      },
    ],
  },
  {
    session: 7,
    title: '대수 7차시 2.1. 삼각함수의 그래프 (2) 및 중단원 마무리',
    videos: [
      { bunny_video_id: '61305c99-5d30-4dbc-9a5e-5e547b475537', title: '대수 7차시 2.1. 삼각함수의 그래프 (2) 및 중단원 마무리 - 1', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '07_삼각함수_그래프_2/2_1_3_ 삼각함수의 그래프(3).pdf',
        filename: '2_1_3_ 삼각함수의 그래프(3).pdf',
      },
    ],
  },
  {
    session: 8,
    title: '대수 8차시 2.2. 사인법칙 코사인법칙',
    videos: [
      { bunny_video_id: 'feda2e45-5303-4b75-b9c7-1d06577ca789', title: '대수 8차시 2.2. 사인법칙 코사인법칙 - 1', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '08_사인_코사인법칙/2_1_1_ 사인법칙과 코사인법칙_문제지.pdf',
        filename: '2_1_1_ 사인법칙과 코사인법칙_문제지.pdf',
      },
    ],
  },
  {
    session: 9,
    title: '대수 9차시 2.2. 등차수열',
    videos: [
      { bunny_video_id: 'b567c16b-ae11-4b9f-87ef-7d25f670db39', title: '대수 9차시 2.2. 등차수열 - 1', order_index: 0 },
      { bunny_video_id: 'f2b88484-e776-410d-8ca7-dbbb0792d146', title: '대수 9차시 2.2. 등차수열 - 2', order_index: 1 },
      { bunny_video_id: '248d9767-8fe7-4aeb-a943-3fd9867bc36a', title: '대수 9차시 2.2. 등차수열 - 3', order_index: 2 },
    ],
    pdfs: [
      {
        relativePath: '09_등차수열/3_1_1_ 수열의 뜻.pdf',
        filename: '3_1_1_ 수열의 뜻.pdf',
      },
      {
        relativePath: '09_등차수열/3_1_2_ 등차수열.pdf',
        filename: '3_1_2_ 등차수열.pdf',
      },
      {
        relativePath: '09_등차수열/3_1_2_ 등차수열의 합.pdf',
        filename: '3_1_2_ 등차수열의 합.pdf',
      },
    ],
  },
  {
    session: 10,
    title: '대수 10차시 3.1. 등비수열 및 중단원 마무리',
    videos: [
      { bunny_video_id: 'f62215fb-9392-4630-8253-1ff68ae715c1', title: '대수 10차시 3.1. 등비수열 및 중단원 마무리 - 1', order_index: 0 },
      { bunny_video_id: '3c9d13b9-b4b4-461c-aeb8-4a15b46743cd', title: '대수 10차시 3.1. 등비수열 및 중단원 마무리 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '10_등비수열/3_1_3_ 등비수열.pdf',
        filename: '3_1_3_ 등비수열.pdf',
      },
      {
        relativePath: '10_등비수열/3_1_3_ 등비수열의 합.pdf',
        filename: '3_1_3_ 등비수열의 합.pdf',
      },
    ],
  },
  {
    session: 11,
    title: '대수 11차시 3.2. 수열의 합: 합의 기호 ∑의 성질',
    videos: [
      { bunny_video_id: '6eec82d7-1936-4d5d-a6c8-3cb4b6751867', title: '대수 11차시 3.2. 수열의 합: 합의 기호 ∑의 성질 - 1', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '11_수열의합_시그마/3_2_1_ 합의 기호 시그마.pdf',
        filename: '3_2_1_ 합의 기호 시그마.pdf',
      },
      {
        relativePath: '11_수열의합_시그마/등차, 등비 추가 학습지#1_문제지.pdf',
        filename: '등차, 등비 추가 학습지#1_문제지.pdf',
      },
    ],
  },
  {
    session: 12,
    title: '대수 12차시 3.2. 수열의 합: 여러 가지 수열의 합 및 중단원 마무리',
    videos: [
      { bunny_video_id: '5e95ea9b-cb96-4c52-9be7-2f36e522d018', title: '대수 12차시 3.2. 수열의 합: 여러 가지 수열의 합 및 중단원 마무리 - 1', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '12_여러가지수열의합/3_2_2_ 여러 가지 수열의 합_문제지.pdf',
        filename: '3_2_2_ 여러 가지 수열의 합_문제지.pdf',
      },
    ],
  },
  {
    session: 13,
    title: '대수 13차시 3.3. 수열의 귀납적 정의',
    videos: [
      { bunny_video_id: 'efa2112f-757b-4c78-a6c8-a815b21a9547', title: '대수 13차시 3.3. 수열의 귀납적 정의 - 1', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '13_귀납적정의/3_2_1_ 수열의 귀납적 정의_문제지.pdf',
        filename: '3_2_1_ 수열의 귀납적 정의_문제지.pdf',
      },
    ],
  },
  {
    session: 14,
    title: '대수 14차시 3.3. 수학적 귀납법',
    videos: [
      { bunny_video_id: 'a568e94a-889f-41c5-b93d-e6b9deac7a61', title: '대수 14차시 3.3. 수학적 귀납법 - 1', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '14_수학적귀납법/3_2_2_ 수학적 귀납법_문제지.pdf',
        filename: '3_2_2_ 수학적 귀납법_문제지.pdf',
      },
    ],
  },
];
