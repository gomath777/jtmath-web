/**
 * [공수1] 기출 6단원 매니페스트
 *
 * 단원 4/5 (여러가지 방정식)는 variant_label='1'/'2' — 시즌 자동 펼침 제외.
 * PDF 베이스 경로: gs1/ (Google Drive 0lecture_vid 기준)
 * CDN 업로드 경로: gichul/gs1/<unit>/<level>/<filename>
 *
 * 폴더 구조:
 *   기출_PDF/           → 레벨1~4 (+힌트북)
 *   기출_PDF lv5/       → 레벨5 별도 폴더 (01, 02 단원)
 *   기출_PDF v2/        → 04 단원 v2 (variant_label='2')
 *
 * 힌트북 파일명 패턴: "[힌트북] <원본파일명>.pdf"
 */

export interface GichulLevelBlock {
  /** content_group label: "레벨1, 레벨2" | "레벨3" | "레벨4-1" | "레벨4-2" | "레벨5" */
  label: string;
  /** 폴더 기준 파일명 목록 (배열이면 pdfs[], 단일이면 pdf) */
  files: string[];
  /** 힌트북 파일명 목록 (files 순서에 대응, null이면 없음) */
  hintbookFiles?: (string | null)[];
  /** true = parsePdfWithClaude + matchProblemsToVideos 로 해설강의 자동 매칭 */
  expectsVideos: boolean;
  /** 레벨5처럼 별도 폴더에 있으면 그 폴더명 지정 */
  subfolder?: string;
}

export interface GichulUnit {
  session: number;
  title: string;
  unit_name: string;
  /** null = 기본 (시즌 자동 펼침), '1'|'2' = 어드민 명시 배정만 */
  variant_label: string | null;
  /** gs1/ 기준 단원 폴더명 */
  unitFolder: string;
  /** 기출 PDF가 있는 서브폴더명 (기본: '기출_PDF') */
  gichulSubfolder: string;
  levels: GichulLevelBlock[];
}

