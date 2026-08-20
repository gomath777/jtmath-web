/**
 * Bunny.net Stream library IDs (단일 소스).
 *
 * - CONCEPT_LIBRARY_ID — 개념강의 영상 (env: BUNNY_LIBRARY_ID)
 * - EXAM_LIBRARY_ID    — 기출/심화 해설강의 (env: BUNNY_EXAM_LIBRARY_ID)
 *
 * 라이브러리 ID는 iframe URL에 그대로 노출되는 공개값이라 클라이언트 번들에 박혀도 무방.
 * 어디서든 이 모듈만 import해서 쓰고, 컴포넌트/스크립트에서 매직 넘버 직접 쓰지 말 것.
 */
export const CONCEPT_LIBRARY_ID = '566809';
export const EXAM_LIBRARY_ID = '622509';
export const CONCEPT_CDN_HOSTNAME = 'vz-0bd83516-8e5.b-cdn.net';
