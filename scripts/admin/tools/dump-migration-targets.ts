#!/usr/bin/env npx tsx
/**
 * 마이그레이션 spec 작성을 위한 데이터 덤프
 *
 * 출력:
 *   1. 캘린더 이미지에 보이는 12명 학생의 profile_id + name (활성 토큰 있는 학생 중)
 *   2. gs1·ds2·gs2 concept items 의 (session_number, public_slug) 매핑
 *   3. gs1 gichul·shimhwa items 의 (unit_name, variant, public_slug) 매핑
 *   4. 각 학생의 기존 SLA 건수 (정확히 0 이어야 함 - 마이그레이션 미수행 상태 확인)
 */

import { getServiceClient, info, log } from '../_shared.js';

const TARGET_STUDENTS = [
  '이한승', '김지후', '김채민', '조온유', '송은율', '이소율',
  '임유주', '조승연', '김태은', '손영한', '손예지', '송승원',
];

async function main() {
  const sc = getServiceClient();

  // 1. 학생 정보
  log('👥', '학생 profile 조회');
  const { data: profiles } = await sc
    .from('profiles')
    .select('id, name, school')
    .in('name', TARGET_STUDENTS);
  const profMap = new Map((profiles || []).map((p: { name: string; id: string; school: string | null }) =>
    [p.name, { id: p.id, school: p.school }]),
  );
  for (const name of TARGET_STUDENTS) {
    const p = profMap.get(name);
    if (p) info(`  ${name} (${p.school}) → ${p.id}`);
    else info(`  ❌ ${name}: profile 없음`);
  }
  console.log('');

  // 2. 신 시스템 lesson 매핑
  log('📚', '신 시스템 curriculum_items 조회');
  const { data: curricula } = await sc
    .from('curricula')
    .select('id, title, subject_slug')
    .in('subject_slug', ['gs1', 'ds2', 'gs2'])
    .is('archived_at', null);
  console.log('curricula:');
  curricula?.forEach((c: { id: string; title: string; subject_slug: string }) =>
    console.log(`  [${c.subject_slug}] "${c.title}" → ${c.id}`),
  );
  console.log('');

  const currIds = (curricula || []).map((c: { id: string }) => c.id);
  const { data: items } = await sc
    .from('curriculum_items')
    .select('id, public_slug, title, unit_name, category, session_number, variant_label, curriculum_id')
    .in('curriculum_id', currIds)
    .is('archived_at', null)
    .order('curriculum_id')
    .order('session_number');

  const byKey = new Map<string, Array<{ session: number | null; title: string; slug: string; unit: string | null; variant: string | null; cat: string }>>();
  (items || []).forEach((i: {
    public_slug: string; title: string; unit_name: string | null; category: string;
    session_number: number | null; variant_label: string | null; curriculum_id: string;
  }) => {
    const curr = curricula?.find((c: { id: string }) => c.id === i.curriculum_id);
    if (!curr) return;
    const key = `${curr.subject_slug}/${curr.title}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push({
      session: i.session_number, title: i.title, slug: i.public_slug,
      unit: i.unit_name, variant: i.variant_label, cat: i.category,
    });
  });
  for (const [key, list] of byKey) {
    console.log(`\n=== ${key} (${list.length}개) ===`);
    list.forEach(x => console.log(`  s${x.session}${x.variant ? ` v=${x.variant}` : ''} [${x.cat}] ${x.slug} — ${x.title}`));
  }
  console.log('');

  // 3. 각 학생의 신 SLA 건수
  log('🔍', '신 SLA 카운트 (마이그레이션 미실행 상태 확인 → 모두 0 예상)');
  for (const name of TARGET_STUDENTS) {
    const p = profMap.get(name);
    if (!p) continue;
    const { count } = await sc
      .from('student_lesson_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', p.id);
    info(`  ${name}: ${count}건`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
