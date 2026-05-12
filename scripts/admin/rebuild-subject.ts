#!/usr/bin/env npx tsx
/**
 * 과목 학습 페이지 완전 재빌드 CLI
 *
 * 사용법:
 *   npm run admin:rebuild -- --subject gs1 --part concept [--dry-run]
 *   npm run admin:rebuild -- --subject gs1 --part gichul [--unit "다항식과 나머지정리"] [--dry-run]
 *   npm run admin:rebuild -- --subject gs1 --part shimhwa [--dry-run]
 *   npm run admin:rebuild -- --subject gs1 --part all [--dry-run]
 *   npm run admin:rebuild -- --subject gs1 --part concept --force  # SLA 있어도 아카이브
 *
 * --dry-run : DB 변경 없이 예정 작업 출력
 * --force   : SLA 배정 학생 있어도 아카이브 진행
 * --unit    : gichul/shimhwa 의 단원 이름 필터 (부분 일치)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  parseArgs, getServiceClient, log, error, success, info, warn, dryRunBanner,
} from './_shared.js';
import { archiveActiveItems } from './lib/archive-items.js';
import {
  resolveDrivePath, uploadAndMakePdf,
  findOrCreateCurriculum, findOrCreateCurriculumItem,
} from './lib/concept-helpers.js';
import { upsertBlocks } from './lib/upsert-block.js';
import { GS1_CONCEPT_CURRICULUM_ID, GS1_CONCEPT_LECTURES } from './manifests/gs1-concept.js';
import { GS1_GICHUL_UNITS } from './manifests/gs1-gichul.js';
import { GS1_SHIMHWA_UNITS } from './manifests/gs1-shimhwa.js';
import { parsePdfWithClaude } from '../../src/lib/parse-pdf.js';
import { matchProblemsToVideos, toContentGroupVideos } from '../../src/lib/match-videos.js';

// ─────────────────────────────────────────────
// Phase A: 개념강의 19 → 14차시 재구성
// ─────────────────────────────────────────────

async function runConcept(sc: ReturnType<typeof getServiceClient>, opts: {
  isDryRun: boolean;
  force: boolean;
}) {
  log('📚', '개념강의 재구성 시작 (19 → 14차시)');
  const { isDryRun, force } = opts;

  // 1. 기존 active concept items 아카이브
  log('🗂️', '기존 19차시 아카이브 중...');
  const archiveResult = await archiveActiveItems(
    sc, GS1_CONCEPT_CURRICULUM_ID, 'concept', { dryRun: isDryRun, force },
  );
  if (!isDryRun) success(`아카이브 완료: ${archiveResult.archivedCount}개`);

  // 2. 14차시 신규 생성
  log('✨', '14차시 신규 생성 중...');
  let createdCount = 0;
  let skippedCount = 0;
  const warnings: string[] = [];

  for (const lecture of GS1_CONCEPT_LECTURES) {
    info(`\n[${lecture.session}차시] ${lecture.title}`);

    // PDF 업로드
    const pdfEntries: Array<{ url: string; original_name: string; file_size?: string }> = [];
    for (const pdfDef of lecture.pdfs) {
      const localPath = resolveDrivePath(`content/gs1_concept/${pdfDef.relativePath}`);
      const storagePath = `concept/gs1/${pdfDef.relativePath}`;
      const entry = await uploadAndMakePdf(localPath, storagePath, pdfDef.filename, isDryRun);
      if (entry) {
        pdfEntries.push(entry);
      } else {
        warnings.push(`[${lecture.session}차시] PDF 누락: ${pdfDef.filename}`);
      }
    }

    // curriculum_item find-or-create
    const itemResult = await findOrCreateCurriculumItem(
      sc,
      {
        curriculum_id: GS1_CONCEPT_CURRICULUM_ID,
        session_number: lecture.session,
        title: lecture.title,
        unit_name: lecture.title,
        category: 'concept',
        variant_label: null,
        sort_order: lecture.session,
      },
      'gs1',
      isDryRun,
    );
    itemResult.action === 'created' ? createdCount++ : skippedCount++;
    info(`  item: ${itemResult.action} → /lesson/${itemResult.public_slug}`);

    if (isDryRun) continue;

    // session_block 생성 (content_group)
    const content: Record<string, unknown> = {
      label: lecture.title,
      page_range: 'concept',
      videos: lecture.videos,
    };

    if (pdfEntries.length === 1) {
      content.pdf = pdfEntries[0];
    } else if (pdfEntries.length > 1) {
      content.pdfs = pdfEntries;
    }

    await upsertBlocks(sc, [{
      curriculum_item_id: itemResult.id,
      block_type: 'content_group',
      order_index: 0,
      content,
    }], isDryRun);
  }

  console.log('');
  if (warnings.length > 0) {
    warn(`⚠️  누락 파일 ${warnings.length}개:`);
    warnings.forEach(w => warn(`   ${w}`));
  }
  success(`개념강의 완료: 생성 ${createdCount}개, 기존 ${skippedCount}개`);
}

// ─────────────────────────────────────────────
// Phase B: 기출 6단원 생성
// ─────────────────────────────────────────────

async function runGichul(sc: ReturnType<typeof getServiceClient>, opts: {
  isDryRun: boolean;
  unitFilter?: string;
  subject: string;
}) {
  log('📖', '기출 단원 생성 시작');
  const { isDryRun, unitFilter, subject } = opts;

  const { id: curriculumId, created } = await findOrCreateCurriculum(
    sc, '[공수1] 기출', 'gs1', '2026-01-01', isDryRun,
  );
  info(`기출 시즌 ID: ${curriculumId} (${created ? '신규' : '기존'})`);

  const units = unitFilter
    ? GS1_GICHUL_UNITS.filter(u => u.title.includes(unitFilter) || u.unit_name.includes(unitFilter))
    : GS1_GICHUL_UNITS;

  if (units.length === 0) {
    error(`단원 필터 "${unitFilter}" 에 해당하는 단원이 없습니다`);
  }

  let createdCount = 0;
  const warnings: string[] = [];

  for (const unit of units) {
    info(`\n[단원 ${unit.session}] ${unit.title}${unit.variant_label ? ` (variant=${unit.variant_label})` : ''}`);

    const itemResult = await findOrCreateCurriculumItem(
      sc,
      {
        curriculum_id: curriculumId,
        session_number: unit.session,
        title: unit.title,
        unit_name: unit.unit_name,
        category: 'gichul',
        variant_label: unit.variant_label,
        sort_order: unit.session,
      },
      subject,
      isDryRun,
    );
    itemResult.action === 'created' ? createdCount++ : 0;
    info(`  item: ${itemResult.action} → /lesson/${itemResult.public_slug}`);

    if (isDryRun) continue;

    const blocks: Parameters<typeof upsertBlocks>[1] = [];
    let orderIndex = 0;

    for (const levelDef of unit.levels) {
      const baseFolder = resolveDrivePath(`gs1/${unit.unitFolder}/${levelDef.subfolder ?? unit.gichulSubfolder}`);

      // 파일 존재 확인
      const validFiles: Array<{ local: string; storagePath: string; name: string }> = [];
      for (const filename of levelDef.files) {
        const local = path.join(baseFolder, filename);
        if (!fs.existsSync(local)) {
          warnings.push(`[단원${unit.session}/${levelDef.label}] 파일 없음: ${filename}`);
          continue;
        }
        const storagePath = `gichul/gs1/${unit.unitFolder}/${levelDef.subfolder ?? unit.gichulSubfolder}/${filename}`;
        validFiles.push({ local, storagePath, name: filename });
      }

      if (validFiles.length === 0) {
        warn(`  ⚠️  ${levelDef.label}: 파일 없음 스킵`);
        continue;
      }

      // PDF 업로드
      const pdfEntries: Array<{ url: string; original_name: string; file_size?: string }> = [];
      for (const f of validFiles) {
        const entry = await uploadAndMakePdf(f.local, f.storagePath, f.name, isDryRun);
        if (entry) pdfEntries.push(entry);
      }

      // 힌트북 업로드
      let hintbookEntry: { url: string; original_name: string } | undefined;
      if (levelDef.hintbookFiles) {
        for (const hbFile of levelDef.hintbookFiles.filter(Boolean) as string[]) {
          const local = path.join(baseFolder, hbFile);
          if (fs.existsSync(local)) {
            const storagePath = `gichul/gs1/${unit.unitFolder}/${levelDef.subfolder ?? unit.gichulSubfolder}/${hbFile}`;
            const entry = await uploadAndMakePdf(local, storagePath, hbFile, isDryRun);
            if (entry) { hintbookEntry = { url: entry.url, original_name: entry.original_name }; break; }
          }
        }
      }

      // 해설강의 매칭 (레벨3, 4)
      let videos: ReturnType<typeof toContentGroupVideos> = [];
      if (levelDef.expectsVideos && pdfEntries.length > 0) {
        const firstFile = validFiles[0];
        info(`  ${levelDef.label} 해설강의 매칭 중...`);
        try {
          const buffer = fs.readFileSync(firstFile.local);
          const problems = await parsePdfWithClaude(buffer);
          const matched = await matchProblemsToVideos(problems, subject);
          videos = toContentGroupVideos(matched);
          info(`  → ${videos.length}/${problems.length}개 매칭`);
        } catch (err) {
          warn(`  해설강의 매칭 실패 (빈 배열): ${(err as Error).message}`);
        }
      }

      const content: Record<string, unknown> = {
        label: levelDef.label,
        ...(pdfEntries.length === 1 ? { pdf: pdfEntries[0] } : { pdfs: pdfEntries }),
        ...(hintbookEntry ? { hintbook: hintbookEntry } : {}),
        ...(videos.length > 0 ? { videos } : {}),
      };

      blocks.push({
        curriculum_item_id: itemResult.id,
        block_type: 'content_group',
        order_index: orderIndex++,
        content,
      });
    }

    if (blocks.length > 0) {
      await upsertBlocks(sc, blocks, isDryRun);
    }
  }

  console.log('');
  if (warnings.length > 0) {
    warn(`⚠️  누락 파일 ${warnings.length}개:`);
    warnings.forEach(w => warn(`   ${w}`));
  }
  success(`기출 완료: 생성 ${createdCount}개`);
}

// ─────────────────────────────────────────────
// Phase C: 심화유형 5단원 생성
// ─────────────────────────────────────────────

async function runShimhwa(sc: ReturnType<typeof getServiceClient>, opts: {
  isDryRun: boolean;
  unitFilter?: string;
  subject: string;
}) {
  log('🎯', '심화유형 단원 생성 시작');
  const { isDryRun, unitFilter, subject } = opts;

  const { id: curriculumId, created } = await findOrCreateCurriculum(
    sc, '[공수1] 심화유형', 'gs1', '2026-01-01', isDryRun,
  );
  info(`심화유형 시즌 ID: ${curriculumId} (${created ? '신규' : '기존'})`);

  const units = unitFilter
    ? GS1_SHIMHWA_UNITS.filter(u => u.title.includes(unitFilter) || u.unit_name.includes(unitFilter))
    : GS1_SHIMHWA_UNITS;

  let createdCount = 0;
  const warnings: string[] = [];

  for (const unit of units) {
    info(`\n[단원 ${unit.session}] ${unit.title}`);

    // 빈 파일명이면 스킵
    if (!unit.stage1.file) {
      warn(`  심화 콘텐츠 없음 — 스킵 (파일명 채운 후 재실행)`);
      continue;
    }

    const itemResult = await findOrCreateCurriculumItem(
      sc,
      {
        curriculum_id: curriculumId,
        session_number: unit.session,
        title: unit.title,
        unit_name: unit.unit_name,
        category: 'shimhwa',
        variant_label: null,
        sort_order: unit.session,
      },
      subject,
      isDryRun,
    );
    itemResult.action === 'created' ? createdCount++ : 0;
    info(`  item: ${itemResult.action} → /lesson/${itemResult.public_slug}`);

    if (isDryRun) continue;

    const baseFolder = resolveDrivePath(`gs1/${unit.unitFolder}/${unit.shimhwaSubfolder}`);

    async function uploadStageFile(filename: string, label: string) {
      if (!filename) return null;
      const local = path.join(baseFolder, filename);
      const storagePath = `shimhwa/gs1/${unit.unitFolder}/${unit.shimhwaSubfolder}/${filename}`;
      const entry = await uploadAndMakePdf(local, storagePath, filename, isDryRun);
      if (!entry) warnings.push(`[단원${unit.session}/${label}] 파일 없음: ${filename}`);
      return entry;
    }

    // 1단계
    const s1Pdf = await uploadStageFile(unit.stage1.file, '1단계');
    const s1Hint = unit.stage1.hintbookFile ? await uploadStageFile(unit.stage1.hintbookFile, '1단계힌트') : null;

    // 2단계
    const s2Pdf = await uploadStageFile(unit.stage2.file, '2단계');
    const s2Hint = unit.stage2.hintbookFile ? await uploadStageFile(unit.stage2.hintbookFile, '2단계힌트') : null;

    // 3단계 side_a
    const s3aPdf = await uploadStageFile(unit.stage3.side_a.file, '3단계-A');
    const s3aHint = unit.stage3.side_a.hintbookFile
      ? await uploadStageFile(unit.stage3.side_a.hintbookFile, '3단계-A-힌트') : null;

    // 3단계 side_b (있으면)
    let s3bPdf = null, s3bHint = null;
    if (unit.stage3.side_b) {
      s3bPdf = await uploadStageFile(unit.stage3.side_b.file, '3단계-B');
      s3bHint = unit.stage3.side_b.hintbookFile
        ? await uploadStageFile(unit.stage3.side_b.hintbookFile, '3단계-B-힌트') : null;
    }

    const blocks: Parameters<typeof upsertBlocks>[1] = [];

    if (s1Pdf) {
      blocks.push({
        curriculum_item_id: itemResult.id,
        block_type: 'content_group',
        order_index: 0,
        content: {
          label: '1단계',
          pdf: s1Pdf,
          ...(s1Hint ? { hintbook: { url: s1Hint.url, original_name: s1Hint.original_name } } : {}),
        },
      });
    }

    if (s2Pdf) {
      blocks.push({
        curriculum_item_id: itemResult.id,
        block_type: 'content_group',
        order_index: 1,
        content: {
          label: '2단계',
          pdf: s2Pdf,
          ...(s2Hint ? { hintbook: { url: s2Hint.url, original_name: s2Hint.original_name } } : {}),
        },
      });
    }

    if (s3aPdf) {
      if (s3bPdf) {
        // ShimhwaPairLayout: side_a + side_b
        blocks.push({
          curriculum_item_id: itemResult.id,
          block_type: 'content_group',
          order_index: 2,
          content: {
            label: '3단계',
            side_a: {
              label: 'A',
              pdf: s3aPdf,
              ...(s3aHint ? { hintbook: { url: s3aHint.url, original_name: s3aHint.original_name } } : {}),
            },
            side_b: {
              label: 'B',
              pdf: s3bPdf,
              ...(s3bHint ? { hintbook: { url: s3bHint.url, original_name: s3bHint.original_name } } : {}),
            },
          },
        });
      } else {
        // side_b 없으면 단일 블록
        blocks.push({
          curriculum_item_id: itemResult.id,
          block_type: 'content_group',
          order_index: 2,
          content: {
            label: '3단계',
            pdf: s3aPdf,
            ...(s3aHint ? { hintbook: { url: s3aHint.url, original_name: s3aHint.original_name } } : {}),
          },
        });
      }
    }

    if (blocks.length > 0) {
      await upsertBlocks(sc, blocks, isDryRun);
    }
  }

  console.log('');
  if (warnings.length > 0) {
    warn(`⚠️  누락 파일 ${warnings.length}개:`);
    warnings.forEach(w => warn(`   ${w}`));
  }
  success(`심화유형 완료: 생성 ${createdCount}개`);
}

// ─────────────────────────────────────────────
// main
// ─────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const subject = args.options.subject || 'gs1';
  const part = args.options.part;
  const isDryRun = args.flags.has('dry-run');
  const force = args.flags.has('force');
  const unitFilter = args.options.unit;

  if (!part) {
    error('--part concept|gichul|shimhwa|all 옵션이 필요합니다');
  }

  dryRunBanner(isDryRun);
  info(`subject: ${subject}, part: ${part}${unitFilter ? `, unit: "${unitFilter}"` : ''}`);
  console.log('');

  const sc = getServiceClient();

  if (part === 'concept' || part === 'all') {
    await runConcept(sc, { isDryRun, force });
  }
  if (part === 'gichul' || part === 'all') {
    await runGichul(sc, { isDryRun, unitFilter, subject });
  }
  if (part === 'shimhwa' || part === 'all') {
    await runShimhwa(sc, { isDryRun, unitFilter, subject });
  }
  if (!['concept', 'gichul', 'shimhwa', 'all'].includes(part)) {
    error(`알 수 없는 --part 값: ${part} (concept|gichul|shimhwa|all 중 하나)`);
  }
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
