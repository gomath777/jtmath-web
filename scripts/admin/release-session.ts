#!/usr/bin/env npx ts-node
/**
 * SLA(student_lesson_assignments) 일괄 릴리즈 + 학생별 카톡 메시지 생성
 *
 * 대상 지정 (택 1):
 *   --date 2026-05-12              그날 scheduled 된 pending SLA 전부
 *   --until 2026-05-12             scheduled_date <= 날짜 pending SLA 전부
 *   --student 김지후 --date 2026-05-12  특정 학생만
 *
 * 옵션:
 *   --subject gs1                 과목 필터
 *   --include-direct-links        카톡 본문에 /lesson/{slug} 직접 링크 포함
 *   --dry-run                     실제 release 안 함, 메시지만 미리보기
 *   --copy                        첫 학생 메시지를 클립보드(macOS pbcopy)에 복사
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  parseArgs, getServiceClient, error, success, info, warn,
  dryRunBanner, printHelp,
} from './_shared';

const SITE_URL = 'https://jtmath.kr';
const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

type SlaRow = {
  id: string;
  profile_id: string;
  scheduled_date: string;
  status: 'pending' | 'released' | 'completed';
  variant: string;
  profile: { id: string; name: string };
  curriculum_item: {
    id: string;
    week_number: number | null;
    session_number: number | null;
    label: string | null;
    title: string | null;
    public_slug: string | null;
    curriculum: { subject_slug: string; title: string } | null;
  };
};

async function main() {
  const args = parseArgs();

  if (args.flags.has('help')) {
    printHelp(
      'release-session',
      'release-session.ts --date YYYY-MM-DD [--subject gs1] [--student 김지후] [--include-direct-links] [--dry-run] [--copy]',
      [
        'release-session.ts --date 2026-05-12',
        'release-session.ts --date 2026-05-12 --subject gs1 --copy',
        'release-session.ts --until 2026-05-12 --dry-run',
        'release-session.ts --student 김지후 --date 2026-05-12',
      ],
    );
    process.exit(0);
  }

  const isDryRun = args.flags.has('dry-run');
  const shouldCopy = args.flags.has('copy');
  const includeDirectLinks = args.flags.has('include-direct-links');
  const studentName = args.options.student;
  const subjectSlug = args.options.subject;
  const onDate = args.options.date;
  const untilDate = args.options.until;

  if (!onDate && !untilDate) error('--date 또는 --until 필요');

  dryRunBanner(isDryRun);

  const sc = getServiceClient();

  // 학생 토큰 (학생 페이지 링크에 사용)
  const { data: tokensRows } = await sc
    .from('student_tokens')
    .select('profile_id, slug, is_active');
  const tokens = new Map<string, string>();
  (tokensRows || []).forEach((t: { profile_id: string; slug: string; is_active: boolean }) => {
    if (t.is_active) tokens.set(t.profile_id, t.slug);
  });

  let q = sc
    .from('student_lesson_assignments')
    .select(`
      id, profile_id, scheduled_date, status, variant,
      profile:profiles!inner ( id, name ),
      curriculum_item:curriculum_items!inner (
        id, week_number, session_number, label, title, public_slug,
        curriculum:curricula ( subject_slug, title )
      )
    `)
    .eq('status', 'pending');

  if (onDate) q = q.eq('scheduled_date', onDate);
  else if (untilDate) q = q.lte('scheduled_date', untilDate);

  const { data: rowsRaw, error: qErr } = await q;
  if (qErr) error(`SLA 조회 실패: ${qErr.message}`);

  let rows = ((rowsRaw as unknown as SlaRow[]) || []);

  // subject / 학생 필터
  if (subjectSlug) {
    rows = rows.filter(r => r.curriculum_item?.curriculum?.subject_slug === subjectSlug);
  }
  if (studentName) {
    rows = rows.filter(r => r.profile?.name === studentName);
  }

  if (rows.length === 0) {
    warn('대상 SLA가 없습니다');
    process.exit(0);
  }

  info(`대상 ${rows.length}건 (학생 ${new Set(rows.map(r => r.profile_id)).size}명)`);

  // ─── DB UPDATE ────────────────────────────────────────────────────────────
  if (!isDryRun) {
    const ids = rows.map(r => r.id);
    const { error: updErr } = await sc
      .from('student_lesson_assignments')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .in('id', ids);
    if (updErr) error(`release 실패: ${updErr.message}`);
    success(`${rows.length}건 release 완료`);
  } else {
    info('(DRY RUN: DB 업데이트 생략)');
  }

  // ─── 학생별 메시지 그룹핑 ──────────────────────────────────────────────
  const byStudent = new Map<string, { name: string; slug: string | null; items: SlaRow[] }>();
  rows.forEach(r => {
    const key = r.profile_id;
    if (!byStudent.has(key)) {
      byStudent.set(key, { name: r.profile.name, slug: tokens.get(r.profile_id) || null, items: [] });
    }
    byStudent.get(key)!.items.push(r);
  });

  const lines: string[] = [];
  const today = new Date();
  const dateStr = onDate || untilDate || today.toISOString().slice(0, 10);

  byStudent.forEach((g, profileId) => {
    lines.push(`[${g.name}]`);
    lines.push(`안녕 ${g.name} 학생, ${dateStr.slice(5)} 자료가 공개됐어요.`);
    // subject 별 그룹
    const bySubj = new Map<string, SlaRow[]>();
    g.items.forEach(it => {
      const subj = it.curriculum_item?.curriculum?.subject_slug || '?';
      if (!bySubj.has(subj)) bySubj.set(subj, []);
      bySubj.get(subj)!.push(it);
    });
    bySubj.forEach((items, subj) => {
      lines.push(`  ${SUBJECT_LABEL[subj] || subj}:`);
      items.forEach(it => {
        const ci = it.curriculum_item;
        const label = ci?.title || ci?.label ||
          (ci?.week_number && ci?.session_number ? `${ci.week_number}주 ${ci.session_number}차시` : '학습 페이지');
        lines.push(`    • ${label}`);
        if (includeDirectLinks && ci?.public_slug) {
          lines.push(`      ${SITE_URL}/lesson/${ci.public_slug}`);
        }
      });
    });
    if (g.slug) {
      lines.push(``);
      lines.push(`학생 페이지: ${SITE_URL}/s/${g.slug}`);
    } else {
      lines.push(``);
      lines.push(`(학생 토큰 없음 — 포탈 링크 별도 발급 필요)`);
    }
    lines.push('');
    lines.push('────────────────');
    lines.push('');
  });

  const outPath = path.resolve(process.env.HOME || '.', 'Desktop', `카톡메시지_${dateStr}.txt`);
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  success(`카톡 메시지: ${outPath}`);

  if (shouldCopy) {
    try {
      const first = lines.slice(0, lines.indexOf('────────────────')).join('\n');
      execSync(`echo ${JSON.stringify(first)} | pbcopy`);
      success('첫 학생 메시지를 클립보드에 복사했습니다');
    } catch (e) {
      warn(`클립보드 복사 실패: ${(e as Error).message}`);
    }
  }
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
