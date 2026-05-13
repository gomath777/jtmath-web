#!/usr/bin/env npx tsx
/**
 * 학생 SLA 마이그레이션 runner
 *
 * spec 파일 (migration-spec/old-to-new-may-2026.ts) 를 읽어
 * student_lesson_assignments 에 INSERT.
 *
 * 사용법:
 *   npm run admin:migrate-sla -- --dry-run                # 전체 dry-run
 *   npm run admin:migrate-sla -- --student 송승원 --dry-run  # 1명만
 *   npm run admin:migrate-sla -- --student 송승원           # 1명 실행
 *   npm run admin:migrate-sla                              # 전체 실행
 *
 * 멱등성: 같은 (profile_id, curriculum_item_id, scheduled_date) 가 있으면 스킵.
 *
 * 상태 계산:
 *   - scheduled_date <= today → status='released', released_at=now()
 *   - scheduled_date  > today → status='pending' (released_at=null)
 */

import { parseArgs, getServiceClient, log, error, success, info, warn, dryRunBanner } from './_shared.js';
import { MIGRATION_SPEC, type MigrationRow } from './migration-spec/old-to-new-may-2026.js';

async function main() {
  const args = parseArgs();
  const isDryRun = args.flags.has('dry-run');
  const studentFilter = args.options.student;

  dryRunBanner(isDryRun);

  // 필터
  const rows = studentFilter
    ? MIGRATION_SPEC.filter(r => r.student === studentFilter)
    : MIGRATION_SPEC;

  if (rows.length === 0) {
    error(`spec 에 해당 학생 없음: ${studentFilter}`);
  }

  info(`총 spec row: ${rows.length}건 (대상 학생: ${studentFilter || '전체'})`);
  const skipCount = rows.filter(r => r.skip_reason).length;
  const toInsert = rows.filter(r => !r.skip_reason && r.new_slug);
  info(`  - INSERT 대상: ${toInsert.length}건`);
  info(`  - skip 대상: ${skipCount}건`);
  console.log('');

  const sc = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  // 사전 조회 1: 학생 name → profile_id
  const studentNames = [...new Set(rows.map(r => r.student))];
  const { data: profiles, error: pErr } = await sc
    .from('profiles')
    .select('id, name')
    .in('name', studentNames);
  if (pErr) error(`profiles 조회 실패: ${pErr.message}`);
  const profileByName = new Map((profiles || []).map((p: { name: string; id: string }) => [p.name, p.id]));

  // 누락 학생 확인
  for (const name of studentNames) {
    if (!profileByName.has(name)) {
      warn(`profile 없는 학생 (spec row 스킵 예정): ${name}`);
    }
  }

  // 사전 조회 2: slug → curriculum_item_id
  const slugs = [...new Set(toInsert.map(r => r.new_slug!).filter(Boolean))];
  const { data: items, error: iErr } = await sc
    .from('curriculum_items')
    .select('id, public_slug')
    .in('public_slug', slugs)
    .is('archived_at', null);
  if (iErr) error(`curriculum_items 조회 실패: ${iErr.message}`);
  const itemBySlug = new Map((items || []).map((i: { public_slug: string; id: string }) => [i.public_slug, i.id]));

  for (const slug of slugs) {
    if (!itemBySlug.has(slug)) {
      warn(`존재하지 않는 slug (row 스킵 예정): ${slug}`);
    }
  }

  console.log('');
  log('🚀', 'SLA 마이그레이션 시작');
  console.log('');

  let insertedCount = 0;
  let skippedCount = 0;
  let alreadyExistCount = 0;
  let errorCount = 0;
  const warnings: string[] = [];

  for (const row of rows) {
    const tag = `[${row.student}/${row.scheduled_date}]`;

    if (row.skip_reason) {
      skippedCount++;
      info(`${tag} ⊘ skip (${row.skip_reason}): "${row.source}"`);
      continue;
    }

    const profileId = profileByName.get(row.student);
    if (!profileId) {
      warnings.push(`${tag} profile 없음: ${row.student}`);
      errorCount++;
      continue;
    }

    if (!row.new_slug) {
      warnings.push(`${tag} new_slug null 인데 skip_reason 도 없음 (spec 버그?)`);
      errorCount++;
      continue;
    }

    const itemId = itemBySlug.get(row.new_slug);
    if (!itemId) {
      warnings.push(`${tag} item 없음: ${row.new_slug}`);
      errorCount++;
      continue;
    }

    // 멱등성: 기존 SLA 확인
    const { data: existing, error: exErr } = await sc
      .from('student_lesson_assignments')
      .select('id, status')
      .eq('profile_id', profileId)
      .eq('curriculum_item_id', itemId)
      .eq('scheduled_date', row.scheduled_date)
      .maybeSingle();
    if (exErr) {
      warnings.push(`${tag} SLA 조회 실패: ${exErr.message}`);
      errorCount++;
      continue;
    }
    if (existing) {
      alreadyExistCount++;
      info(`${tag} ⏭️  이미 존재 (${existing.status})`);
      continue;
    }

    // status / released_at 계산
    const isPast = row.scheduled_date <= today;
    const status = isPast ? 'released' : 'pending';
    const releasedAt = isPast ? new Date().toISOString() : null;

    info(`${tag} ✨ INSERT → ${row.new_slug} (${status})`);

    if (!isDryRun) {
      const { error: insErr } = await sc
        .from('student_lesson_assignments')
        .insert({
          profile_id: profileId,
          curriculum_item_id: itemId,
          scheduled_date: row.scheduled_date,
          status,
          released_at: releasedAt,
        });
      if (insErr) {
        warnings.push(`${tag} INSERT 실패: ${insErr.message}`);
        errorCount++;
        continue;
      }
    }
    insertedCount++;
  }

  console.log('');
  log('📊', '마이그레이션 결과');
  info(`  INSERT: ${insertedCount}건`);
  info(`  이미 존재 (스킵): ${alreadyExistCount}건`);
  info(`  spec skip (skip_reason): ${skippedCount}건`);
  if (errorCount > 0) warn(`  ❌ 에러: ${errorCount}건`);

  if (warnings.length > 0) {
    console.log('');
    warn(`⚠️  warnings (${warnings.length}):`);
    warnings.forEach(w => warn(`   ${w}`));
  }

  if (isDryRun) {
    console.log('');
    info('DRY RUN 종료 — 실제 INSERT 없음');
  } else {
    console.log('');
    success(`마이그레이션 완료: ${insertedCount}개 SLA 생성`);
  }
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
