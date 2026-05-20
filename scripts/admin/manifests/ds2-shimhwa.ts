/**
 * [대수] 심화유형 매니페스트
 *
 * 마이그레이션용 최소 빌드 — 삼각함수 활용(사인법칙·코사인법칙) 1·2·3단계.
 *
 * PDF 베이스 경로: ds2/ (Google Drive 0lecture_vid 기준)
 * CDN 업로드 경로: shimhwa/ds2/<unit>/<filename>
 */

import type { ShimhwaUnit } from './gs1-shimhwa.js';

export const DS2_SHIMHWA_SUBJECT_SLUG = 'ds2';
export const DS2_SHIMHWA_CURRICULUM_TITLE = '[대수] 심화유형';
export const DS2_SHIMHWA_DRIVE_BASE = 'ds2';
export const DS2_SHIMHWA_CDN_PREFIX = 'shimhwa/ds2';

export const DS2_SHIMHWA_UNITS: ShimhwaUnit[] = [
  {
    session: 4,
    title: '사인법칙과 코사인법칙 심화',
    unit_name: '삼각함수 활용',
    unitFolder: '04_삼각함수 활용',
    shimhwaSubfolder: '심화_PDF',
    stage1: {
      label: '1단계',
      file: '사인법칙과 코사인법칙 1단계.pdf',
      hintbookFile: '[힌트북] 사인법칙과 코사인법칙 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '사인법칙과 코사인법칙 2단계.pdf',
      hintbookFile: '[힌트북] 사인법칙과 코사인법칙 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '사인법칙과 코사인법칙 3단계.pdf',
        hintbookFile: '[힌트북] 사인법칙과 코사인법칙 3단계.pdf',
      },
      side_b: null,
    },
  },
  {
    session: 5,
    title: '등차수열 심화',
    unit_name: '등차수열',
    unitFolder: '05_등차수열',
    shimhwaSubfolder: '심화_PDF',
    stage1: {
      label: '1단계',
      file: '등차수열 1단계.pdf',
      hintbookFile: '[힌트북] 등차수열 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '등차수열 2단계.pdf',
      hintbookFile: '[힌트북] 등차수열 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '등차수열 3단계.pdf',
        hintbookFile: '[힌트북] 등차수열 3단계.pdf',
      },
      side_b: null,
    },
  },
  {
    session: 6,
    title: '등비수열 심화',
    unit_name: '등비수열',
    unitFolder: '06_등비수열',
    shimhwaSubfolder: '심화_PDF',
    stage1: {
      label: '1단계',
      file: '등비수열 1단계.pdf',
      hintbookFile: '[힌트북] 등비수열 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '등비수열 2단계.pdf',
      hintbookFile: '[힌트북] 등비수열 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '등비수열 3단계.pdf',
        hintbookFile: '[힌트북] 등비수열 3단계.pdf',
      },
      side_b: null,
    },
  },
];
