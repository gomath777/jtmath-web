#!/usr/bin/env npx ts-node
/**
 * 세션 학습페이지 자동 생성 CLI
 *
 * 폴더 안의 PDF를 Bunny.net에 업로드하고,
 * 레벨3/레벨4 PDF는 parse-pdf로 해설강의 자동매칭,
 * content_group 블록 4개(1차시) 또는 5개(2차시)를 생성.
 *
 * 사용법:
 *   npx ts-node scripts/admin/create-session.ts \
 *     --content "content/gs1/01_다항식_나머지정리/기출" \
 *     --curriculum <id> --week 1 --session 1 \
 *     [--label "다항식과 나머지정리 교육청 기출"] \
 *     [--subject gs1] \
 *     [--storage-prefix sessions/gs1/01_다항식] \
 *     [--release] [--dry-run] [--json]
 *
 * 폴더 구조:
 *   기출/   → 1차시 (레벨1,2 / 레벨3+영상 / 레벨4+힌트북+영상)
 *   심화/   → 2차시 (1단계+힌트북 / 2단계+힌트북 / 레벨4-2+힌트북 / 3단계)
 *   레벨5/  → 4주차 (레벨5+힌트북)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  parseArgs, getServiceClient, log, error, success, info, warn,
  dryRunBanner, required, printHelp, printJson,
} from './_shared';
import { uploadPdfFromPath } from '../../src/utils/bunny-storage';
import { parsePdfWithClaude } from '../../src/lib/parse-pdf';
import { matchProblemsToVideos, toContentGroupVideos } from '../../src/lib/match-videos';

const CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME_PDF || 'mathgo-pdfs.b-cdn.net';

interface PdfFile {
  localPath: string;
  displayName: string;
  kind: 'level' | 'hintbook' | 'stage' | 'scan' | 'level5';
  level?: number;       // 1,2,3,4,5
  levelVariant?: string; // "4-1", "4-2", "5-1"
  stage?: number;       // 1,2,3 (심화)
  hintbookFor?: string;  // 힌트북이 페어링되는 원본 파일명
  size?: number;         // bytes
}

function detectFileKind(filename: string): PdfFile {
  const name = filename.replace(/\.pdf$/i, '');
  const isHintbook = /^\[힌트북\]/.test(name);
  const cleanName = name.replace(/^\[힌트북\]\s*/, '');

  let info: Omit<PdfFile, 'localPath' | 'displayName'> = { kind: 'level' };

  // 레벨 매칭: "레벨3", "레벨4-1", "레벨5-1"
  const levelMatch = cleanName.match(/^레벨(\d+)(?:-(\d+))?/);
  if (levelMatch) {
    const level = parseInt(levelMatch[1]);
    if (level === 5) {
      info = { kind: 'level5', level: 5, levelVariant: levelMatch[0].replace(/^레벨/, '') };
    } else {
      info = { kind: 'level', level, levelVariant: levelMatch[0].replace(/^레벨/, '') };
    }
  } else if (/^(\d+)단계/.test(cleanName)) {
    // 심화: "1단계", "2단계"
    const stageMatch = cleanName.match(/^(\d+)단계/);
    info = { kind: 'stage', stage: parseInt(stageMatch![1]) };
  } else if (/^\d+$/.test(cleanName)) {
    // 올스캔: "01", "02"
    info = { kind: 'scan' };
  }

  return {
    localPath: '',
    displayName: cleanName + '.pdf',
    ...info,
    ...(isHintbook ? { kind: 'hintbook', hintbookFor: cleanName + '.pdf' } : {}),
  };
}

interface ContentGroup {
  order_index: number;
  content: {
    label: string;
    step?: number;
    description?: string;
    pdf?: { url: string; original_name: string; file_size?: string };
    pdfs?: Array<{ url: string; original_name: string; file_size?: string }>;
    hintbook?: { url: string; original_name: string };
    videos?: Array<{ bunny_video_id: string; title: string; problem_number: number; raw_text: string }>;
  };
}

