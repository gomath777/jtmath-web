#!/usr/bin/env npx ts-node
/**
 * 학생별 세션 릴리즈 + 카톡 메시지 생성
 *
 * 대상 지정 방법 (택 1):
 *   --subject ds2 --week 1 --session 1           전 과목·주차·차시 조건에 맞는 학생 전부
 *   --student 김지후 --subject ds2 --week 1 --session 1  특정 학생 1명
 *   --until 2026-05-04                           publish_date <= 날짜인 미릴리즈 세션 전부
 *
 * 예시:
 *   npm run admin:release -- --subject ds2 --week 1 --session 1 --dry-run
 *   npm run admin:release -- --subject ds2 --week 1 --session 1 --copy
 *   npm run admin:release -- --student 김지후 --subject ds2 --week 1 --session 1
 *   npm run admin:release -- --until 2026-05-04
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
        'release-session.ts --until 2026-05-04',
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

  if (!subjectSlug && !untilDate) {
    error('--subject 또는 --until 중 하나 필요');
  }

  dryRunBanner(isDryRun);

  const sc = getServiceClient();

  // ─── 릴리즈 대상 student_sessions 조회 ───────────────────────────────────
  let query = sc
    .from('student_sessions')
    .select('id, profile_id, subject_slug, week_number, session_number, label, publish_date, lecture:lectures(title)')
    .eq('is_released', false);

  if (subjectSlug) query = query.eq('subject_slug', subjectSlug);
  if (week !== undefined) query = query.eq('week_number', week);
  if (session !== undefined) query = query.eq('session_number', session);
  if (untilDate) query = query.lte('publish_date', untilDate);

  // 특정 학생만
  if (studentName) {
    const { data: profile } = await sc
      .from('profiles')
      .select('id, name')
      .ilike('name', studentName)
      .single();
    if (!profile) error(`학생을 찾을 수 없습니다: ${studentName}`);
    query = query.eq('profile_id', profile!.id);
  }

  const { data: sessions, error: sessErr } = await query
    .order('subject_slug')
    .order('week_number')
    .order('session_number');

  if (sessErr) error(`세션 조회 실패: ${sessErr.message}`);
  if (!sessions || sessions.length === 0) error('조건에 맞는 세션이 없습니다 (이미 릴리즈됐거나 존재하지 않음)');

  // 학생 이름 조회
  const profileIds = [...new Set(sessions!.map(s => s.profile_id))];
  const { data: profiles } = await sc
    .from('profiles')
    .select('id, name')
    .in('id', profileIds);
  const profileById = new Map((profiles || []).map(p => [p.id, p.name]));

  // 학생 토큰(슬러그) 조회
  const { data: tokens } = await sc
    .from('student_tokens')
    .select('profile_id, slug')
    .in('profile_id', profileIds)
    .eq('is_active', true);
  const slugByProfile = new Map((tokens || []).map(t => [t.profile_id, t.slug]));

  // 목록 출력
  info(`릴리즈 대상: ${sessions!.length}개 student_sessions`);
  sessions!.forEach(s => {
    const name = profileById.get(s.profile_id) || '?';
    const lecture = s.lecture as unknown as { title: string } | null;
    const label = s.label ?? lecture?.title ?? '(제목 없음)';
    const subjLabel = SUBJECT_LABEL[s.subject_slug] || s.subject_slug;
    console.log(`   - ${name} [${subjLabel}] W${s.week_number}-S${s.session_number}: ${label} (${s.publish_date})`);
  });
  console.log('');

  if (!isDryRun) {
    const ids = sessions!.map(s => s.id);
    const { error: updErr } = await sc
      .from('student_sessions')
      .update({ is_released: true })
      .in('id', ids);
    if (updErr) error(`릴리즈 업데이트 실패: ${updErr.message}`);
    success(`${ids.length}개 세션 릴리즈 완료`);
  }

  // ─── 카톡 메시지 생성 ─────────────────────────────────────────────────────
  // 학생별로 이번에 릴리즈된 세션들을 묶어서 1통 메시지
  const byStudent = new Map<string, typeof sessions[number][]>();
  for (const s of sessions!) {
    if (!byStudent.has(s.profile_id)) byStudent.set(s.profile_id, []);
    byStudent.get(s.profile_id)!.push(s);
  }

  log('💬', '카톡 메시지 생성...\n');
  const messages: Array<{ name: string; slug: string; message: string }> = [];

  for (const [profileId, studentSessions] of byStudent) {
    const name = profileById.get(profileId) || '?';
    const slug = slugByProfile.get(profileId);
    if (!slug) {
      warn(`${name}: 활성 토큰 없음 — 메시지 생략`);
      continue;
    }

    // 과목별 그룹 (같은 과목끼리 묶어서 표시)
    const bySubject = new Map<string, string[]>();
    for (const s of studentSessions) {
      const subjLabel = SUBJECT_LABEL[s.subject_slug] || s.subject_slug;
      if (!bySubject.has(subjLabel)) bySubject.set(subjLabel, []);
      const lecture = s.lecture as unknown as { title: string } | null;
      const label = s.label ?? lecture?.title ?? `${s.week_number}주차 ${s.session_number}차시`;
      bySubject.get(subjLabel)!.push(`${s.week_number}주차 ${s.session_number}차시 - ${label}`);
    }

    const sessionLines: string[] = [];
    for (const [subj, lines] of bySubject) {
      sessionLines.push(`[${subj}]`);
      lines.forEach(l => sessionLines.push(`• ${l}`));
    }

    const message = [
      `[고T수학] 학습 업데이트`,
      '',
      ...sessionLines,
      '',
      `학습 페이지: ${SITE_URL}/s/${slug}`,
      '',
      '문제 풀고 매쓰플랫에서 답안 제출 후 카톡 주세요~',
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