export const GS1_GICHUL_UNITS: GichulUnit[] = [
  {
    session: 1,
    title: '다항식과 나머지정리',
    unit_name: '다항식과 나머지정리',
    variant_label: null,
    unitFolder: '01_다항식_나머지정리',
    gichulSubfolder: '기출_PDF',
    levels: [
      {
        label: '레벨1, 레벨2',
        files: ['다항식 나머지정리 레벨1.pdf', '다항식 나머지정리 레벨2.pdf'],
        hintbookFiles: [null, null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['다항식 나머지정리 레벨3.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-1',
        files: ['다항식 나머지정리 레벨4-1.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-2',
        files: ['다항식 나머지정리 레벨4-2.pdf'],
        hintbookFiles: ['[힌트북] 다항식 나머지정리 레벨4-2.pdf'],
        expectsVideos: true,
      },
      {
        label: '레벨5',
        files: ['다항식 나머지정리 레벨5.pdf'],
        hintbookFiles: ['[힌트북] 다항식 나머지정리 레벨5.pdf'],
        expectsVideos: false,
        subfolder: '기출_PDF lv5',
      },
    ],
  },
  {
    session: 2,
    title: '복소수와 이차방정식',
    unit_name: '복소수와 이차방정식',
    variant_label: null,
    unitFolder: '02_복소수_이차방정식',
    gichulSubfolder: '기출_PDF',
    levels: [
      {
        label: '레벨1, 레벨2',
        files: ['복소수와 이차방정식 레벨1.pdf', '복소수와 이차방정식 레벨2.pdf'],
        hintbookFiles: [null, null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['복소수와 이차방정식 레벨3.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-1',
        files: ['복소수와 이차방정식 레벨4-1.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-2',
        files: ['복소수와 이차방정식 레벨4-2.pdf'],
        hintbookFiles: ['[힌트북] 복소수와 이차방정식 레벨4-2.pdf'],
        expectsVideos: true,
      },
      {
        label: '레벨5',
        files: ['복소수와 이차방정식 레벨5.pdf'],
        hintbookFiles: ['[힌트북] 복소수와 이차방정식 레벨5.pdf'],
        expectsVideos: false,
        subfolder: '기출_PDF lv5',
      },
    ],
  },
  {
    session: 3,
    title: '이차방정식과 이차함수',
    unit_name: '이차방정식과 이차함수',
    variant_label: null,
    unitFolder: '03_이차방정식_이차함수',
    gichulSubfolder: '기출_PDF',
    levels: [
      {
        label: '레벨1, 레벨2',
        files: ['이차방정식과 이차함수 레벨1.pdf', '이차방정식과 이차함수 레벨2.pdf'],
        hintbookFiles: [null, null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['이차방정식과 이차함수 레벨3.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-1',
        files: ['이차방정식과 이차함수 레벨4-1.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-2',
        files: ['이차방정식과 이차함수 레벨4-2.pdf'],
        hintbookFiles: ['[힌트북] 이차방정식과 이차함수 레벨4-2.pdf'],
        expectsVideos: true,
      },
      // 이 단원은 기출_PDF 폴더에 레벨5-1, 5-2도 포함
      {
        label: '레벨5-1',
        files: ['이차방정식과 이차함수 레벨5-1.pdf'],
        hintbookFiles: [null],
        expectsVideos: false,
      },
      {
        label: '레벨5-2',
        files: ['이차방정식과 이차함수 레벨5-2.pdf'],
        hintbookFiles: ['[힌트북] 이차방정식과 이차함수 레벨5-2.pdf'],
        expectsVideos: false,
      },
    ],
  },
  {
    // 여러가지 방정식 (1) — 기출_PDF v1
    session: 4,
    title: '여러가지 방정식 (1)',
    unit_name: '여러가지 방정식과 부등식',
    variant_label: '1',
    unitFolder: '04_여러가지_방정식_부등식',
    gichulSubfolder: '기출_PDF',
    levels: [
      {
        label: '레벨1, 레벨2',
        files: ['여러가지 방정식 레벨1.pdf', '여러가지 방정식 레벨2.pdf'],
        hintbookFiles: [null, null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['여러가지 방정식 레벨3.pdf'],
        hintbookFiles: ['[힌트북] 여러가지 방정식 레벨3.pdf'],
        expectsVideos: true,
      },
      {
        label: '레벨4-1',
        files: ['여러가지 방정식 레벨4-1.pdf'],
        hintbookFiles: ['[힌트북] 여러가지 방정식 레벨4-1.pdf'],
        expectsVideos: true,
      },
    ],
  },
  {
    // 여러가지 방정식 (2) — 기출_PDF v2
    session: 5,
    title: '여러가지 방정식 (2)',
    unit_name: '여러가지 방정식과 부등식',
    variant_label: '2',
    unitFolder: '04_여러가지_방정식_부등식',
    gichulSubfolder: '기출_PDF v2',
    levels: [
      {
        label: '레벨2',
        files: ['여러가지 방정식 레벨2 v2.pdf'],
        hintbookFiles: [null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['여러가지 방정식 레벨3 v2.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-1',
        files: ['여러가지 방정식 레벨4-1 v2.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-2',
        files: ['여러가지 방정식 레벨4-2 v2.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨5',
        files: ['여러가지 방정식 레벨5 v2.pdf'],
        hintbookFiles: [null],
        expectsVideos: false,
      },
    ],
  },
  {
    session: 6,
    title: '경우의 수',
    unit_name: '경우의 수',
    variant_label: null,
    unitFolder: '05_순열과 조합',
    gichulSubfolder: '기출_PDF',
    levels: [
      {
        label: '레벨1, 레벨2',
        files: ['경우의 수 레벨1.pdf', '경우의 수 레벨2.pdf'],
        hintbookFiles: [null, null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['경우의 수 레벨3.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-1',
        files: ['경우의 수 레벨4-1.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-2',
        files: ['경우의 수 레벨4-2.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
    ],
  },
];
