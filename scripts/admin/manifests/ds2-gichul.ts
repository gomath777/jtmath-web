/**
 * [대수] 기출 매니페스트
 *
 * 마이그레이션용 최소 빌드 — 이한승 5/11 "대수 삼각함수 활용" 매핑.
 * 추후 다른 단원 추가 가능.
 *
 * PDF 베이스 경로: ds2/ (Google Drive 0lecture_vid 기준)
 * CDN 업로드 경로: gichul/ds2/<unit>/<level>/<filename>
 */

import type { GichulUnit } from './gs1-gichul.js';

export const DS2_GICHUL_SUBJECT_SLUG = 'ds2';
export const DS2_GICHUL_CURRICULUM_TITLE = '[대수] 기출';
export const DS2_GICHUL_DRIVE_BASE = 'ds2';
export const DS2_GICHUL_CDN_PREFIX = 'gichul/ds2';

export const DS2_GICHUL_UNITS: GichulUnit[] = [
  {
    session: 4,
    title: '삼각함수 활용',
    unit_name: '삼각함수 활용',
    variant_label: null,
    unitFolder: '04_삼각함수 활용',
    gichulSubfolder: '기출_PDF',
    levels: [
      {
        label: '레벨1, 레벨2',
        files: ['삼각함수 활용 레벨1.pdf', '삼각함수 활용 레벨2.pdf'],
        hintbookFiles: [null, null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['삼각함수 활용 레벨3.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-1',
        files: ['삼각함수 활용 레벨4-1.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4-2',
        files: ['삼각함수 활용 레벨4-2.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨5',
        files: ['삼각함수 활용 레벨5.pdf'],
        hintbookFiles: [null],
        expectsVideos: false,
      },
    ],
  },
  {
    session: 5,
    title: '등차수열',
    unit_name: '등차수열',
    variant_label: null,
    unitFolder: '05_등차수열',
    gichulSubfolder: '기출_PDF',
    levels: [
      {
        label: '레벨1, 레벨2',
        files: ['등차수열 레벨1.pdf', '등차수열 레벨2.pdf'],
        hintbookFiles: [null, null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['등차수열 레벨3.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4',
        files: ['등차수열 레벨4.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
    ],
  },
  {
    session: 6,
    title: '등비수열',
    unit_name: '등비수열',
    variant_label: null,
    unitFolder: '06_등비수열',
    gichulSubfolder: '기출_PDF',
    levels: [
      {
        label: '레벨1, 레벨2',
        files: ['등비수열 레벨1.pdf', '등비수열 레벨2.pdf'],
        hintbookFiles: [null, null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['등비수열 레벨3.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4',
        files: ['등비수열 레벨4.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
    ],
  },
  {
    session: 7,
    title: '수열의 합',
    unit_name: '수열의 합',
    variant_label: null,
    unitFolder: '07_수열의 합',
    gichulSubfolder: '기출_PDF',
    levels: [],
  },
];