async function main() {
  const args = parseArgs();

  if (args.flags.has('help') || args.flags.has('h')) {
    printHelp(
      'create-session',
      'npx ts-node scripts/admin/create-session.ts --content <folder> --curriculum <id> --week N --session N',
      [
        'create-session.ts --content "content/gs1/01_다항식_나머지정리/기출" --curriculum abc123 --week 1 --session 1',
        'create-session.ts --content "content/gs1/01_다항식_나머지정리/심화" --curriculum abc123 --week 1 --session 2 --dry-run',
      ],
    );
    process.exit(0);
  }

  const contentDir = required(args, 'content');
  const curriculumId = required(args, 'curriculum');
  const week = parseInt(required(args, 'week'));
  const session = parseInt(required(args, 'session'));
  const label = args.options.label;
  const subjectSlug = args.options.subject || null;
  const storagePrefix = args.options['storage-prefix'] || `sessions/auto/${curriculumId.slice(0, 8)}/w${week}s${session}`;
  const isDryRun = args.flags.has('dry-run');
  const shouldRelease = args.flags.has('release');
  const asJson = args.flags.has('json');

  // Resolve contentDir - support both absolute and relative paths
  let resolvedDir = contentDir;
  if (!path.isAbsolute(resolvedDir)) {
    // Try cwd first, then Google Drive
    const cwdPath = path.resolve(process.cwd(), resolvedDir);
    const drivePath = path.join(process.env.HOME || '', 'Google Drive/My Drive/0lecture_vid', resolvedDir);
    if (fs.existsSync(cwdPath)) resolvedDir = cwdPath;
    else if (fs.existsSync(drivePath)) resolvedDir = drivePath;
    else error(`폴더를 찾을 수 없습니다: ${contentDir}`);
  }

  if (!fs.existsSync(resolvedDir)) error(`폴더가 존재하지 않습니다: ${resolvedDir}`);

  dryRunBanner(isDryRun);

  // Determine session type from folder name
  const folderName = path.basename(resolvedDir);
  const isGichul = folderName === '기출';    // 1차시
  const isShimhwa = folderName === '심화';   // 2차시
  const isLevel5 = folderName === '레벨5';    // 4주차

  info(`폴더: ${resolvedDir}`);
  info(`타입: ${isGichul ? '1차시 (기출)' : isShimhwa ? '2차시 (심화)' : isLevel5 ? '레벨5' : '알 수 없음'}`);
  info(`커리큘럼: ${curriculumId} (${week}주차 ${session}차시)`);
  info(`저장 경로: ${storagePrefix}/`);
  console.log('');

  // Scan PDFs
  const files = fs.readdirSync(resolvedDir).filter(f => f.endsWith('.pdf'));
  if (files.length === 0) error('PDF 파일이 없습니다');

  const pdfFiles: PdfFile[] = files.map(f => {
    const info = detectFileKind(f);
    const localPath = path.join(resolvedDir, f);
    const size = fs.statSync(localPath).size;
    return {
      ...info,
      localPath,
      displayName: f,
      size,
    };
  });

  // Pair hintbooks with their level/stage files
  const hintbookMap = new Map<string, PdfFile>();
  pdfFiles.filter(f => f.kind === 'hintbook').forEach(hb => {
    if (hb.hintbookFor) hintbookMap.set(hb.hintbookFor, hb);
  });

  log('📂', `발견된 PDF: ${pdfFiles.length}개`);
  pdfFiles.forEach(f => {
    const sizeMB = ((f.size || 0) / 1024 / 1024).toFixed(1);
    console.log(`   - ${f.displayName} (${sizeMB}MB)`);
  });
  console.log('');

  if (isDryRun) {
    info('DRY RUN: 실제 업로드 및 블록 생성 스킵');
    info('실행하려면 --dry-run 제거');
    return;
  }

  // Upload all PDFs
  log('⬆️', 'Bunny.net 업로드 중...');
  const uploaded = new Map<string, { url: string; size: string }>();

  for (const f of pdfFiles) {
    const storagePath = `${storagePrefix}/${f.displayName}`;
    try {
      const { cdnUrl, skipped } = await uploadPdfFromPath(f.localPath, storagePath);
      const sizeMB = ((f.size || 0) / 1024 / 1024).toFixed(1);
      uploaded.set(f.displayName, { url: cdnUrl, size: `${sizeMB}MB` });
      console.log(`   ${skipped ? '⏭️ ' : '✅'} ${f.displayName}`);
    } catch (err) {
      error(`업로드 실패: ${f.displayName} — ${(err as Error).message}`);
    }
  }
  console.log('');

  // Build content_group blocks based on session type
  const blocks: ContentGroup[] = [];
  let orderIndex = 0;

  if (isGichul) {
    // 1차시: 레벨1,2 / 레벨3 / 레벨4 / (올스캔 있으면 추가)
    const level1 = pdfFiles.find(f => f.kind === 'level' && f.level === 1);
    const level2 = pdfFiles.find(f => f.kind === 'level' && f.level === 2);
    const level3 = pdfFiles.find(f => f.kind === 'level' && f.level === 3);
    const level4s = pdfFiles.filter(f => f.kind === 'level' && f.level === 4);

    // Group 1: 레벨1, 레벨2
    if (level1 || level2) {
      const pdfs = [level1, level2].filter((f): f is PdfFile => !!f).map(f => {
        const u = uploaded.get(f.displayName)!;
        return { url: u.url, original_name: f.displayName, file_size: u.size };
      });
      blocks.push({
        order_index: orderIndex++,
        content: {
          label: '레벨1, 레벨2',
          step: 1,
          description: '수준에 맞게 스킵 가능합니다 (오답 반복 필요한 것만 제출 후 카톡하기)',
          pdfs,
        },
      });
    }

    // Group 2: 레벨3 (+ 해설강의 매칭)
    if (level3) {
      const u = uploaded.get(level3.displayName)!;
      info('레벨3 PDF 해설강의 매칭 중...');
      let videos: Array<{ bunny_video_id: string; title: string; problem_number: number; raw_text: string }> = [];
      try {
        const buffer = fs.readFileSync(level3.localPath);
        const problems = await parsePdfWithClaude(buffer);
        const matched = await matchProblemsToVideos(problems, subjectSlug);
        videos = toContentGroupVideos(matched);
        success(`레벨3: ${videos.length}/${problems.length} 영상 매칭`);
      } catch (err) {
        warn(`레벨3 매칭 실패 (영상 없이 진행): ${(err as Error).message}`);
      }
      blocks.push({
        order_index: orderIndex++,
        content: {
          label: '레벨3',
          step: blocks.length + 1,
          pdf: { url: u.url, original_name: level3.displayName, file_size: u.size },
          videos: videos.length > 0 ? videos : undefined,
        },
      });
    }

    // Group 3: 레벨4 (힌트북 + 해설강의)
    for (const l4 of level4s) {
      const u = uploaded.get(l4.displayName)!;
      const hb = hintbookMap.get(l4.displayName);
      info(`${l4.displayName} 해설강의 매칭 중...`);
      let videos: Array<{ bunny_video_id: string; title: string; problem_number: number; raw_text: string }> = [];
      try {
        const buffer = fs.readFileSync(l4.localPath);
        const problems = await parsePdfWithClaude(buffer);
        const matched = await matchProblemsToVideos(problems, subjectSlug);
        videos = toContentGroupVideos(matched);
        success(`${l4.displayName}: ${videos.length}/${problems.length} 영상 매칭`);
      } catch (err) {
        warn(`${l4.displayName} 매칭 실패: ${(err as Error).message}`);
      }
      blocks.push({
        order_index: orderIndex++,
        content: {
          label: `레벨4${l4.levelVariant && l4.levelVariant !== '4' ? `-${l4.levelVariant.split('-')[1]}` : ''}`,
          step: blocks.length + 1,
          pdf: { url: u.url, original_name: l4.displayName, file_size: u.size },
          ...(hb ? { hintbook: { url: uploaded.get(hb.displayName)!.url, original_name: hb.displayName } } : {}),
          videos: videos.length > 0 ? videos : undefined,
        },
      });
    }
  } else if (isShimhwa) {
    // 2차시: 1단계 / 2단계 / 레벨4-2 / (선택 3단계)
    const stages = pdfFiles.filter(f => f.kind === 'stage').sort((a, b) => (a.stage || 0) - (b.stage || 0));
    const level4s = pdfFiles.filter(f => f.kind === 'level' && f.level === 4);

    for (const stage of stages) {
      if (stage.stage === 3) continue; // 3단계는 마지막에
      const u = uploaded.get(stage.displayName)!;
      const hb = hintbookMap.get(stage.displayName);
      blocks.push({
        order_index: orderIndex++,
        content: {
          label: `심화유형 ${stage.stage}단계`,
          step: blocks.length + 1,
          pdf: { url: u.url, original_name: stage.displayName, file_size: u.size },
          ...(hb ? { hintbook: { url: uploaded.get(hb.displayName)!.url, original_name: hb.displayName } } : {}),
        },
      });
    }

    for (const l4 of level4s) {
      const u = uploaded.get(l4.displayName)!;
      const hb = hintbookMap.get(l4.displayName);
      blocks.push({
        order_index: orderIndex++,
        content: {
          label: `교육청 기출 레벨${l4.levelVariant || '4'}`,
          step: blocks.length + 1,
          pdf: { url: u.url, original_name: l4.displayName, file_size: u.size },
          ...(hb ? { hintbook: { url: uploaded.get(hb.displayName)!.url, original_name: hb.displayName } } : {}),
        },
      });
    }

    // 3단계 (선택)
    const stage3 = stages.find(s => s.stage === 3);
    if (stage3) {
      const u = uploaded.get(stage3.displayName)!;
      const hb = hintbookMap.get(stage3.displayName);
      blocks.push({
        order_index: orderIndex++,
        content: {
          label: '(선택) 고난도 3단계',
          step: blocks.length + 1,
          description: '스킵 가능',
          pdf: { url: u.url, original_name: stage3.displayName, file_size: u.size },
          ...(hb ? { hintbook: { url: uploaded.get(hb.displayName)!.url, original_name: hb.displayName } } : {}),
        },
      });
    }
  } else if (isLevel5) {
    // 레벨5: 레벨5 + 힌트북
    const level5s = pdfFiles.filter(f => f.kind === 'level5');
    for (const l5 of level5s) {
      const u = uploaded.get(l5.displayName)!;
      const hb = hintbookMap.get(l5.displayName);
      blocks.push({
        order_index: orderIndex++,
        content: {
          label: `레벨5${l5.levelVariant && l5.levelVariant !== '5' ? `-${l5.levelVariant.split('-')[1]}` : ''}`,
          step: blocks.length + 1,
          description: '고난도 도전',
          pdf: { url: u.url, original_name: l5.displayName, file_size: u.size },
          ...(hb ? { hintbook: { url: uploaded.get(hb.displayName)!.url, original_name: hb.displayName } } : {}),
        },
      });
    }
  }

  console.log('');
  log('📦', `생성할 content_group 블록: ${blocks.length}개`);
  blocks.forEach(b => console.log(`   ${b.order_index + 1}. ${b.content.label}`));
  console.log('');

  // Upsert curriculum_item
  const sc = getServiceClient();

  // Check if item exists
  const { data: existing } = await sc
    .from('curriculum_items')
    .select('id')
    .eq('curriculum_id', curriculumId)
    .eq('week_number', week)
    .eq('session_number', session)
    .maybeSingle();

  let itemId: string;
  if (existing) {
    itemId = existing.id;
    info(`기존 curriculum_item 업데이트: ${itemId}`);
    await sc.from('curriculum_items').update({
      label: label || undefined,
      is_released: shouldRelease || undefined,
    }).eq('id', itemId);

    // Delete old blocks
    await sc.from('session_blocks').delete().eq('curriculum_item_id', itemId);
  } else {
    info('새 curriculum_item 생성...');
    const { data: created, error: err } = await sc
      .from('curriculum_items')
      .insert({
        curriculum_id: curriculumId,
        week_number: week,
        session_number: session,
        label: label || `${week}주차 ${session}차시`,
        publish_date: new Date().toISOString().split('T')[0],
        is_released: shouldRelease,
      })
      .select('id')
      .single();
    if (err) error(`curriculum_item 생성 실패: ${err.message}`);
    itemId = created!.id;
  }

  // Insert blocks
  const blocksWithItem = blocks.map(b => ({
    curriculum_item_id: itemId,
    block_type: 'content_group',
    order_index: b.order_index,
    content: b.content,
  }));

  const { error: insertErr } = await sc.from('session_blocks').insert(blocksWithItem);
  if (insertErr) error(`블록 삽입 실패: ${insertErr.message}`);

  console.log('');
  success(`세션 학습페이지 생성 완료!`);
  info(`curriculum_item_id: ${itemId}`);
  info(`블록: ${blocks.length}개`);
  if (shouldRelease) success('릴리즈 처리됨 (is_released = true)');

  if (asJson) {
    printJson({ itemId, blocks: blocksWithItem.length, released: shouldRelease });
  }
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
