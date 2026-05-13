/**
 * [공수2] 심화유형 매니페스트
 *
 * 마이그레이션용 최소 빌드 — 송은율 5/7 명제 심화유형 매핑.
 *
 * PDF 베이스 경로: gs2/ (Google Drive 0lecture_vid 기준)
 * CDN 업로드 경로: shimhwa/gs2/<unit>/<filename>
 */

import type { ShimhwaUnit } from './gs1-shimhwa.js';

export const GS2_SHIMHWA_SUBJECT_SLUG = 'gs2';
export const GS2_SHIMHWA_CURRICULUM_TITLE = '[공수2] 심화유형';
export const GS2_SHIMHWA_DRIVE_BASE = 'gs2';
export const GS2_SHIMHWA_CDN_PREFIX = 'shimhwa/gs2';

export const GS2_SHIMHWA_UNITS: ShimhwaUnit[] = [
  {
    session: 4,
    title: '명제 심화유형',
    unit_name: '명제',
    unitFolder: '04_명제',
    shimhwaSubfolder: '심화_PDF',
    stage1: {
      label: '1단계',
      file: '명제 심화유형 1단계(레벨4).pdf',
      hintbookFile: '[힌트북]_명제 심화유형 1단계(레벨4).pdf',
    },
    stage2: {
      label: '2단계',
      file: '명제 심화유형 2단계(레벨4).pdf',
      hintbookFile: '[힌트북]_명제 심화유형 2단계(레벨4).pdf',
    },
    stage3: {
      side_a: {
        file: '명제 심화유형 3단계(레벨4).pdf',
        hintbookFile: '[힌트북]_명제 심화유형 3단계(레벨4).pdf',
      },
      side_b: null,
    },
  },
  {
    session: 5,
    title: '함수 심화',
    unit_name: '함수',
    unitFolder: '05_함수',
    shimhwaSubfolder: '심화_PDF',
    stage1: {
      label: '1단계',
      file: '함수 1단계.pdf',
      hintbookFile: '[힌트북] 함수 1단계.pdf',
    },
    stage2: {
      label: '2단계',
      file: '함수 2단계.pdf',
      hintbookFile: '[힌트북] 함수 2단계.pdf',
    },
    stage3: {
      side_a: {
        file: '함수 3단계.pdf',
        hintbookFile: '[힌트북] 함수 3단계.pdf',
      },
      side_b: null,
    },
  },
];
