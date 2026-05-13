/**
 * [공수2] 기출 매니페스트
 *
 * 마이그레이션용 최소 빌드 — 송은율 5/4 명제, 5/11 함수 매핑.
 */

import type { GichulUnit } from './gs1-gichul.js';

export const GS2_GICHUL_SUBJECT_SLUG = 'gs2';
export const GS2_GICHUL_CURRICULUM_TITLE = '[공수2] 기출';
export const GS2_GICHUL_DRIVE_BASE = 'gs2';
export const GS2_GICHUL_CDN_PREFIX = 'gichul/gs2';

export const GS2_GICHUL_UNITS: GichulUnit[] = [
  {
    session: 4,
    title: '명제',
    unit_name: '명제',
    variant_label: null,
    unitFolder: '04_명제',
    gichulSubfolder: '기출_PDF',
    levels: [
      {
        label: '레벨1, 레벨2',
        files: ['명제 레벨1.pdf', '명제 레벨2.pdf'],
        hintbookFiles: [null, null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['명제 레벨3.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4',
        files: ['명제 레벨4.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
    ],
  },
  {
    session: 5,
    title: '함수',
    unit_name: '함수',
    variant_label: null,
    unitFolder: '05_함수',
    gichulSubfolder: '기출_PDF',
    levels: [
      {
        label: '레벨1, 레벨2',
        files: ['함수 레벨1.pdf', '함수 레벨2.pdf'],
        hintbookFiles: [null, null],
        expectsVideos: false,
      },
      {
        label: '레벨3',
        files: ['함수 레벨3.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
      {
        label: '레벨4',
        files: ['함수 레벨4.pdf'],
        hintbookFiles: [null],
        expectsVideos: true,
      },
    ],
  },
];
