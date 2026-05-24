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
 * --dry-run      : DB 변경 없이 예정 작업 출력
 * --force        : SLA 배정 학생 있어도 아카이브 진행
 * --force-upload : 동일 경로 PDF가 이미 있어도 덮어쓰기 (수정된 PDF 재반영, gichul)
 * --unit         : gichul/shimhwa 의 단원 이름 필터 (부분 일치)
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
import type { ConceptLecture } from './manifests/gs1-concept.js';
import {
  GS1_CONCEPT_CURRICULUM_ID, GS1_CONCEPT_LECTURES,
  GS1_CONCEPT_SUBJECT_SLUG, GS1_CONCEPT_CURRICULUM_TITLE,
  GS1_CONCEPT_PDF_BASE, GS1_CONCEPT_CDN_PREFIX,
} from './manifests/gs1-concept.js';
import {
  DS2_CONCEPT_LECTURES, DS2_CONCEPT_SUBJECT_SLUG, DS2_CONCEPT_CURRICULUM_TITLE,
  DS2_CONCEPT_PDF_BASE, DS2_CONCEPT_CDN_PREFIX,
} from './manifests/ds2-concept.js';
import {
  GS2_CONCEPT_LECTURES, GS2_CONCEPT_SUBJECT_SLUG, GS2_CONCEPT_CURRICULUM_TITLE,
  GS2_CONCEPT_PDF_BASE, GS2_CONCEPT_CDN_PREFIX,
} from './manifests/gs2-concept.js';
import type { GichulUnit } from './manifests/gs1-gichul.js';
import { GS1_GICHUL_UNITS } from './manifests/gs1-gichul.js';
import type { ShimhwaUnit } from './manifests/gs1-shimhwa.js';
import { GS1_SHIMHWA_UNITS } from './manifests/gs1-shimhwa.js';
import {
  DS2_GICHUL_UNITS, DS2_GICHUL_SUBJECT_SLUG, DS2_GICHUL_CURRICULUM_TITLE,
  DS2_GICHUL_DRIVE_BASE, DS2_GICHUL_CDN_PREFIX,
} from './manifests/ds2-gichul.js';
import {
  GS2_GICHUL_UNITS, GS2_GICHUL_SUBJECT_SLUG, GS2_GICHUL_CURRICULUM_TITLE,
  GS2_GICHUL_DRIVE_BASE, GS2_GICHUL_CDN_PREFIX,
} from './manifests/gs2-gichul.js';
import {
  GS2_SHIMHWA_UNITS, GS2_SHIMHWA_SUBJECT_SLUG, GS2_SHIMHWA_CURRICULUM_TITLE,
  GS2_SHIMHWA_DRIVE_BASE, GS2_SHIMHWA_CDN_PREFIX,
} from './manifests/gs2-shimhwa.js';
import {
  DS2_SHIMHWA_UNITS, DS2_SHIMHWA_SUBJECT_SLUG, DS2_SHIMHWA_CURRICULUM_TITLE,
  DS2_SHIMHWA_DRIVE_BASE, DS2_SHIMHWA_CDN_PREFIX,
} from './manifests/ds2-shimhwa.js';
import { parsePdfWithClaude } from '../../src/lib/parse-pdf.js';
import { matchProblemsToVideos, toContentGroupVideos } from '../../src/lib/match-videos.js';

// ─── Concept manifest 인터페이스 (subject 별 manifest 통합) ─────────────────

interface ConceptManifest {
  /** 이미 존재하는 curriculum_id (선택). 미지정 시 title+subject_slug 로 findOrCreate */
  curriculumId?: string;
  subjectSlug: string;
  curriculumTitle: string;
  pdfBaseFolder: string;   // resolveDrivePath 기준 (예: 'content/gs1_concept')
  cdnPrefix: string;       // Bunny Storage 업로드 prefix (예: 'concept/gs1')
  lectures: ConceptLecture[];
}

interface GichulManifest {
  subjectSlug: string;
  curriculumTitle: string;
  driveBase: string;    // 예: 'gs1', 'ds2'
  cdnPrefix: string;    // 예: 'gichul/gs1'
  units: GichulUnit[];
}

interface ShimhwaManifest {
  subjectSlug: string;
  curriculumTitle: string;
  driveBase: string;
  cdnPrefix: string;
  units: ShimhwaUnit[];
}

