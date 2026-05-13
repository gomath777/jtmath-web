/**
 * [공수1] 개념강의 14차시 매니페스트 (노션 묶음 기준 재구성)
 *
 * 기존 19차시 → 14차시 아카이브 후 재생성.
 * Bunny 강의 라이브러리: 566809
 * PDF 베이스 경로: content/gs1_concept/ (Google Drive 기준)
 * CDN 업로드 경로: concept/gs1/<subfolder>/<filename>
 *
 * 묶인 차시 (videos 2개 + pdfs 배열):
 *   5차시 (5강+6강), 6차시 (7강+8강), 9차시 (11강+12강),
 *   12차시 (15강+16강), 14차시 (18강+19강)
 */

export const GS1_CONCEPT_CURRICULUM_ID = 'f5d615fd-8595-40aa-831e-145c0f8e9974';
export const GS1_CONCEPT_SUBJECT_SLUG = 'gs1';
export const GS1_CONCEPT_CURRICULUM_TITLE = '[공수1] 개념강의';
export const GS1_CONCEPT_PDF_BASE = 'content/gs1_concept';
export const GS1_CONCEPT_CDN_PREFIX = 'concept/gs1';

export interface ConceptVideo {
  bunny_video_id: string;
  title: string;
  order_index: number;
}

export interface ConceptPdf {
  /** content/gs1_concept/ 기준 상대 경로 */
  relativePath: string;
  /** 파일명 (CDN 업로드 후 original_name) */
  filename: string;
}

export interface ConceptLecture {
  session: number;
  /** curriculum_items.title 및 session_blocks.content.label 에 사용 */
  title: string;
  videos: ConceptVideo[];
  pdfs: ConceptPdf[];
}

