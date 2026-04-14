#!/usr/bin/env npx ts-node
/**
 * 세션 릴리즈 + 학생별 카톡 메시지 자동 생성
 *
 * 사용법:
 *   npx ts-node scripts/admin/release-session.ts --curriculum <id> --week 1 --session 1
 *   npx ts-node scripts/admin/release-session.ts --curriculum <id> --up-to-session 2  # 1,2차시 전부
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  parseArgs, getServiceClient, log, error, success, info, warn,
  dryRunBanner, required, printHelp,
} from './_shared';

const SITE_URL = 'https://jtmath.kr';

async function main() {
  const args = parseArgs();

  if (args.flags.has('help')) {
    printHelp(
      'release-session',
      'release-session.ts --curriculum <id> --week N --session N [--dry-run] [--copy]',
      [
        'release-session.ts --curriculum abc123 --week 1 --session 1',
        'release-session.ts --curriculum abc123 --week 1 --session 1 --copy  # 첫 학생 메시지 클립보드 복사',
        'release-session.ts --curriculum abc123 --up-to-session 2  # 1차시와 2차시 모두',
      ],
    );
    process.exit(0);
  }

  const curriculumId = required(args, 'curriculum');
  const week = args.options.week ? parseInt(args.options.week) : undefined;
  const session = args.options.session ? parseInt(args.options.session) : undefined;
  const upToSession = args.options['up-to-session'] ? parseInt(args.options['up-to-session']) : undefined;
  const isDryRun = args.flags.has('dry-run');
  const shouldCopy = args.flags.has('copy');

  if (!session && !upToSession) {
    error('--session 또는 --up-to-session 중 하나 필요');
  }

  dryRunBanner(isDryRun);

  const sc = getServiceClient();

  // Find items to release
  let query = sc
    .from('curriculum_items')
    .select('id, week_number, session_number, label')
    .eq('curriculum_id', curriculumId);

  if (week !== undefined) query = query.eq('week_number', week);
  if (session !== undefined) query = query.eq('session_number', session);
  if (upToSession !== undefined) query = query.lte('session_number', upToSession);

  const { data: items, error: itemsErr } = await query.order('week_number').order('session_number');
  if (itemsErr) error(`세션 조회 실패: ${itemsErr.message}`);
  if (!items || items.length === 0) error('조건에 맞는 세션이 없습니다');

  // Fetch curriculum info
  const { data: curriculum } = await sc
    .from('curricula')
    .select('title, subject_slug')
    .eq('id', curriculumId)
    .single();

  if (!curriculum) error('커리큘럼을 찾을 수 없습니다');

  info(`커리큘럼: ${curriculum.title}`);
  info(`릴리즈할 세션: ${items.length}개`);
  items.forEach(i => console.log(`   - ${i.week_number}주차 ${i.session_number}차시: ${i.label || '(라벨 없음)'}`));
  console.log('');

  if (!isDryRun) {
    const { error: updErr } = await sc
      .from('curriculum_items')
      .update({ is_released: true })
      .in('id', items.map(i => i.id));
    if (updErr) error(`릴리즈 업데이트 실패: ${updErr.message}`);
    success(`${items.length}개 세션 릴리즈 완료`);
  }

  // Find assigned students
  const { data: links } = await sc
    .from('student_curriculum_links')
    .select('profile_id')
    .eq('curriculum_id', curriculumId);

  const profileIds = (links || []).map(l => l.profile_id);
  if (profileIds.length === 0) {
    warn('배정된 학생이 없습니다 — 카톡 메시지 생략');
    return;
  }

  // Get student tokens and names
  const { data: tokens } = await sc
    .from('student_tokens')
    .select('profile_id, slug, profiles!inner(name)')
    .in('profile_id', profileIds)
    .eq('is_active', true);

  if (!tokens || tokens.length === 0) {
    warn('활성화된 토큰이 없습니다');
    return;
  }

  // Generate messages
  console.log('');
  log('💬', '카톡 메시지 생성...');
  console.log('');

  const sessionSummary = items.map(i => `${i.week_number}주차 ${i.session_number}차시`).join(', ');
  const firstLabel = items[0].label || sessionSummary;

  const messages: Array<{ name: string; slug: string; message: string }> = [];
  for (const token of tokens) {
    const profile = token.profiles as unknown as { name: string };
    const name = profile?.name || '(이름없음)';

    const message = [
      `[고T수학] ${curriculum.title} ${sessionSummary}`,
      '',
      `${firstLabel} 학습이 올라왔습니다!`,
      '',
      `학습 페이지: ${SITE_URL}/s/${token.slug}`,
      '',
      '문제 풀고 매쓰플랫에서 답안 제출 후 카톡 주세요~',
    ].join('\n');

    messages.push({ name, slug: token.slug, message });
  }

  // Print all messages
  messages.forEach(m => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📨 ${m.name} (${m.slug})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(m.message);
  });
  console.log('');

  // Save to file
  const dateStr = new Date().toISOString().split('T')[0];
  const outPath = path.join(process.env.HOME || '', 'Desktop', `카톡메시지_${dateStr}.txt`);
  const fileContent = messages.map(m =>
    `===== ${m.name} (${m.slug}) =====\n${m.message}\n\n`,
  ).join('');
  fs.writeFileSync(outPath, fileContent);
  success(`전체 메시지 저장: ${outPath}`);

  // Copy first message if requested
  if (shouldCopy && messages.length > 0) {
    try {
      execSync('pbcopy', { input: messages[0].message });
      success(`${messages[0].name} 메시지를 클립보드에 복사했습니다`);
    } catch {
      warn('pbcopy 실행 실패 (macOS 전용)');
    }
  }

  console.log('');
  info(`총 ${messages.length}명의 학생에게 보낼 메시지 생성됨`);
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