const GICHUL_MANIFESTS: Record<string, GichulManifest> = {
  gs1: {
    subjectSlug: 'gs1',
    curriculumTitle: '[공수1] 기출',
    driveBase: 'gs1',
    cdnPrefix: 'gichul/gs1',
    units: GS1_GICHUL_UNITS,
  },
  ds2: {
    subjectSlug: DS2_GICHUL_SUBJECT_SLUG,
    curriculumTitle: DS2_GICHUL_CURRICULUM_TITLE,
    driveBase: DS2_GICHUL_DRIVE_BASE,
    cdnPrefix: DS2_GICHUL_CDN_PREFIX,
    units: DS2_GICHUL_UNITS,
  },
  gs2: {
    subjectSlug: GS2_GICHUL_SUBJECT_SLUG,
    curriculumTitle: GS2_GICHUL_CURRICULUM_TITLE,
    driveBase: GS2_GICHUL_DRIVE_BASE,
    cdnPrefix: GS2_GICHUL_CDN_PREFIX,
    units: GS2_GICHUL_UNITS,
  },
};

const SHIMHWA_MANIFESTS: Record<string, ShimhwaManifest> = {
  gs1: {
    subjectSlug: 'gs1',
    curriculumTitle: '[공수1] 심화유형',
    driveBase: 'gs1',
    cdnPrefix: 'shimhwa/gs1',
    units: GS1_SHIMHWA_UNITS,
  },
  gs2: {
    subjectSlug: GS2_SHIMHWA_SUBJECT_SLUG,
    curriculumTitle: GS2_SHIMHWA_CURRICULUM_TITLE,
    driveBase: GS2_SHIMHWA_DRIVE_BASE,
    cdnPrefix: GS2_SHIMHWA_CDN_PREFIX,
    units: GS2_SHIMHWA_UNITS,
  },
  ds2: {
    subjectSlug: DS2_SHIMHWA_SUBJECT_SLUG,
    curriculumTitle: DS2_SHIMHWA_CURRICULUM_TITLE,
    driveBase: DS2_SHIMHWA_DRIVE_BASE,
    cdnPrefix: DS2_SHIMHWA_CDN_PREFIX,
    units: DS2_SHIMHWA_UNITS,
  },
};

const CONCEPT_MANIFESTS: Record<string, ConceptManifest> = {
  gs1: {
    curriculumId: GS1_CONCEPT_CURRICULUM_ID,
    subjectSlug: GS1_CONCEPT_SUBJECT_SLUG,
    curriculumTitle: GS1_CONCEPT_CURRICULUM_TITLE,
    pdfBaseFolder: GS1_CONCEPT_PDF_BASE,
    cdnPrefix: GS1_CONCEPT_CDN_PREFIX,
    lectures: GS1_CONCEPT_LECTURES,
  },
  ds2: {
    subjectSlug: DS2_CONCEPT_SUBJECT_SLUG,
    curriculumTitle: DS2_CONCEPT_CURRICULUM_TITLE,
    pdfBaseFolder: DS2_CONCEPT_PDF_BASE,
    cdnPrefix: DS2_CONCEPT_CDN_PREFIX,
    lectures: DS2_CONCEPT_LECTURES,
  },
  gs2: {
    subjectSlug: GS2_CONCEPT_SUBJECT_SLUG,
    curriculumTitle: GS2_CONCEPT_CURRICULUM_TITLE,
    pdfBaseFolder: GS2_CONCEPT_PDF_BASE,
    cdnPrefix: GS2_CONCEPT_CDN_PREFIX,
    lectures: GS2_CONCEPT_LECTURES,
  },
};

// ─────────────────────────────────────────────
// Phase A: 개념강의 19 → 14차시 재구성
// ─────────────────────────────────────────────

