#!/usr/bin/env npx ts-node
/**
 * 학생별 세션 릴리즈 + 카톡 메시지 생성 (신 블럭 모델)
 *
 * 대상 지정 방법 (택 1):
 *   --subject ds2 --week 1 --session 1           전 과목·주차·차시 조건에 맞는 학생 전부
 *   --student 김지후 --subject ds2 --week 1 --session 1  특정 학생 1명
 *   --until 2026-05-07                           scheduled_date <= 날짜인 미릴리즈 배정 전부
 *   --date 2026-05-07                            scheduled_date = 날짜인 미릴리즈 배정
 *
 * 예시:
 *   npm run admin:release -- --subject ds2 --week 1 --session 1 --dry-run
 *   npm run admin:release -- --subject ds2 --week 1 --session 1 --copy
 *   npm run admin:release -- --student 김지후 --subject ds2 --week 1 --session 1
 *   npm run admin:release -- --until 2026-05-07
 *   npm run admin:release -- --date 2026-05-07
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  parseArgs, getServiceClient, log, error, success, info, warn,
  dryRunBanner, printHelp,
} from './_shared';

const SITE_URL = 'https://jtmath.kr';

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

type BlockAssignment = {
  id: string;
  profile_id: string;
  scheduled_date: string | null;
  slot_label: string | null;
  is_released: boolean;
  content_block: {
    id: string;
    subject_slug: string;
    title: string;
    category: string;
    unit_number: number | null;
  } | null;
};

async function main() {
  const args = parseArgs();

  if (args.flags.has('help')) {
    printHelp(
      'release-session',
      'release-session.ts --subject <slug> --week N --session N [--student 이름] [--dry-run] [--copy]',
      [
        'release-session.ts --subject ds2 --week 1 --session 1',
        'release-session.ts --subject gs1 --week 1 --session 1 --copy',
        'release-session.ts --student 김지후 --subject ds2 --week 1 --session 1',
        'release-session.ts --until 2026-05-07',
        'release-session.ts --date 2026-05-07',
      ],
    );
    process.exit(0);
  }

  const isDryRun = args.flags.has('dry-run');
  const shouldCopy = args.flags.has('copy');
  const studentName = args.options.student;
  const subjectSlug = args.options.subject;
  const week = args.options.week ? parseInt(args.options.week) : undefined;
  const session = args.options.session ? parseInt(args.options.session) : undefined;
  const untilDate = args.options.until;
  const onDate = args.options.date;

  if (!subjectSlug && !untilDate && !onDate) {
    error('--subject, --until, --date 중 하나 필요');
  }

  dryRunBanner(isDryRun);

  const sc = getServiceClient();

  // ─── 릴리즈 대상 block_assignments 조회 ─────────────────────────────────
  let query = (sc as any)
    .from('block_assignments')
    .select(`
      id, profile_id, scheduled_date, slot_label, is_released,
      content_block:content_blocks(id, subject_slug, title, category, unit_number)
    `)
    .eq('is_released', false);

  if (subjectSlug) {
    // subject_slug는 content_blocks에 있으므로 조인 조건 필터는 다음처럼 처리
    // Supabase PostgREST는 직접 FK 필터 지원 — content_blocks.subject_slug=subjectSlug
    query = query.eq('content_blocks.subject_slug', subjectSlug);
  }
  if (onDate) query = query.eq('scheduled_date', onDate);
  else if (untilDate) query = query.lte('scheduled_date', untilDate);

  // 특정 학생만
  if (studentName) {
    const { data: profile } = await sc
      .from('profiles')
      .select('id, name')
      .ilike('name', `%${studentName}%`)
      .single();
    if (!profile) error(`학생을 찾을 수 없습니다: ${studentName}`);
    query = query.eq('profile_id', profile!.id);
  }

  const { data: rawBAs, error: baErr } = await query
    .order('scheduled_date')
    .order('slot_label');

  if (baErr) error(`배정 조회 실패: ${baErr.message}`);

  // subject_slug 필터는 PostgREST foreign table filter로 동작하지만,
  // null content_block이 포함될 수 있으므로 JS에서 추가 필터
  let assignments = (rawBAs || []) as BlockAssignment[];
  if (subjectSlug) {
    assignments = assignments.filter(ba => ba.content_block?.subject_slug === subjectSlug);
  }
  // slot_label 기반 week/session 필터
  if (week !== undefined || session !== undefined) {
    assignments = assignments.filter(ba => {
      if (!ba.slot_label) return false;
      const m = ba.slot_label.match(/^(\d+)주\s*(\d+)차시/);
      if (!m) return false;
      const w = parseInt(m[1]);
      const s = parseInt(m[2]);
      if (week !== undefined && w !== week) return false;
      if (session !== undefined && s !== session) return false;
      return true;
    });
  }
  // session 카테고리만 릴리즈 (concept은 별도)
  assignments = assignments.filter(ba => ba.content_block?.category !== 'concept');

  if (assignments.length === 0) error('조건에 맞는 미릴리즈 배정이 없습니다');

  // 학생 이름 조회
  const profileIds = [...new Set(assignments.map(ba => ba.profile_id))];
  const { data: profiles } = await sc
    .from('profiles')
    .select('id, name')
    .in('id', profileIds);
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p.name]));

  // 학생 토큰(슬러그) + 타입 조회
  const { data: tokens } = await sc
    .from('student_tokens')
    .select('profile_id, slug, student_type')
    .in('profile_id', profileIds)
    .eq('is_active', true);
  const tokenByProfile = new Map((tokens || []).map((t: any) => [t.profile_id, t]));

  // 목록 출력
  info(`릴리즈 대상: ${assignments.length}개 block_assignments`);
  assignments.forEach(ba => {
    const name = profileById.get(ba.profile_id) || '?';
    const cb = ba.content_block;
    const subjLabel = SUBJECT_LABEL[cb?.subject_slug || ''] || cb?.subject_slug || '?';
    const label = ba.slot_label ?? cb?.title ?? '(제목 없음)';
    console.log(`   - ${name} [${subjLabel}] ${label} (${ba.scheduled_date})`);
  });
  console.log('');

  if (!isDryRun) {
    const ids = assignments.map(ba => ba.id);
    const { error: updErr } = await sc
      .from('block_assignments')
      .update({ is_released: true })
      .in('id', ids);
    if (updErr) error(`릴리즈 업데이트 실패: ${updErr.message}`);
    success(`${ids.length}개 배정 릴리즈 완료`);
  }

  // ─── 카톡 메시지 생성 ─────────────────────────────────────────────────────
  const byStudent = new Map<string, BlockAssignment[]>();
  for (const ba of assignments) {
    if (!byStudent.has(ba.profile_id)) byStudent.set(ba.profile_id, []);
    byStudent.get(ba.profile_id)!.push(ba);
  }

  log('💬', '카톡 메시지 생성...\n');
  const messages: Array<{ name: string; slug: string; message: string }> = [];

  for (const [profileId, studentBAs] of byStudent) {
    const name = profileById.get(profileId) || '?';
    const token = tokenByProfile.get(profileId);
    if (!token) {
      warn(`${name}: 활성 토큰 없음 — 메시지 생략`);
      continue;
    }
    const slug = token.slug;
    const isOffline = (token.student_type || 'online') === 'offline';
    const prefix = isOffline ? '/c' : '/s';

    // 과목별 그룹
    const bySubject = new Map<string, string[]>();
    for (const ba of studentBAs) {
      const cb = ba.content_block;
      const subjLabel = SUBJECT_LABEL[cb?.subject_slug || ''] || cb?.subject_slug || '?';
      if (!bySubject.has(subjLabel)) bySubject.set(subjLabel, []);
      const label = ba.slot_label ?? cb?.title ?? '(제목 없음)';
      bySubject.get(subjLabel)!.push(label);
    }

    const sessionLines: string[] = [];
    for (const [subj, lines] of bySubject) {
      sessionLines.push(`[${subj}]`);
      lines.forEach(l => sessionLines.push(`• ${l}`));
    }

    // 발송 날짜 기준 요일 쌍 계산
    const firstDate = studentBAs[0].scheduled_date;
    let weekdayPair = '';
    if (firstDate) {
      const dow = new Date(firstDate + 'T00:00:00Z').getUTCDay();
      weekdayPair = dow === 0 ? '월화' : dow === 3 ? '목금' : '';
    }
    const dateLabel = weekdayPair ? `${firstDate} (${weekdayPair})` : firstDate || '';

    const message = [
      `[고T수학] 학습 업데이트`,
      '',
      ...sessionLines,
      '',
      `학습 페이지: ${SITE_URL}${prefix}/${slug}`,
      ...(weekdayPair ? [`${weekdayPair} 진도 업데이트되었습니다.`] : []),
      '',
      '문제 풀고 앱에 답안 제출 후 카톡 주세요~',
    ].join('\n');

    messages.push({ name, slug, message });
  }

  messages.forEach(m => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📨 ${m.name} (${m.slug})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(m.message);
    console.log('');
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const outPath = path.join(process.env.HOME || '', 'Downloads', `카톡메시지_${dateStr}.txt`);
  const fileContent = messages.map(m =>
    `===== ${m.name} (${m.slug}) =====\n${m.message}\n\n`,
  ).join('');
  fs.writeFileSync(outPath, fileContent);
  success(`전체 메시지 저장: ${outPath}`);

  if (shouldCopy && messages.length > 0) {
    try {
      execSync('pbcopy', { input: messages[0].message });
      success(`${messages[0].name} 메시지를 클립보드에 복사했습니다`);
    } catch {
      warn('pbcopy 실행 실패 (macOS 전용)');
    }
  }

  info(`총 ${messages.length}명의 메시지 생성됨`);
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
