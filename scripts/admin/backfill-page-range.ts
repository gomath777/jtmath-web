#!/usr/bin/env npx tsx
/**
 * block_contents.content에 page_range 필드 업데이트
 * 노션 개념강의 페이지에서 추출한 개념서 쪽수 데이터
 *
 * 사용:
 *   npx tsx scripts/admin/backfill-page-range.ts --dry-run
 *   npx tsx scripts/admin/backfill-page-range.ts
 */

import { parseArgs, getServiceClient, log, info, success, warn, error, dryRunBanner } from './_shared.js';

// 노션에서 추출한 개념서 쪽수 데이터
// key: "subject_slug::content_block_title"
const PAGE_RANGES: Record<string, string> = {
  // gs1
  'gs1::1차시 - 1.1 다항식의 연산':                          '8~중단원',
  'gs1::2차시 - 1.2 나머지 정리':                            '22~중단원',
  'gs1::3차시 - 1.3 다항식의 인수분해':                      '40~중단원',
  'gs1::4차시 - 2.1 복소수 개념 및 예제':                    '50~59쪽',
  'gs1::5차시 - 2.1 이차방정식의 풀이 및 판별식':            '60~중단원',
  'gs1::6차시 - 2.2 이차방정식과 이차함수의 관계':           '78~86쪽',
  'gs1::7차시 - 2.2 이차함수의 최대최소 (전반기 마무리)':    '87~중단원',
  'gs1::8차시 - 2.3 삼차·사차방정식의 풀이':                 '96~103쪽',
  'gs1::9차시 - 2.3 연립이차방정식 및 일차부등식':           '104~117쪽',
  'gs1::10차시 - 절댓값 포함 부등식':                        '118~121쪽',
  'gs1::11차시 - 이차부등식과 연립이차부등식':               '122~중단원',
  'gs1::12차시 - 3.1 경우의 수 (합의 법칙, 곱의 법칙)':     '140~153쪽',
  'gs1::13차시 - 3.2 조합 개념과 예제':                      '154~중단원',
  'gs1::14차시 - 4.1 행렬의 정의 및 연산':                   '164~중단원',
  // ds2
  'ds2::1차시 - 지수':                                       '8~23쪽',
  'ds2::2차시 - 로그':                                       '13~38쪽',
  'ds2::3차시 - 지수함수, 로그함수':                         '44~59쪽',
  'ds2::4차시 - 지수함수, 로그함수 활용':                    '60~중단원',
  'ds2::5차시 - 삼각함수':                                   '80~97쪽',
  'ds2::6차시 - 삼각함수의 그래프 (1)':                      '99~106쪽',
  'ds2::7차시 - 삼각함수의 그래프 (2, 3)':                   '107~중단원',
  'ds2::8차시 - 사인법칙 코사인법칙':                        '128~중단원',
  // gs2
  'gs2::1차시 - 평면좌표 및 직선의 방정식':                  '8~33쪽',
  'gs2::2차시 - 평면좌표/직선 마무리 & 원의 기초':           '34~53쪽',
  'gs2::3차시 - 원의 방정식':                                '54~중단원쪽',
  'gs2::4차시 - 원의 방정식 마무리 및 평행이동':             '66~69쪽',
  'gs2::5차시 - 대칭이동 및 도형의 방정식 총정리':           '70~중단원쪽',
  'gs2::6차시 - 집합의 뜻과 포함관계':                       '84~101쪽',
  'gs2::7차시 - 여집합/차집합 및 집합 중단원 마무리':        '102~중단원쪽',
  'gs2::8차시 - 명제와 조건 전체':                           '118~133쪽',
  'gs2::9차시 - 명제의 증명 및 절대부등식':                  '134~중단원쪽',
  'gs2::10차시 - 집합과 명제 대단원 정리 및 함수 기초':      '146~155쪽',
  'gs2::11차시 - 합성함수 기초 및 그래프 특강':              '156~159쪽',
  'gs2::12차시 - 역함수, 함수 중단원 정리':                  '160~중단원쪽',
  'gs2::13차시 - 유리함수 무리함수의 그래프':                '172~중단원 전체쪽',
  // gs2 14차시: 🔄 callout 없음 → skip
  // mj1
  'mj1::1차시 - 함수의 극한':                               '8~11쪽',
  'mj1::2차시 - 극한의 성질 및 중단원 마무리':               '12~중단원쪽',
  'mj1::3차시 - 함수의 연속':                               '24~31쪽',
  'mj1::4차시 - 연속함수의 성질':                           '32~중단원 전체쪽',
  'mj1::5차시 - 미분계수':                                  '40~47쪽',
  'mj1::6차시 - 도함수':                                    '48~중단원 전체쪽',
  'mj1::7차시 - 접선의 방정식, 평균값 정리':                 '58~중단원 전체쪽',
  'mj1::8차시 - 함수의 증가와 감소, 극대와 극소':            '72~79쪽',
  'mj1::9차시 - 함수의 그래프':                             '80~87쪽',
  'mj1::10차시 - 방정식 부등식 활용, 속도와 가속도':         '88~중단원 전체쪽',
  'mj1::11차시 - 부정적분':                                 '112~121쪽',
  'mj1::12차시 - 정적분 (1)':                               '123~125쪽',
  'mj1::13차시 - 정적분 (2)':                               '125~중단원 전체쪽',
  'mj1::14차시 - 정적분의 활용':                            '140~중단원 전체쪽',
};

async function main() {
  const args = parseArgs();
  const isDryRun = args.flags.has('dry-run');
  dryRunBanner(isDryRun);

  const sc = getServiceClient();

  // content_blocks 조회 (concept category)
  const { data: cbs, error: cbErr } = await sc
    .from('content_blocks')
    .select('id, subject_slug, title')
    .eq('category', 'concept');
  if (cbErr) error(`content_blocks 조회 실패: ${cbErr.message}`);

  // content_block_id → block_contents 매핑
  const cbIds = (cbs || []).map((cb: any) => cb.id);
  const { data: bcs, error: bcErr } = await sc
    .from('block_contents')
    .select('id, content_block_id, content')
    .in('content_block_id', cbIds);
  if (bcErr) error(`block_contents 조회 실패: ${bcErr.message}`);

  const bcByCbId = new Map((bcs || []).map((bc: any) => [bc.content_block_id, bc]));

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const cb of (cbs || [])) {
    const key = `${cb.subject_slug}::${cb.title}`;
    const pageRange = PAGE_RANGES[key];

    if (!pageRange) {
      notFound++;
      continue;
    }

    const bc = bcByCbId.get(cb.id);
    if (!bc) {
      warn(`block_contents 없음: [${cb.subject_slug}] "${cb.title}"`);
      skipped++;
      continue;
    }

    const currentPageRange = (bc.content as any)?.page_range;
    if (currentPageRange === pageRange) {
      skipped++;
      continue;
    }

    info(`업데이트: [${cb.subject_slug}] "${cb.title}" → ${pageRange}`);

    if (!isDryRun) {
      const newContent = { ...(bc.content as object), page_range: pageRange };
      const { error: upErr } = await sc
        .from('block_contents')
        .update({ content: newContent })
        .eq('id', bc.id);
      if (upErr) error(`업데이트 실패: ${upErr.message}`);
    }

    updated++;
  }

  log('', '');
  log('📊', `업데이트: ${updated}개 / 이미 있음 skip: ${skipped}개 / 매핑 없음: ${notFound}개`);
  if (isDryRun) info('DRY RUN 완료');
  else success('page_range 업데이트 완료');
}

main().catch(e => { console.error(e); process.exit(1); });
