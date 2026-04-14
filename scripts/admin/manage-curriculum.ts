#!/usr/bin/env npx ts-node
/**
 * 커리큘럼 관리 CLI
 *
 * 사용법:
 *   manage-curriculum.ts create --title "공수1 기말 전반전" --subject gs1 --start 2026-05-05
 *   manage-curriculum.ts list
 *   manage-curriculum.ts items <curriculum-id>
 */

import {
  parseArgs, getServiceClient, error, success, info, warn,
  required, printTable,
} from './_shared';

async function cmdCreate() {
  const args = parseArgs(process.argv.slice(3));
  const title = required(args, 'title');
  const subject = required(args, 'subject');
  const start = required(args, 'start');
  const pattern = args.options.pattern || 'sun_wed';

  const sc = getServiceClient();
  const { data, error: err } = await sc
    .from('curricula')
    .insert({
      title,
      subject_slug: subject,
      schedule_pattern: pattern,
      start_date: start,
    })
    .select('id, title')
    .single();

  if (err) error(`생성 실패: ${err.message}`);

  success(`커리큘럼 생성: ${data!.title}`);
  info(`ID: ${data!.id}`);
  info(`복사해서 사용: --curriculum ${data!.id}`);
}

async function cmdList() {
  const sc = getServiceClient();
  const { data } = await sc
    .from('curricula')
    .select('id, title, subject_slug, start_date, schedule_pattern')
    .order('start_date', { ascending: false });

  if (!data || data.length === 0) {
    warn('커리큘럼이 없습니다');
    return;
  }

  const rows = data.map(c => ({
    ID: c.id.slice(0, 8),
    제목: c.title,
    과목: c.subject_slug,
    시작: c.start_date,
    패턴: c.schedule_pattern,
  }));
  printTable(rows);
}

async function cmdItems() {
  const curriculumId = process.argv[3];
  if (!curriculumId) error('curriculum-id를 입력하세요');

  const sc = getServiceClient();
  const { data } = await sc
    .from('curriculum_items')
    .select('week_number, session_number, label, is_released, publish_date')
    .eq('curriculum_id', curriculumId)
    .order('week_number')
    .order('session_number');

  if (!data || data.length === 0) {
    warn('아이템이 없습니다');
    return;
  }

  const rows = data.map(i => ({
    주차: `${i.week_number}-${i.session_number}`,
    라벨: i.label || '(없음)',
    발행일: i.publish_date,
    릴리즈: i.is_released ? '✅' : '⏳',
  }));
  printTable(rows);
}

async function main() {
  const cmd = process.argv[2];

  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log('사용법:');
    console.log('  manage-curriculum.ts create --title X --subject gs1 --start 2026-05-05 [--pattern sun_wed]');
    console.log('  manage-curriculum.ts list');
    console.log('  manage-curriculum.ts items <curriculum-id>');
    process.exit(0);
  }

  switch (cmd) {
    case 'create': await cmdCreate(); break;
    case 'list': await cmdList(); break;
    case 'items': await cmdItems(); break;
    default: error(`알 수 없는 명령: ${cmd}`);
  }
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
