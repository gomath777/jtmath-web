#!/usr/bin/env npx tsx
/**
 * learning_sets + learning_set_videos → block_contents 백필
 *
 * block_contents가 없는 content_blocks를 learning_sets(title+subject_slug)으로 매칭해서
 * block_contents(content_group)를 생성합니다.
 *
 * 사용:
 *   npx tsx scripts/admin/backfill-block-contents.ts --dry-run   # 카운트/매칭만 출력
 *   npx tsx scripts/admin/backfill-block-contents.ts             # 실제 실행
 */

import { parseArgs, getServiceClient, log, info, success, warn, error, dryRunBanner } from './_shared.js';

interface ContentBlock {
  id: string;
  subject_slug: string;
  title: string;
  category: string;
  unit_number: number | null;
}

interface LearningSet {
  id: string;
  subject_slug: string;
  title: string;
  pdf_url: string | null;
  pdf_filename: string | null;
  kind: string | null;
}

interface LearningSetVideo {
  id: string;
  set_id: string;
  problem_number: number | null;
  bunny_video_id: string;
  title: string | null;
  order_index: number;
}

async function main() {
  const args = parseArgs();
  const isDryRun = args.flags.has('dry-run');

  dryRunBanner(isDryRun);

  const sc = getServiceClient();

  // ── 1. 데이터 로드 ────────────────────────────────────────────────────────────
  log('📥', '데이터 로드 중...');

  const [cbRes, bcRes, lsRes, lsvRes] = await Promise.all([
    sc.from('content_blocks').select('id, subject_slug, title, category, unit_number'),
    sc.from('block_contents').select('content_block_id'),
    sc.from('learning_sets').select('id, subject_slug, title, pdf_url, pdf_filename, kind'),
    sc.from('learning_set_videos').select('id, set_id, problem_number, bunny_video_id, title, order_index').order('order_index', { ascending: true }),
  ]);

  for (const [name, r] of [['content_blocks', cbRes], ['block_contents', bcRes], ['learning_sets', lsRes], ['learning_set_videos', lsvRes]] as const) {
    if ((r as any).error) error(`${name} 로드 실패: ${(r as any).error.message}`);
  }

  const allBlocks = (cbRes.data ?? []) as ContentBlock[];
  const existingBCIds = new Set((bcRes.data ?? []).map((b: any) => b.content_block_id as string));
  const learningSets = (lsRes.data ?? []) as LearningSet[];
  const lsVideos = (lsvRes.data ?? []) as LearningSetVideo[];

  log('📊', `content_blocks: ${allBlocks.length} / 이미 block_contents 있음: ${existingBCIds.size}`);
  log('📊', `learning_sets: ${learningSets.length} / learning_set_videos: ${lsVideos.length}`);

  // ── 2. 인덱스 구성 ────────────────────────────────────────────────────────────
  // learning_sets → title+subject_slug 키로 맵
  const lsByKey = new Map<string, LearningSet>();
  for (const ls of learningSets) {
    lsByKey.set(`${ls.subject_slug}::${ls.title}`, ls);
  }

  // learning_set_videos → set_id 키로 맵
  const videosBySetId = new Map<string, LearningSetVideo[]>();
  for (const v of lsVideos) {
    if (!videosBySetId.has(v.set_id)) videosBySetId.set(v.set_id, []);
    videosBySetId.get(v.set_id)!.push(v);
  }

  // ── 3. 백필 대상 선정 ─────────────────────────────────────────────────────────
  const targets = allBlocks.filter(cb => !existingBCIds.has(cb.id));
  log('📝', `block_contents 없는 content_blocks: ${targets.length}개`);

  let matchedCount = 0;
  let skippedCount = 0;
  const toInsert: Array<{
    content_block_id: string;
    block_type: string;
    order_index: number;
    variant: string;
    content: Record<string, unknown>;
  }> = [];

  for (const cb of targets) {
    const key = `${cb.subject_slug}::${cb.title}`;
    const ls = lsByKey.get(key);

    if (!ls) {
      warn(`매칭 실패: [${cb.subject_slug}] "${cb.title}" → learning_sets에 없음 (skip)`);
      skippedCount++;
      continue;
    }

    const videos = (videosBySetId.get(ls.id) ?? []).map(v => ({
      bunny_video_id: v.bunny_video_id,
      title: v.title ?? '',
      problem_number: v.problem_number,
      order_index: v.order_index,
    }));

    const content: Record<string, unknown> = {
      label: cb.title,
      step: 1,
    };

    if (ls.pdf_url) {
      content.pdf = {
        url: ls.pdf_url,
        original_name: ls.pdf_filename ?? ls.title,
      };
    }

    if (videos.length > 0) {
      content.videos = videos;
    }

    info(`매칭: [${cb.subject_slug}] "${cb.title}" → ls.id=${ls.id} (pdf=${!!ls.pdf_url}, videos=${videos.length}개)`);

    toInsert.push({
      content_block_id: cb.id,
      block_type: 'content_group',
      order_index: 0,
      variant: 'default',
      content,
    });

    matchedCount++;
  }

  log('', '');
  log('📊', `매칭 성공: ${matchedCount}개 / 매칭 실패(skip): ${skippedCount}개`);

  if (isDryRun) {
    info('DRY RUN 완료 — 실제 INSERT 없음');
    return;
  }

  // ── 4. INSERT ─────────────────────────────────────────────────────────────────
  if (toInsert.length === 0) {
    success('INSERT할 항목 없음 (이미 완료된 상태)');
    return;
  }

  log('💾', `block_contents ${toInsert.length}개 INSERT 중...`);

  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const { error: insErr } = await sc.from('block_contents').insert(chunk);
    if (insErr) error(`INSERT 실패 (chunk ${i}~${i + chunk.length}): ${insErr.message}`);
    log('✅', `${i + chunk.length}/${toInsert.length} 완료`);
  }

  success(`block_contents ${toInsert.length}개 생성 완료`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
