#!/usr/bin/env npx ts-node
/**
 * 단일 학습 페이지를 학생들에게 특정 날짜에 일괄 배정
 *
 * 사용법:
 *   npm run admin:assign-lesson -- --slug <public_slug> --students "김지후,송승원" --date 2026-05-13 [--variant default] [--release]
 *
 * 예시:
 *   npm run admin:assign-lesson -- --slug gs1-w1-s1-poly-rem --students "김지후,송승원,박지민" --date 2026-05-13
 *   npm run admin:assign-lesson -- --slug ds2-w3-s1-trig-app --students 김지후 --date 2026-05-13 --release
 */

import {
  parseArgs, getServiceClient, error, success, info, warn, required, printHelp,
} from './_shared';

async function main() {
  const args = parseArgs();
  if (args.flags.has('help')) {
    printHelp(
      'assign-lesson',
      'assign-lesson.ts --slug <public_slug> --students "이름1,이름2" --date YYYY-MM-DD [--variant default] [--release]',
      [
        'assign-lesson.ts --slug gs1-w1-s1-poly-rem --students "김지후,송승원" --date 2026-05-13',
        'assign-lesson.ts --slug ds2-w3-s1-trig-app --students 김지후 --date 2026-05-13 --release',
      ],
    );
    process.exit(0);
  }

  const slug = required(args, 'slug');
  const studentsArg = required(args, 'students');
  const date = required(args, 'date');
  const variant = args.options.variant || 'default';
  const shouldRelease = args.flags.has('release');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) error('--date 형식: YYYY-MM-DD');

  const sc = getServiceClient();

  const { data: lesson } = await sc
    .from('curriculum_items')
    .select('id, label, title, public_slug')
    .eq('public_slug', slug)
    .maybeSingle();
  if (!lesson) error(`학습 페이지 없음: ${slug}`);

  const names = studentsArg.split(',').map(s => s.trim()).filter(Boolean);
  const { data: profiles } = await sc
    .from('profiles')
    .select('id, name')
    .in('name', names);
  const found = (profiles as Array<{ id: string; name: string }>) || [];

  const foundNames = new Set(found.map(p => p.name));
  const missing = names.filter(n => !foundNames.has(n));
  if (missing.length > 0) warn(`학생 못 찾음: ${missing.join(', ')}`);
  if (found.length === 0) error('배정할 학생이 없습니다');

  const rows = found.map(p => ({
    profile_id: p.id,
    curriculum_item_id: lesson!.id,
    scheduled_date: date,
    status: shouldRelease ? 'released' : 'pending',
    released_at: shouldRelease ? new Date().toISOString() : null,
    variant,
  }));

  const { data, error: insErr } = await sc
    .from('student_lesson_assignments')
    .upsert(rows, { onConflict: 'profile_id,curriculum_item_id,scheduled_date', ignoreDuplicates: false })
    .select('id');
  if (insErr) error(`배정 실패: ${insErr.message}`);

  success(`${data?.length || 0}건 배정 완료 (${lesson!.title || lesson!.label || slug} → ${date})`);
  info(`상태: ${shouldRelease ? 'released' : 'pending'}, variant: ${variant}`);
  info(`학생: ${found.map(f => f.name).join(', ')}`);
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
