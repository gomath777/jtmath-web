#!/usr/bin/env npx tsx
/**
 * 단원(curriculum_item) 릴리즈 + 학생별 카톡 메시지 생성
 *
 * 신 학습 시스템(student_lesson_assignments) 전용.
 * 기존 block_assignments 기반 release-session.ts 와 별개로 운영.
 *
 * 사용법:
 *   npm run admin:release-lesson -- --slug gs1-gichul-01-abc123 --schedule 2026-05-13
 *   npm run admin:release-lesson -- --unit "다항식과 나머지정리" --subject gs1 --schedule 2026-05-13
 *   npm run admin:release-lesson -- --slug gs1-gichul-01-abc123 --schedule 2026-05-13 --copy
 *   npm run admin:release-lesson -- --slug gs1-gichul-01-abc123 --schedule 2026-05-13 --dry-run
 *
 * 동작:
 *   1. curriculum_item 조회 (slug 또는 unit 이름)
 *   2. 배정된 SLA scheduled_date 일괄 업데이트 + status=released
 *   3. 학생별 카톡 메시지 생성 → ~/Desktop/카톡_YYYY-MM-DD.txt
 *   4. --copy: 첫 학생 메시지 클립보드 복사 (pbcopy)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  parseArgs, getServiceClient, log, error, success, info, warn,
  dryRunBanner, printHelp,
} from './_shared.js';

const SITE_URL = 'https://jtmath.kr';

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds2: '대수', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하',
};

const CATEGORY_LABEL: Record<string, string> = {
  concept: '개념강의',
  gichul: '교육청 기출',
  shimhwa: '심화유형',
  review: '점검',
};

async function main() {
  const args = parseArgs();

  if (args.flags.has('help')) {
    printHelp(
      'release-lesson',
      'release-lesson.ts --slug <public_slug> --schedule YYYY-MM-DD [--copy] [--dry-run]',
      [
        'release-lesson.ts --slug gs1-gichul-01-abc123 --schedule 2026-05-13',
        'release-lesson.ts --unit "다항식과 나머지정리" --subject gs1 --schedule 2026-05-13 --copy',
        'release-lesson.ts --slug gs1-concept-05-a9de9d --schedule 2026-05-13 --dry-run',
      ],
    );
    process.exit(0);
  }

  const slug = args.options.slug;
  const unitName = args.options.unit;
  const subjectSlug = args.options.subject;
  const scheduleDate = args.options.schedule;
  const isDryRun = args.flags.has('dry-run');
  const shouldCopy = args.flags.has('copy');

  if (!slug && !unitName) error('--slug 또는 --unit 중 하나 필요');
  if (!scheduleDate) error('--schedule YYYY-MM-DD 필요');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)) error('--schedule 형식 오류 (YYYY-MM-DD)');

  dryRunBanner(isDryRun);

  const sc = getServiceClient();

  // ─── 1. curriculum_item 조회 ────────────────────────────────────────────────
  let itemQuery = sc
    .from('curriculum_items')
    .select('id, public_slug, title, unit_name, category, subject_slug:curricula!inner(subject_slug)')
    .is('archived_at', null);

  if (slug) {
    itemQuery = itemQuery.eq('public_slug', slug);
  } else {
    itemQuery = itemQuery.ilike('unit_name', `%${unitName}%`);
    if (subjectSlug) {
      // curricula 조인을 통한 subject_slug 필터
      itemQuery = (itemQuery as any).eq('curricula.subject_slug', subjectSlug);
    }
  }

  const { data: items, error: itemErr } = await itemQuery;
  if (itemErr) error(`curriculum_item 조회 실패: ${itemErr.message}`);
  if (!items || items.length === 0) {
    error(slug
      ? `학습 페이지 없음: ${slug}`
      : `단원 없음: "${unitName}"${subjectSlug ? ` (${subjectSlug})` : ''}`);
  }
  if (items.length > 1) {
    warn(`여러 단원 매칭됨 (${items.length}개). 첫 번째 사용:`);
    items.forEach((i: any) => info(`  - [${i.public_slug}] ${i.title}`));
  }

  const item = items[0] as any;
  const itemSubject = item.subject_slug?.subject_slug || subjectSlug || '';
  const subjLabel = SUBJECT_LABEL[itemSubject] || itemSubject;
  const catLabel = CATEGORY_LABEL[item.category] || item.category || '';

  info(`대상 단원: [${item.public_slug}] ${item.title}`);
  info(`과목: ${subjLabel} / 카테고리: ${catLabel}`);
  console.log('');

  // ─── 2. SLA 조회 ────────────────────────────────────────────────────────────
  const { data: slas, error: slaErr } = await sc
    .from('student_lesson_assignments')
    .select('id, profile_id, scheduled_date, status')
    .eq('curriculum_item_id', item.id);

  if (slaErr) error(`SLA 조회 실패: ${slaErr.message}`);
  if (!slas || slas.length === 0) {
    warn('배정된 학생이 없습니다. assign-lesson 먼저 실행하거나 시즌에 학생을 등록하세요.');
    process.exit(0);
  }

  info(`배정 학생 수: ${slas.length}명`);

  // ─── 3. 학생 정보 조회 ──────────────────────────────────────────────────────
  const profileIds = [...new Set(slas.map((s: any) => s.profile_id))];

  const { data: profiles } = await sc
    .from('profiles')
    .select('id, name')
    .in('id', profileIds);
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p.name as string]));

  const { data: tokens } = await sc
    .from('student_tokens')
    .select('profile_id, slug, is_active')
    .in('profile_id', profileIds)
    .eq('is_active', true);
  const tokenByProfile = new Map((tokens || []).map((t: any) => [t.profile_id, t.slug as string]));

  // 릴리즈 대상 목록 출력
  slas.forEach((s: any) => {
    const name = profileById.get(s.profile_id) || '?';
    const portalSlug = tokenByProfile.get(s.profile_id);
    info(`  ${name} (${portalSlug || '토큰없음'}) — 현재 scheduled_date: ${s.scheduled_date || '미설정'}`);
  });
  console.log('');

  // ─── 4. scheduled_date 업데이트 ─────────────────────────────────────────────
  const slaIds = slas.map((s: any) => s.id);
  if (!isDryRun) {
    const { error: updErr } = await sc
      .from('student_lesson_assignments')
      .update({
        scheduled_date: scheduleDate,
        status: 'released',
        released_at: new Date().toISOString(),
      })
      .in('id', slaIds);
    if (updErr) error(`SLA 업데이트 실패: ${updErr.message}`);
    success(`${slaIds.length}건 scheduled_date → ${scheduleDate}, status → released`);
  } else {
    info(`[DRY RUN] ${slaIds.length}건 scheduled_date → ${scheduleDate} (실제 변경 없음)`);
  }
  console.log('');

  // ─── 5. 카톡 메시지 생성 ────────────────────────────────────────────────────
  log('💬', '카톡 메시지 생성...\n');

  // 요일 계산 (scheduleDate 기준)
  const dow = new Date(scheduleDate + 'T00:00:00Z').getUTCDay();
  const weekdayPair = dow === 0 ? '월화' : dow === 3 ? '목금' : '';
  const dateLabel = weekdayPair ? `${scheduleDate} (${weekdayPair})` : scheduleDate;

  const messages: Array<{ name: string; portalSlug: string; message: string }> = [];

  for (const profileId of profileIds) {
    const name = profileById.get(profileId) || '?';
    const portalSlug = tokenByProfile.get(profileId);
    if (!portalSlug) {
      warn(`${name}: 활성 토큰 없음 — 메시지 생략`);
      continue;
    }

    const lessonLine = `[${subjLabel}] ${item.unit_name || item.title}${catLabel ? ` (${catLabel})` : ''}`;

    const message = [
      `[고T수학] 학습 업데이트`,
      '',
      lessonLine,
      '',
      `📅 ${dateLabel}`,
      `📖 학습 페이지: ${SITE_URL}/s/${portalSlug}`,
      '',
      '문제 풀고 앱에 답안 제출 후 카톡 주세요~',
    ].join('\n');

    messages.push({ name, portalSlug, message });
  }

  if (messages.length === 0) {
    warn('생성된 메시지가 없습니다 (활성 토큰 없는 학생만 있음)');
    process.exit(0);
  }

  // 콘솔 출력
  messages.forEach(m => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📨 ${m.name} (/s/${m.portalSlug})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(m.message);
    console.log('');
  });

  // ─── 6. 파일 저장 ───────────────────────────────────────────────────────────
  const dateStr = scheduleDate;
  const outPath = path.join(process.env.HOME || '', 'Desktop', `카톡_${dateStr}.txt`);
  const fileContent = messages.map(m =>
    `===== ${m.name} (/s/${m.portalSlug}) =====\n${m.message}\n\n`,
  ).join('');

  if (!isDryRun) {
    fs.writeFileSync(outPath, fileContent, 'utf8');
    success(`전체 메시지 저장: ${outPath}`);
  } else {
    info(`[DRY RUN] 저장 예정: ${outPath}`);
  }

  // ─── 7. 클립보드 복사 ───────────────────────────────────────────────────────
  if (shouldCopy && messages.length > 0) {
    try {
      execSync('pbcopy', { input: messages[0].message });
      success(`${messages[0].name} 메시지 클립보드 복사 완료`);
    } catch {
      warn('pbcopy 실행 실패 (macOS 전용)');
    }
  }

  info(`총 ${messages.length}명 메시지 생성됨`);
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