export const GS1_CONCEPT_LECTURES: ConceptLecture[] = [
  {
    session: 1,
    title: '1.1 다항식의 연산',
    videos: [
      { bunny_video_id: '0433291f-b6c1-40f6-9b95-cbfe183c81d2', title: '다항식의 연산', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '01_다항식연산/공수1 개념 1.1.1.다항식의 사칙연산.pdf',
        filename: '공수1 개념 1.1.1.다항식의 사칙연산.pdf',
      },
    ],
  },
  {
    session: 2,
    title: '1.2 나머지 정리',
    videos: [
      { bunny_video_id: '18d2abe9-9dcf-4288-933a-376e7a47e6ad', title: '항등식과 나머지정리', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '02_나머지정리/공수1 개념 1.1.2. 항등식과 나머지정리.pdf',
        filename: '공수1 개념 1.1.2. 항등식과 나머지정리.pdf',
      },
    ],
  },
  {
    session: 3,
    title: '1.3 다항식의 인수분해',
    videos: [
      { bunny_video_id: '715d2be6-b623-41fd-b57c-712311ef865d', title: '다항식의 인수분해', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '03_인수분해/공수1 개념 1.1.3. 다항식의 인수분해.pdf',
        filename: '공수1 개념 1.1.3. 다항식의 인수분해.pdf',
      },
    ],
  },
  {
    session: 4,
    title: '2.1 복소수 개념 및 예제',
    videos: [
      { bunny_video_id: 'c108f45e-ada8-4b12-8690-8dcc3acced2e', title: '복소수의 뜻과 성질', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '04_복소수/공수1 개념 2.1.1. 복소수의 뜻과 성질.pdf',
        filename: '공수1 개념 2.1.1. 복소수의 뜻과 성질.pdf',
      },
    ],
  },
  {
    // 5강 + 6강 묶음
    session: 5,
    title: '2.1 이차방정식의 풀이 및 판별식',
    videos: [
      { bunny_video_id: '39fdef7f-4e14-4bea-a357-2e1a3595040f', title: '이차방정식의 풀이', order_index: 0 },
      { bunny_video_id: '92d6e5f4-5084-49ec-879e-34bb72a1158d', title: '근과 계수의 관계', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '05_이차방정식/공수1 개념 2.1.2. 이차방정식의 풀이.pdf',
        filename: '공수1 개념 2.1.2. 이차방정식의 풀이.pdf',
      },
      {
        relativePath: '05_이차방정식/공수1 개념 2.1.3. 이차방정식의 근과 계수의 관계.pdf',
        filename: '공수1 개념 2.1.3. 이차방정식의 근과 계수의 관계.pdf',
      },
    ],
  },
  {
    // 7강 + 8강 묶음
    session: 6,
    title: '2.2 이차방정식과 이차함수의 관계',
    videos: [
      { bunny_video_id: '31a2bfa9-6d91-4f33-bddc-e89409e6b50d', title: '이차방정식과 이차함수의 관계', order_index: 0 },
      { bunny_video_id: '2bb74c4f-a1e4-49c7-9599-e13c701ce615', title: '이차함수의 그래프와 직선의 위치 관계', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '06_이차함수관계/공수1 개념 2.2.1. 이차방정식과 이차함수의 관계.pdf',
        filename: '공수1 개념 2.2.1. 이차방정식과 이차함수의 관계.pdf',
      },
      {
        relativePath: '06_이차함수관계/공수1 개념 2.2.2. 이차함수의 그래프와 직선의 위치 관계.pdf',
        filename: '공수1 개념 2.2.2. 이차함수의 그래프와 직선의 위치 관계.pdf',
      },
    ],
  },
  {
    session: 7,
    title: '2.2 이차함수의 최대최소 (전반기 마무리)',
    videos: [
      { bunny_video_id: '956cbf02-6a1e-4dd3-a660-dab0db1f5704', title: '이차함수의 최대·최소', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '07_이차함수최대최소/공수1 개념 2.2.3. 이차함수의 최대-최소.pdf',
        filename: '공수1 개념 2.2.3. 이차함수의 최대-최소.pdf',
      },
    ],
  },
  {
    session: 8,
    title: '2.3 삼차·사차방정식의 풀이 (파트2 시작)',
    videos: [
      { bunny_video_id: '2c8416f6-7e0d-4478-bfee-87fca1c96c7b', title: '삼차·사차방정식의 풀이', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '09_삼차사차방정식/2_3_1_ 삼차방정식과 사차방정식의 풀이.pdf',
        filename: '2_3_1_ 삼차방정식과 사차방정식의 풀이.pdf',
      },
    ],
  },
  {
    // 11강 + 12강 묶음
    session: 9,
    title: '2.3 연립이차방정식 및 일차부등식',
    videos: [
      { bunny_video_id: '2025c5d5-d6fc-4e4c-95c8-d8ee33243220', title: '연립이차방정식', order_index: 0 },
      { bunny_video_id: 'c3ddef0e-2d08-4ec3-8e0b-b8559b8b24fc', title: '연립일차부등식', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '10_연립방정식부등식/2_3_2_ 미지수가 2개인 연립이차방정식.pdf',
        filename: '2_3_2_ 미지수가 2개인 연립이차방정식.pdf',
      },
      {
        relativePath: '10_연립방정식부등식/2_3_3_ 미지수가 1개인 연립일차부등식.pdf',
        filename: '2_3_3_ 미지수가 1개인 연립일차부등식.pdf',
      },
    ],
  },
  {
    session: 10,
    title: '절댓값 포함 부등식',
    videos: [
      { bunny_video_id: 'ee73dced-37ce-45fa-9282-229caa58ba3d', title: '절댓값을 포함한 일차부등식', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '11_절댓값부등식/2_3_4_ 절댓값을 포함한 일차부등식.pdf',
        filename: '2_3_4_ 절댓값을 포함한 일차부등식.pdf',
      },
    ],
  },
  {
    session: 11,
    title: '이차부등식과 연립이차부등식',
    videos: [
      { bunny_video_id: 'b237de19-3deb-499c-8e23-d9f972e97ed0', title: '이차부등식과 연립이차부등식', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '12_이차부등식/2_3_5_ 이차부등식과 연립이차부등식.pdf',
        filename: '2_3_5_ 이차부등식과 연립이차부등식.pdf',
      },
    ],
  },
  {
    // 15강 + 16강 묶음
    session: 12,
    title: '3.1 경우의 수 (합의·곱의 법칙)',
    videos: [
      { bunny_video_id: '207e2f00-3531-4ab0-a1a9-18c03eaa2627', title: '합의 법칙과 곱의 법칙', order_index: 0 },
      { bunny_video_id: 'dd9d9ac5-9c18-4120-bb30-d2db53547275', title: '순열', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '13_경우의수/3_1_1_ 합의법칙과 곱의 법칙.pdf',
        filename: '3_1_1_ 합의법칙과 곱의 법칙.pdf',
      },
      {
        relativePath: '13_경우의수/3_2_1_ 순열.pdf',
        filename: '3_2_1_ 순열.pdf',
      },
    ],
  },
  {
    session: 13,
    title: '3.2 조합 개념과 예제',
    videos: [
      { bunny_video_id: 'ebefa957-f079-4403-9b9a-46f6b753ba36', title: '조합', order_index: 0 },
    ],
    pdfs: [
      {
        relativePath: '14_조합/3_2_2_ 조합.pdf',
        filename: '3_2_2_ 조합.pdf',
      },
    ],
  },
  {
    // 18강 + 19강 묶음
    session: 14,
    title: '4.1 행렬의 정의 및 연산',
    videos: [
      { bunny_video_id: '0d284cfa-e18d-40d0-9c62-19b524697ba7', title: '행렬', order_index: 0 },
      { bunny_video_id: 'bd1d8cc5-1755-49dd-9b85-01e4bef9cedd', title: '행렬의 연산', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '15_행렬/4_1_1_ 행렬.pdf',
        filename: '4_1_1_ 행렬.pdf',
      },
      {
        relativePath: '15_행렬/4_1_2_ 행렬의 연산.pdf',
        filename: '4_1_2_ 행렬의 연산.pdf',
      },
    ],
  },
];
