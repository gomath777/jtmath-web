/**
 * [공수1] 심화유형 5단원 매니페스트
 *
 * 단원당 session_blocks 3개: 1단계 / 2단계 / 3단계
 * 3단계는 side_a + side_b (ShimhwaPairLayout 양면)
 *
 * PDF 베이스 경로: gs1/ (Google Drive 0lecture_vid 기준)
 * CDN 업로드 경로: shimhwa/gs1/<unit>/<filename>
 *
 * 힌트북 파일명 패턴:
 *   단원 01: "[힌트북] <원본>.pdf"
 *   단원 02: "고T의 힌트북 - <원본>.pdf"  (명명 다름)
 *   단원 03: "[힌트북] <원본>.pdf"
 *   단원 04: "[힌트북] <원본>.pdf"  (A/B 각각)
 *   단원 05: 심화 콘텐츠 없음 (경우의 수 — 추후 추가 예정)
 */

export interface ShimhwaSideContent {
  file: string;
  hintbookFile: string | null;
}

export interface ShimhwaStage {
  label: string;
  file: string;
  hintbookFile: string | null;
}

export interface ShimhwaThirdStage {
  side_a: ShimhwaSideContent;
  /** side_b가 없으면 null — 블록 생성 시 side_a만 단일 블록으로 처리 */
  side_b: ShimhwaSideContent | null;
}

export interface ShimhwaUnit {
  session: number;
  title: string;
  unit_name: string;
  /** gs1/ 기준 단원 폴더명 */
  unitFolder: string;
  /** 심화 PDF가 있는 서브폴더명 */
  shimhwaSubfolder: string;
  stage1: ShimhwaStage;
  stage2: ShimhwaStage;
  stage3: ShimhwaThirdStage;
}