async function runConcept(sc: ReturnType<typeof getServiceClient>, manifest: ConceptManifest, opts: {
  isDryRun: boolean;
  force: boolean;
}) {
  log('📚', `[${manifest.subjectSlug}] 개념강의 재구성 시작 (${manifest.lectures.length}차시)`);
  const { isDryRun, force } = opts;

  // 0. curriculum_id 해결 (manifest 에 있으면 사용, 없으면 findOrCreate)
  let curriculumId: string;
  if (manifest.curriculumId) {
    curriculumId = manifest.curriculumId;
    info(`Curriculum (기존 ID): ${curriculumId}`);
  } else {
    const result = await findOrCreateCurriculum(
      sc, manifest.curriculumTitle, manifest.subjectSlug, '2026-01-01', isDryRun,
    );
    curriculumId = result.id;
    info(`Curriculum ${result.created ? '신규 생성' : '기존'}: ${curriculumId} ("${manifest.curriculumTitle}")`);
  }

  // 1. manifest 에 없는 세션 번호의 기존 items 만 아카이브 (멱등성 유지)
  // 같은 세션 번호의 items 는 findOrCreateCurriculumItem 가 UPDATE 처리 → slug 보존
  log('🗂️', `manifest 외 ${manifest.subjectSlug} concept items 정리 중...`);
  if (curriculumId === '(dry-run)') {
    info('[DRY RUN] 신규 curriculum 예정 (실 DB INSERT 안 됨) — 정리 단계 스킵');
  } else {
    const manifestSessions = new Set(manifest.lectures.map(l => l.session));
    const { data: extantItems } = await sc
      .from('curriculum_items')
      .select('id, public_slug, title, session_number')
      .eq('curriculum_id', curriculumId)
      .eq('category', 'concept')
      .is('archived_at', null);
    const extras = (extantItems || []).filter(
      (i: { session_number: number | null }) => i.session_number === null || !manifestSessions.has(i.session_number),
    );
    if (extras.length === 0) {
      info(`정리 대상 없음 (모든 active item 이 manifest 에 포함됨)`);
    } else {
      info(`manifest 외 active item: ${extras.length}개`);
      extras.forEach((i: { public_slug: string; session_number: number | null; title: string }) =>
        info(`  - [${i.public_slug}] s${i.session_number} ${i.title}`),
      );
      // SLA 검증 — extras 에 SLA 있으면 force 없이는 중단
      if (!force) {
        const { count: slaCount } = await sc
          .from('student_lesson_assignments')
          .select('id', { count: 'exact', head: true })
          .in('curriculum_item_id', extras.map((i: { id: string }) => i.id));
        if (slaCount && slaCount > 0) {
          error(`정리 대상 items 에 ${slaCount}개 SLA 존재. --force 필요`);
        }
      }
      if (isDryRun) {
        warn('DRY RUN: 실제 정리 스킵');
      } else {
        const { error: archErr } = await sc
          .from('curriculum_items')
          .update({ archived_at: new Date().toISOString() })
          .in('id', extras.map((i: { id: string }) => i.id));
        if (archErr) error(`정리 실패: ${archErr.message}`);
        success(`정리 완료: ${extras.length}개 archived`);
      }
    }
  }

  // 2. 차시 신규 생성
  log('✨', `${manifest.lectures.length}차시 신규 생성 중...`);
  let createdCount = 0;
  let skippedCount = 0;
  const warnings: string[] = [];

  for (const lecture of manifest.lectures) {
    info(`\n[${lecture.session}차시] ${lecture.title}`);

    // PDF 업로드
    const pdfEntries: Array<{ url: string; original_name: string; file_size?: string }> = [];
    for (const pdfDef of lecture.pdfs) {
      const localPath = resolveDrivePath(`${manifest.pdfBaseFolder}/${pdfDef.relativePath}`);
      const storagePath = `${manifest.cdnPrefix}/${pdfDef.relativePath}`;
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
        curriculum_id: curriculumId,
        session_number: lecture.session,
        title: lecture.title,
        unit_name: lecture.title,
        category: 'concept',
        variant_label: null,
        sort_order: lecture.session,
      },
      manifest.subjectSlug,
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
  success(`[${manifest.subjectSlug}] 개념강의 완료: 생성 ${createdCount}개, 기존 ${skippedCount}개`);
}

// ─────────────────────────────────────────────
// Phase B: 기출 6단원 생성
// ─────────────────────────────────────────────

async function runGichul(sc: ReturnType<typeof getServiceClient>, manifest: GichulManifest, opts: {
  isDryRun: boolean;
  unitFilter?: string;
  forceUpload?: boolean;
}) {
  log('📖', `[${manifest.subjectSlug}] 기출 단원 생성 시작`);
  const { isDryRun, unitFilter, forceUpload = false } = opts;
  const subject = manifest.subjectSlug;

  const { id: curriculumId, created } = await findOrCreateCurriculum(
    sc, manifest.curriculumTitle, subject, '2026-01-01', isDryRun,
  );
  info(`기출 시즌 ID: ${curriculumId} (${created ? '신규' : '기존'})`);

  const units = unitFilter
    ? manifest.units.filter(u => u.title.includes(unitFilter) || u.unit_name.includes(unitFilter))
    : manifest.units;

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

    // 기출 학습페이지에서 레벨5 제외 (별도 "레벨5 모음" 페이지에서 따로 다룸).
    // manifest 의 레벨5 데이터는 그대로 보존 — 나중에 레벨5 모음 빌드 시 재사용.
    const filteredLevels = unit.levels.filter(l => !/^레벨5/.test(l.label));

    for (const levelDef of filteredLevels) {
      const baseFolder = resolveDrivePath(`${manifest.driveBase}/${unit.unitFolder}/${levelDef.subfolder ?? unit.gichulSubfolder}`);

      // 파일 존재 확인
      const validFiles: Array<{ local: string; storagePath: string; name: string }> = [];
      for (const filename of levelDef.files) {
        const local = path.join(baseFolder, filename);
        if (!fs.existsSync(local)) {
          warnings.push(`[단원${unit.session}/${levelDef.label}] 파일 없음: ${filename}`);
          continue;
        }
        const storagePath = `${manifest.cdnPrefix}/${unit.unitFolder}/${levelDef.subfolder ?? unit.gichulSubfolder}/${filename}`;
        validFiles.push({ local, storagePath, name: filename });
      }

      if (validFiles.length === 0) {
        warn(`  ⚠️  ${levelDef.label}: 파일 없음 스킵`);
        continue;
      }

      // PDF 업로드
      const pdfEntries: Array<{ url: string; original_name: string; file_size?: string }> = [];
      for (const f of validFiles) {
        const entry = await uploadAndMakePdf(f.local, f.storagePath, f.name, isDryRun, forceUpload);
        if (entry) pdfEntries.push(entry);
      }

      // 힌트북 업로드
      let hintbookEntry: { url: string; original_name: string } | undefined;
      if (levelDef.hintbookFiles) {
        for (const hbFile of levelDef.hintbookFiles.filter(Boolean) as string[]) {
          const local = path.join(baseFolder, hbFile);
          if (fs.existsSync(local)) {
            const storagePath = `${manifest.cdnPrefix}/${unit.unitFolder}/${levelDef.subfolder ?? unit.gichulSubfolder}/${hbFile}`;
            const entry = await uploadAndMakePdf(local, storagePath, hbFile, isDryRun, forceUpload);
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
        ...(levelDef.description ? { description: levelDef.description } : {}),
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
  success(`[${manifest.subjectSlug}] 기출 완료: 생성 ${createdCount}개`);
}

// ─────────────────────────────────────────────
// Phase C: 심화유형 5단원 생성
// ─────────────────────────────────────────────

async function runShimhwa(sc: ReturnType<typeof getServiceClient>, manifest: ShimhwaManifest, opts: {
  isDryRun: boolean;
  unitFilter?: string;
}) {
  log('🎯', `[${manifest.subjectSlug}] 심화유형 단원 생성 시작`);
  const { isDryRun, unitFilter } = opts;
  const subject = manifest.subjectSlug;

  const { id: curriculumId, created } = await findOrCreateCurriculum(
    sc, manifest.curriculumTitle, subject, '2026-01-01', isDryRun,
  );
  info(`심화유형 시즌 ID: ${curriculumId} (${created ? '신규' : '기존'})`);

  const units = unitFilter
    ? manifest.units.filter(u => u.title.includes(unitFilter) || u.unit_name.includes(unitFilter))
    : manifest.units;

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

    const baseFolder = resolveDrivePath(`${manifest.driveBase}/${unit.unitFolder}/${unit.shimhwaSubfolder}`);

    async function uploadStageFile(filename: string, label: string) {
      if (!filename) return null;
      const local = path.join(baseFolder, filename);
      const storagePath = `${manifest.cdnPrefix}/${unit.unitFolder}/${unit.shimhwaSubfolder}/${filename}`;
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
  success(`[${manifest.subjectSlug}] 심화유형 완료: 생성 ${createdCount}개`);
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
  const forceUpload = args.flags.has('force-upload');
  const unitFilter = args.options.unit;

  if (!part) {
    error('--part concept|gichul|shimhwa|all 옵션이 필요합니다');
  }

  dryRunBanner(isDryRun);
  info(`subject: ${subject}, part: ${part}${unitFilter ? `, unit: "${unitFilter}"` : ''}`);
  console.log('');

  const sc = getServiceClient();

  if (part === 'concept' || part === 'all') {
    const manifest = CONCEPT_MANIFESTS[subject];
    if (!manifest) {
      error(`--subject ${subject} 에 해당하는 concept manifest 없음 (gs1|ds2|gs2)`);
    }
    await runConcept(sc, manifest, { isDryRun, force });
  }
  if (part === 'gichul' || part === 'all') {
    const gichulManifest = GICHUL_MANIFESTS[subject];
    if (!gichulManifest) {
      if (part === 'all') warn(`--subject ${subject} 에 해당하는 gichul manifest 없음 (스킵)`);
      else error(`--subject ${subject} 에 해당하는 gichul manifest 없음 (gs1|ds2|gs2)`);
    } else {
      await runGichul(sc, gichulManifest, { isDryRun, unitFilter, forceUpload });
    }
  }
  if (part === 'shimhwa' || part === 'all') {
    const shimhwaManifest = SHIMHWA_MANIFESTS[subject];
    if (!shimhwaManifest) {
      if (part === 'all') warn(`--subject ${subject} 에 해당하는 shimhwa manifest 없음 (스킵)`);
      else error(`--subject ${subject} 에 해당하는 shimhwa manifest 없음 (gs1|gs2|ds2)`);
    } else {
      await runShimhwa(sc, shimhwaManifest, { isDryRun, unitFilter });
    }
  }
  if (!['concept', 'gichul', 'shimhwa', 'all'].includes(part)) {
    error(`알 수 없는 --part 값: ${part} (concept|gichul|shimhwa|all 중 하나)`);
  }
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
