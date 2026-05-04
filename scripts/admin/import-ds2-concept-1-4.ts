#!/usr/bin/env npx tsx
/**
 * ds2 개념강의 1~7차시 block_contents 생성
 * 5~7차시는 Notion에 MP4 직접 업로드 → Bunny 미업로드 상태라 별도 처리 필요
 *
 * 사용:
 *   npx tsx scripts/admin/import-ds2-concept-1-4.ts --dry-run
 *   npx tsx scripts/admin/import-ds2-concept-1-4.ts
 */

import { parseArgs, getServiceClient, log, info, success, warn, error, dryRunBanner } from './_shared.js';

const DATA = [
  {
    title: '1차시 - 지수',
    page_range: '8~23쪽',
    videos: [
      { bunny_video_id: '4a0331cc-a9ad-46ac-a61d-d64107bffd62', title: '거듭제곱과 거듭제곱근', order_index: 0 },
      { bunny_video_id: 'd9d0b779-6e02-4720-998d-2df13833cdb7', title: '지수의 확장과 지수법칙', order_index: 1 },
    ],
  },
  {
    title: '2차시 - 로그',
    page_range: '13~38쪽',
    videos: [
      { bunny_video_id: 'b9cd1477-1d4d-44d9-a5ac-a77103228ec5', title: '로그의 뜻과 성질', order_index: 0 },
      { bunny_video_id: 'd0be9a74-fd0b-4d35-a138-5621eaedab6e', title: '상용로그', order_index: 1 },
    ],
  },
  {
    title: '3차시 - 지수함수, 로그함수',
    page_range: '44~59쪽',
    videos: [
      { bunny_video_id: '6cf05900-3e67-47f0-bef6-ea905f9876de', title: '지수함수의 뜻과 그래프', order_index: 0 },
      { bunny_video_id: 'a126000f-f02d-4d5c-9aa1-1fc422b0dfe2', title: '로그함수의 뜻과 그래프 (개념)', order_index: 1 },
      { bunny_video_id: 'd9eb7d0a-8c61-4463-a1cc-c32a6f74a3d7', title: '로그함수의 뜻과 그래프 (문제풀이)', order_index: 2 },
    ],
  },
  {
    title: '4차시 - 지수함수, 로그함수 활용',
    page_range: '60~중단원',
    videos: [
      { bunny_video_id: '712b99eb-7dd5-4159-b467-3afd8d199714', title: '지수함수의 활용', order_index: 0 },
      { bunny_video_id: 'f997c460-4160-41be-92b9-0010d9e32182', title: '로그함수의 활용', order_index: 1 },
    ],
  },
  {
    title: '5차시 - 삼각함수',
    page_range: '80~97쪽',
    videos: [
      { bunny_video_id: 'a1d24968-9d0d-4d39-bd8d-83305cc05d47', title: '일반각과 호도법', order_index: 0 },
      { bunny_video_id: '56fe4f06-9fb9-4378-965c-10ce506e2ef3', title: '일반각과 호도법 문풀', order_index: 1 },
      { bunny_video_id: '04c18f2b-8e8e-4d12-b12b-24cdcbf7deb8', title: '삼각함수', order_index: 2 },
    ],
  },
  {
    title: '6차시 - 삼각함수의 그래프 (1)',
    page_range: '99~106쪽',
    videos: [
      { bunny_video_id: '748bda38-e088-4f17-9a78-455611a27c03', title: '삼각함수 그래프(1) 사인·코사인', order_index: 0 },
      { bunny_video_id: '40b1b2f1-71d2-489e-8767-a468b9b5f2ab', title: '삼각함수 그래프(2) 탄젠트·평행·대칭이동', order_index: 1 },
    ],
  },
  {
    title: '7차시 - 삼각함수의 그래프 (2, 3)',
    page_range: '107~중단원',
    videos: [
      { bunny_video_id: '61305c99-5d30-4dbc-9a5e-5e547b475537', title: '삼각함수 그래프(3) 방정식·부등식', order_index: 0 },
    ],
  },
];

async function main() {
  const args = parseArgs();
  const isDryRun = args.flags.has('dry-run');
  dryRunBanner(isDryRun);

  const sc = getServiceClient();

  // ds2 concept content_blocks 조회
  const { data: cbs, error: cbErr } = await sc
    .from('content_blocks')
    .select('id, title')
    .eq('subject_slug', 'ds2')
    .eq('category', 'concept');
  if (cbErr) error(`content_blocks 조회 실패: ${cbErr.message}`);

  const cbByTitle = new Map((cbs || []).map((cb: any) => [cb.title, cb]));

  // 이미 있는 block_contents 확인
  const cbIds = (cbs || []).map((cb: any) => cb.id);
  const { data: existing } = await sc
    .from('block_contents')
    .select('content_block_id')
    .in('content_block_id', cbIds);
  const existingSet = new Set((existing || []).map((b: any) => b.content_block_id));

  let created = 0;
  let skipped = 0;

  for (const d of DATA) {
    const cb = cbByTitle.get(d.title);
    if (!cb) {
      warn(`content_block 없음: "${d.title}"`);
      skipped++;
      continue;
    }
    if (existingSet.has(cb.id)) {
      info(`이미 있음 skip: "${d.title}"`);
      skipped++;
      continue;
    }

    const content = {
      label: d.title,
      step: 1,
      page_range: d.page_range,
      videos: d.videos,
    };

    info(`생성: "${d.title}" (영상 ${d.videos.length}개, 쪽수: ${d.page_range})`);

    if (!isDryRun) {
      const { error: insErr } = await sc.from('block_contents').insert({
        content_block_id: cb.id,
        block_type: 'content_group',
        order_index: 0,
        variant: 'default',
        content,
      });
      if (insErr) error(`INSERT 실패: ${insErr.message}`);
    }
    created++;
  }

  log('', '');
  log('📊', `생성: ${created}개 / skip: ${skipped}개`);
  if (isDryRun) info('DRY RUN 완료');
  else success('ds2 1~4차시 block_contents 생성 완료');
}

main().catch(e => { console.error(e); process.exit(1); });
