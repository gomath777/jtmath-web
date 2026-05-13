/**
 * [공수2] 개념강의 14차시 매니페스트 (시그니처 교재 기준)
 *
 * 원본 노션: https://www.notion.so/2d6bb7915b71802aba94f66844c5dce8
 * Bunny Stream Library: 566809
 * PDF Drive 폴더: content/gs2_concept/
 * CDN 업로드 prefix: concept/gs2/<subfolder>/<filename>
 *
 * Notion 추출 (자동): `npm run admin:extract-notion -- --subject gs2`
 *
 * 폴더 매핑 (08_part1_총정리, 16_part2_총정리 제외):
 *   1~7차시  → 01_평면좌표_직선 .. 07_집합_마무리
 *   8~14차시 → 09_명제 .. 15_함수_마무리
 */

import type { ConceptLecture } from './gs1-concept.js';

export const GS2_CONCEPT_SUBJECT_SLUG = 'gs2';
export const GS2_CONCEPT_CURRICULUM_TITLE = '[공수2] 개념강의';
export const GS2_CONCEPT_PDF_BASE = 'content/gs2_concept';
export const GS2_CONCEPT_CDN_PREFIX = 'concept/gs2';

export const GS2_CONCEPT_LECTURES: ConceptLecture[] = [
  {
    session: 1,
    title: '1차시 평면좌표 및 직선의 방정식',
    videos: [
      { bunny_video_id: '2c27f208-3b4d-4490-9b15-fcfffc5cfda4', title: '1차시 평면좌표 및 직선의 방정식 - 1', order_index: 0 },
      { bunny_video_id: '53e77fca-0593-4ddb-a739-37120ff75330', title: '1차시 평면좌표 및 직선의 방정식 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '01_평면좌표_직선/1.1.1. 선분의 내분, 내분점의 좌표.pdf',
        filename: '1.1.1. 선분의 내분, 내분점의 좌표.pdf',
      },
      {
        relativePath: '01_평면좌표_직선/1.2.1. 두 직선의 평행 조건과 수직조건.pdf',
        filename: '1.2.1. 두 직선의 평행 조건과 수직조건.pdf',
      },
    ],
  },
  {
    session: 2,
    title: '2차시 평면좌표/직선 마무리 & 원의 기초',
    videos: [
      { bunny_video_id: 'ae8907a9-50a9-4bcc-99cf-12ad15466ddb', title: '2차시 평면좌표/직선 마무리 & 원의 기초 - 1', order_index: 0 },
      { bunny_video_id: '95ecce37-ea73-41ca-ac49-3a8c4946e1f2', title: '2차시 평면좌표/직선 마무리 & 원의 기초 - 2', order_index: 1 },
      { bunny_video_id: '902442d6-fcbb-437f-9cb5-90a3abea60da', title: '2차시 평면좌표/직선 마무리 & 원의 기초 - 3', order_index: 2 },
    ],
    pdfs: [
      {
        relativePath: '02_원의기초/1.2.2. 점과 직선 사이의 거리.pdf',
        filename: '1.2.2. 점과 직선 사이의 거리.pdf',
      },
      {
        relativePath: '02_원의기초/중단원 평면좌표와 직선의 방정식 문제풀이.pdf',
        filename: '중단원 평면좌표와 직선의 방정식 문제풀이.pdf',
      },
      {
        relativePath: '02_원의기초/1.3.1. 원의 방정식과 그래프.pdf',
        filename: '1.3.1. 원의 방정식과 그래프.pdf',
      },
    ],
  },
  {
    session: 3,
    title: '3차시 원의 방정식 (위치관계/접선)',
    videos: [
      { bunny_video_id: '760eba90-a3df-46bb-b48a-118e17be3ef7', title: '3차시 원의 방정식 (위치관계/접선) - 1', order_index: 0 },
      { bunny_video_id: '00849a5f-16f0-4bd5-a93b-35a1aebc84c4', title: '3차시 원의 방정식 (위치관계/접선) - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '03_원의방정식/1.3.2. 좌표평면에서 원과 직선의 위치 관계.pdf',
        filename: '1.3.2. 좌표평면에서 원과 직선의 위치 관계.pdf',
      },
      {
        relativePath: '03_원의방정식/중단원 원의 방정식.pdf',
        filename: '중단원 원의 방정식.pdf',
      },
    ],
  },
  {
    session: 4,
    title: '4차시 원의 방정식 마무리 및 평행이동',
    videos: [
      { bunny_video_id: '5a61cc22-5581-4c99-98be-751111f7ed21', title: '4차시 원의 방정식 마무리 및 평행이동 - 1', order_index: 0 },
      { bunny_video_id: '10048082-d106-4b2e-82de-0f5ba3e395fb', title: '4차시 원의 방정식 마무리 및 평행이동 - 2', order_index: 1 },
      { bunny_video_id: '486f8e52-aec1-48bd-8cd5-49050740e60f', title: '4차시 원의 방정식 마무리 및 평행이동 - 3', order_index: 2 },
    ],
    pdfs: [
      {
        relativePath: '04_원_평행이동/#3+ 유형기초 원의 방정식.pdf',
        filename: '#3+ 유형기초 원의 방정식.pdf',
      },
      {
        relativePath: '04_원_평행이동/#3++ 유형기초 원의 방정식_문제지.pdf',
        filename: '#3++ 유형기초 원의 방정식_문제지.pdf',
      },
      {
        relativePath: '04_원_평행이동/1.4.1. 평행이동.pdf',
        filename: '1.4.1. 평행이동.pdf',
      },
    ],
  },
  {
    session: 5,
    title: '5차시 대칭이동 및 도형의 방정식 총정리',
    videos: [
      { bunny_video_id: 'e02c8f72-7ed2-4f7c-9234-5b56b4040834', title: '5차시 대칭이동 및 도형의 방정식 총정리 - 1', order_index: 0 },
      { bunny_video_id: 'ea672c52-653d-41ba-81fd-80c1d35ad0ed', title: '5차시 대칭이동 및 도형의 방정식 총정리 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '05_대칭이동_총정리/1.4.2. 대칭이동.pdf',
        filename: '1.4.2. 대칭이동.pdf',
      },
      {
        relativePath: '05_대칭이동_총정리/중단원 도형의 이동.pdf',
        filename: '중단원 도형의 이동.pdf',
      },
      {
        relativePath: '05_대칭이동_총정리/대단원 도형의 방정식.pdf',
        filename: '대단원 도형의 방정식.pdf',
      },
    ],
  },
  {
    session: 6,
    title: '6차시 집합의 뜻과 포함관계',
    videos: [
      { bunny_video_id: 'a06028fa-5bfe-4a7c-9e14-0e242e301c01', title: '6차시 집합의 뜻과 포함관계 - 1', order_index: 0 },
      { bunny_video_id: '4bf07507-76b2-49e1-be9f-67ea1dd4cfaa', title: '6차시 집합의 뜻과 포함관계 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '06_집합/2.1.1. 집합의 개념과 표현.pdf',
        filename: '2.1.1. 집합의 개념과 표현.pdf',
      },
      {
        relativePath: '06_집합/2.1.2. 두 집합 사이의 포함 관계.pdf',
        filename: '2.1.2. 두 집합 사이의 포함 관계.pdf',
      },
    ],
  },
  {
    session: 7,
    title: '7차시 여집합/차집합 및 집합 중단원 마무리',
    videos: [
      { bunny_video_id: 'c7fbeaad-3e94-4345-8602-fe9908490ac5', title: '7차시 여집합/차집합 및 집합 중단원 마무리 - 1', order_index: 0 },
      { bunny_video_id: '6caab715-ff51-4be8-a87d-009671a0d8c2', title: '7차시 여집합/차집합 및 집합 중단원 마무리 - 2', order_index: 1 },
      { bunny_video_id: '5624f34b-c914-48e2-bb4e-5c87db8fe279', title: '7차시 여집합/차집합 및 집합 중단원 마무리 - 3', order_index: 2 },
    ],
    pdfs: [
      {
        relativePath: '07_집합_마무리/2.1.3. 집합의 연산과 벤 다이어 그램.pdf',
        filename: '2.1.3. 집합의 연산과 벤 다이어 그램.pdf',
      },
      {
        relativePath: '07_집합_마무리/중단원 문제 집합.pdf',
        filename: '중단원 문제 집합.pdf',
      },
    ],
  },
  {
    session: 8,
    title: '8차시 명제와 조건 전체',
    videos: [
      { bunny_video_id: 'c18030de-f169-4d0e-b27a-99188a58dbee', title: '8차시 명제와 조건 전체 - 1', order_index: 0 },
      { bunny_video_id: '0781647c-3041-4feb-9f6d-1780605df266', title: '8차시 명제와 조건 전체 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '09_명제/2.2.1. 명제와 조건.pdf',
        filename: '2.2.1. 명제와 조건.pdf',
      },
      {
        relativePath: '09_명제/2.2.2+3. 명제의 역,대우,충분조건,필요조건.pdf',
        filename: '2.2.2+3. 명제의 역,대우,충분조건,필요조건.pdf',
      },
    ],
  },
  {
    session: 9,
    title: '9차시 명제의 증명 및 절대부등식',
    videos: [
      { bunny_video_id: 'aa1a82e2-53f8-4f9b-b0db-440a14292f6e', title: '9차시 명제의 증명 및 절대부등식 - 1', order_index: 0 },
      { bunny_video_id: '4f1e95a5-928c-48a1-87f4-220cf35f6131', title: '9차시 명제의 증명 및 절대부등식 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '10_명제_절대부등식/2.2.4+5. 대우를 이용한 증명, 귀류법, 절대부등식.pdf',
        filename: '2.2.4+5. 대우를 이용한 증명, 귀류법, 절대부등식.pdf',
      },
      {
        relativePath: '10_명제_절대부등식/중단원 문제 명제.pdf',
        filename: '중단원 문제 명제.pdf',
      },
    ],
  },
  {
    session: 10,
    title: '10차시 집합과 명제 대단원 정리 및 함수 기초',
    videos: [
      { bunny_video_id: 'aeff87f6-dcf6-4873-9c49-ea8562e0b892', title: '10차시 집합과 명제 대단원 정리 및 함수 기초 - 1', order_index: 0 },
      { bunny_video_id: '79bb262c-79dc-4cb3-8ae0-f1f77683ec40', title: '10차시 집합과 명제 대단원 정리 및 함수 기초 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '11_명제_대단원_함수기초/대단원 문제 집합과 명제.pdf',
        filename: '대단원 문제 집합과 명제.pdf',
      },
      {
        relativePath: '11_명제_대단원_함수기초/3.1.1. 함수의 개념과 그래프.pdf',
        filename: '3.1.1. 함수의 개념과 그래프.pdf',
      },
    ],
  },
  {
    session: 11,
    title: '11차시 합성함수 기초 및 그래프 특강',
    videos: [
      { bunny_video_id: '47615022-7a50-42dd-8d91-742a9120ed01', title: '11차시 합성함수 기초 및 그래프 특강 - 1', order_index: 0 },
      { bunny_video_id: '2f581a7d-ca46-40dd-ba6a-530350b5643a', title: '11차시 합성함수 기초 및 그래프 특강 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '12_합성함수/3.1.2. 함수의 합성.pdf',
        filename: '3.1.2. 함수의 합성.pdf',
      },
      {
        relativePath: '12_합성함수/#18+ 합성함수의 그래프 그리기 특강_문제지.pdf',
        filename: '#18+ 합성함수의 그래프 그리기 특강_문제지.pdf',
      },
    ],
  },
  {
    session: 12,
    title: '12차시 역함수, 함수 중단원 정리',
    videos: [
      { bunny_video_id: '1a82ea66-48f5-4313-96dc-b3968f25434b', title: '12차시 역함수, 함수 중단원 정리 - 1', order_index: 0 },
      { bunny_video_id: 'dd3100ca-626a-41a6-9c79-cd06e95d491f', title: '12차시 역함수, 함수 중단원 정리 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '13_역함수/3.1.3. 역함수.pdf',
        filename: '3.1.3. 역함수.pdf',
      },
      {
        relativePath: '13_역함수/중단원 문제 함수.pdf',
        filename: '중단원 문제 함수.pdf',
      },
    ],
  },
  {
    session: 13,
    title: '13차시 유리함수 무리함수의 그래프',
    videos: [
      { bunny_video_id: '22977d16-6a6e-4ddf-b858-766712c07727', title: '13차시 유리함수 무리함수의 그래프 - 1', order_index: 0 },
      { bunny_video_id: 'bd544e9e-70fe-4a05-acbc-4f77c78d6b6a', title: '13차시 유리함수 무리함수의 그래프 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '14_유리_무리함수/3.2.1. 유리함수의 그래프.pdf',
        filename: '3.2.1. 유리함수의 그래프.pdf',
      },
      {
        relativePath: '14_유리_무리함수/3.2.2. 무리함수의 그래프.pdf',
        filename: '3.2.2. 무리함수의 그래프.pdf',
      },
    ],
  },
  {
    session: 14,
    title: '14차시 중단원, 대단원 마무리',
    videos: [
      { bunny_video_id: '841fbd54-1cad-45dc-b9d5-890d29116ce2', title: '14차시 중단원, 대단원 마무리 - 1', order_index: 0 },
      { bunny_video_id: '70070728-d1eb-48b0-b7c2-963493048e70', title: '14차시 중단원, 대단원 마무리 - 2', order_index: 1 },
    ],
    pdfs: [
      {
        relativePath: '15_함수_마무리/중단원 문제 유리,무리함수.pdf',
        filename: '중단원 문제 유리,무리함수.pdf',
      },
      {
        relativePath: '15_함수_마무리/대단원 문제 함수.pdf',
        filename: '대단원 문제 함수.pdf',
      },
    ],
  },
];