export const GS1_SHIMHWA_UNITS: ShimhwaUnit[] = [
  {
    session: 1,
    title: '다항식 나머지정리 3배수',
    unit_name: '다항식과 나머지정리',
    unitFolder: '01_다항식_나머지정리',
    shimhwaSubfolder: '심화_PDF',
    stage1: {
      label: '1단계',
      file: '다항식 나머지정리 3배수 1단계.pdf',
      hintbookFile: '[힌트북] 다항식 나머지정리 3배수 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '다항식 나머지정리 3배수 2단계.pdf',
      hintbookFile: '[힌트북] 다항식 나머지정리 3배수 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '다항식 나머지정리 3배수 3단계.pdf',
        hintbookFile: '[힌트북] 다항식 나머지정리 3배수 3단계.pdf',
      },
      side_b: null,
    },
  },
  {
    session: 2,
    title: '복소수와 이차방정식 3배수',
    unit_name: '복소수와 이차방정식',
    unitFolder: '02_복소수_이차방정식',
    shimhwaSubfolder: '심화_PDF',
    stage1: {
      label: '1단계',
      file: '복소수와 이차방정식 3배수 1단계.pdf',
      // 이 단원은 힌트북 파일명이 "고T의 힌트북 - " 패턴
      hintbookFile: '고T의 힌트북 - 복소수와 이차방정식 3배수 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '복소수와 이차방정식 3배수 2단계.pdf',
      hintbookFile: '고T의 힌트북 - 복소수와 이차방정식 3배수 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '복소수와 이차방정식 3배수 3단계.pdf',
        hintbookFile: '고T의 힌트북 - 복소수와 이차방정식 3배수 3단계.pdf',
      },
      side_b: null,
    },
  },
  {
    session: 3,
    title: '이차방정식과 이차함수 3배수',
    unit_name: '이차방정식과 이차함수',
    unitFolder: '03_이차방정식_이차함수',
    shimhwaSubfolder: '심화_PDF',
    stage1: {
      label: '1단계',
      file: '이차방정식과 이차함수 3배수 1단계.pdf',
      hintbookFile: '[힌트북] 이차방정식과 이차함수 3배수 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '이차방정식과 이차함수 3배수 2단계.pdf',
      hintbookFile: '[힌트북] 이차방정식과 이차함수 3배수 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '이차방정식과 이차함수 3배수 3단계.pdf',
        hintbookFile: '[힌트북] 이차방정식과 이차함수 3배수 3단계.pdf',
      },
      side_b: null,
    },
  },
  {
    // 단원 04: A/B 두 변형판이 side_a / side_b로 페어링됨
    // 심화_PDF v2가 최신 버전이나 v1(A/B) 구조도 보존
    // 현재: v2 폴더 기준 (레벨4-1→1단계, 4-2→2단계, 4-3→3단계 side_a)
    //        v1 B세트를 side_b로 페어링
    session: 4,
    title: '여러가지 방정식과 부등식 심화',
    unit_name: '여러가지 방정식과 부등식',
    unitFolder: '04_여러가지_방정식_부등식',
    shimhwaSubfolder: '심화_PDF v2',
    stage1: {
      label: '1단계',
      file: '여러가지 방정식과 부등식v2 레벨4-1.pdf',
      hintbookFile: '[힌트북] 여러가지 방정식과 부등식v2 레벨4-1.pdf',
    },
    stage2: {
      label: '2단계',
      file: '여러가지 방정식과 부등식v2 레벨4-2.pdf',
      hintbookFile: '[힌트북] 여러가지 방정식과 부등식v2 레벨4-2.pdf',
    },
    stage3: {
      side_a: {
        file: '여러가지 방정식과 부등식v2 레벨4-3.pdf',
        hintbookFile: '[힌트북] 여러가지 방정식과 부등식v2 레벨4-3.pdf',
      },
      side_b: null,
    },
  },
  {
    session: 5,
    title: '경우의 수 심화',
    unit_name: '경우의 수',
    unitFolder: '05_경우의 수',
    shimhwaSubfolder: '심화_PDF',
    stage1: {
      label: '1단계',
      file: '경우의 수 1단계.pdf',
      hintbookFile: '[힌트북] 경우의 수 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '경우의 수 2단계.pdf',
      hintbookFile: '[힌트북] 경우의 수 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '경우의 수 3단계.pdf',
        hintbookFile: '[힌트북] 경우의 수 3단계.pdf',
      },
      side_b: null,
    },
  },
  {
    session: 6,
    title: '행렬 심화',
    unit_name: '행렬',
    unitFolder: '06_행렬',
    shimhwaSubfolder: '심화_PDF',
    stage1: {
      label: '1단계',
      file: '행렬 1단계.pdf',
      hintbookFile: '[힌트북] 행렬 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '행렬 2단계.pdf',
      hintbookFile: '[힌트북] 행렬 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '행렬 3단계.pdf',
        hintbookFile: '[힌트북] 행렬 3단계.pdf',
      },
      side_b: null,
    },
  },
  {
    session: 7,
    title: '삼차사차 방정식의 풀이 심화',
    unit_name: '여러가지 방정식과 부등식',
    unitFolder: '04_여러가지_방정식_부등식',
    shimhwaSubfolder: '심화_PDF (1)',
    stage1: {
      label: '1단계',
      file: '삼차사차 방정식의 풀이 1단계.pdf',
      hintbookFile: '[힌트북] 삼차사차 방정식의 풀이 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '삼차사차 방정식의 풀이 2단계.pdf',
      hintbookFile: '[힌트북] 삼차사차 방정식의 풀이 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '삼차사차 방정식의 풀이 3단계.pdf',
        hintbookFile: '[힌트북] 삼차사차 방정식의 풀이 3단계.pdf',
      },
      side_b: null,
    },
  },
  {
    session: 8,
    title: '연립 방정식과 부등식 심화',
    unit_name: '여러가지 방정식과 부등식',
    unitFolder: '04_여러가지_방정식_부등식',
    shimhwaSubfolder: '심화_PDF (2)',
    stage1: {
      label: '1단계',
      file: '연립 방정식과 부등식 1단계.pdf',
      hintbookFile: '[힌트북] 연립 방정식과 부등식 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '연립 방정식과 부등식 2단계.pdf',
      hintbookFile: '[힌트북] 연립 방정식과 부등식 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '연립 방정식과 부등식 3단계.pdf',
        hintbookFile: '[힌트북] 연립 방정식과 부등식 3단계.pdf',
      },
      side_b: null,
    },
  },
];
