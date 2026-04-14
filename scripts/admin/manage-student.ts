#!/usr/bin/env npx ts-node
/**
 * 학생 관리 CLI — 서브커맨드 패턴
 *
 * 사용법:
 *   manage-student.ts add --name 홍민서 --birth 080315 --school 경기고 [--phone 010-1234-5678]
 *   manage-student.ts list [--curriculum <id>]
 *   manage-student.ts link --student 홍민서 --curriculum <id>
 *   manage-student.ts info 홍민서
 *   manage-student.ts copy-link 홍민서  # 카톡 링크 클립보드 복사
 */

import { execSync } from 'child_process';
import {
  parseArgs, getServiceClient, log, error, success, info, warn,
  required, printHelp, printTable, generateSlug,
} from './_shared';

const SITE_URL = 'https://jtmath.kr';

// --- Subcommands ---

async function cmdAdd() {
  const args = parseArgs(process.argv.slice(3));
  const name = required(args, 'name');
  const birth = required(args, 'birth');
  const school = args.options.school || '';
  const phone = args.options.phone || '';

  if (birth.length !== 6 || !/^\d{6}$/.test(birth)) {
    error('--birth는 YYMMDD 6자리 숫자여야 합니다 (예: 080315)');
  }

  const sc = getServiceClient();

  // Check if exists
  const { data: existing } = await sc.from('profiles').select('id, name').eq('name', name).maybeSingle();
  if (existing) {
    warn(`이미 존재하는 학생: ${name} (${existing.id})`);
    info(`추가하려면 이름을 다르게 하거나, 기존 학생을 재사용하세요`);
    return;
  }

  // Use register-from-sheet API logic (needs email)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
  const email = `${name}-${Date.now()}@jtmath.kr`;

  info(`학생 등록 중: ${name}`);

  // Create auth user
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: birth,
      email_confirm: true,
      user_metadata: { name, source: 'manage-student-cli' },
    }),
  });

  if (!authRes.ok) {
    error(`Auth 유저 생성 실패: ${await authRes.text()}`);
  }
  const authUser = await authRes.json();

  // Create profile
  const { error: profileErr } = await sc.from('profiles').insert({
    id: authUser.id,
    name,
    birth_date: birth,
    school,
    phone_student: phone,
    email,
  });
  if (profileErr) error(`프로필 생성 실패: ${profileErr.message}`);

  // Create token
  let slug = generateSlug();
  for (let i = 0; i < 10; i++) {
    const { data: conflict } = await sc.from('student_tokens').select('id').eq('slug', slug).maybeSingle();
    if (!conflict) break;
    slug = generateSlug();
  }

  const { error: tokenErr } = await sc.from('student_tokens').insert({
    profile_id: authUser.id,
    slug,
    birth_pin: birth,
  });
  if (tokenErr) error(`토큰 생성 실패: ${tokenErr.message}`);

  console.log('');
  success(`등록 완료: ${name}`);
  info(`ID: ${authUser.id}`);
  info(`링크: ${SITE_URL}/s/${slug}`);
  info(`생년월일 PIN: ${birth}`);
}

async function cmdList() {
  const args = parseArgs(process.argv.slice(3));
  const curriculumId = args.options.curriculum;
  const sc = getServiceClient();

  let profileIds: string[] | null = null;
  if (curriculumId) {
    const { data: links } = await sc
      .from('student_curriculum_links')
      .select('profile_id')
      .eq('curriculum_id', curriculumId);
    profileIds = (links || []).map(l => l.profile_id);
    if (profileIds.length === 0) {
      warn('해당 커리큘럼에 배정된 학생이 없습니다');
      return;
    }
  }

  let query = sc
    .from('student_tokens')
    .select('slug, last_accessed_at, is_active, profile_id, profiles!inner(name, school)')
    .order('created_at', { ascending: false });

  if (profileIds) query = query.in('profile_id', profileIds);

  const { data } = await query;
  if (!data || data.length === 0) {
    warn('학생이 없습니다');
    return;
  }

  const rows = data.map(t => {
    const p = t.profiles as unknown as { name: string; school: string };
    return {
      이름: p?.name || '?',
      학교: p?.school || '',
      링크: `/s/${t.slug}`,
      '최근 접속': t.last_accessed_at ? new Date(t.last_accessed_at).toLocaleDateString('ko-KR') : '-',
      상태: t.is_active ? '✅' : '❌',
    };
  });

  printTable(rows);
  console.log('');
  info(`전체 ${rows.length}명`);
}

async function cmdLink() {
  const args = parseArgs(process.argv.slice(3));
  const studentName = required(args, 'student');
  const curriculumId = required(args, 'curriculum');
  const sc = getServiceClient();

  const { data: profile } = await sc.from('profiles').select('id, name').eq('name', studentName).maybeSingle();
  if (!profile) error(`학생 없음: ${studentName}`);

  const { data: curriculum } = await sc.from('curricula').select('id, title').eq('id', curriculumId).maybeSingle();
  if (!curriculum) error(`커리큘럼 없음: ${curriculumId}`);

  const { error: linkErr } = await sc.from('student_curriculum_links').insert({
    profile_id: profile!.id,
    curriculum_id: curriculumId,
  });

  if (linkErr) {
    if (linkErr.code === '23505') {
      warn(`이미 배정되어 있음: ${studentName} ↔ ${curriculum!.title}`);
      return;
    }
    error(`배정 실패: ${linkErr.message}`);
  }

  success(`배정 완료: ${studentName} → ${curriculum!.title}`);
}

async function cmdInfo() {
  const studentName = process.argv[3];
  if (!studentName) error('학생 이름을 입력하세요: manage-student.ts info <이름>');

  const sc = getServiceClient();
  const { data: profile } = await sc
    .from('profiles')
    .select('id, name, birth_date, school, phone_student, email')
    .eq('name', studentName)
    .maybeSingle();
  if (!profile) error(`학생 없음: ${studentName}`);

  const { data: token } = await sc.from('student_tokens').select('slug, is_active, last_accessed_at').eq('profile_id', profile!.id).maybeSingle();
  const { data: links } = await sc
    .from('student_curriculum_links')
    .select('curricula(title)')
    .eq('profile_id', profile!.id);
  const { data: odapji } = await sc
    .from('odapji_files')
    .select('id')
    .eq('profile_id', profile!.id);

  console.log('');
  console.log(`📋 ${profile!.name}`);
  console.log(`   ID: ${profile!.id}`);
  console.log(`   생년월일: ${profile!.birth_date}`);
  console.log(`   학교: ${profile!.school || '-'}`);
  console.log(`   연락처: ${profile!.phone_student || '-'}`);
  if (token) {
    console.log(`   링크: ${SITE_URL}/s/${token.slug} ${token.is_active ? '✅' : '❌'}`);
    console.log(`   최근접속: ${token.last_accessed_at || '없음'}`);
  }
  console.log(`   배정 커리큘럼: ${links?.length || 0}개`);
  (links || []).forEach(l => {
    const c = l.curricula as unknown as { title: string };
    console.log(`      - ${c.title}`);
  });
  console.log(`   오답지: ${odapji?.length || 0}개`);
}

async function cmdCopyLink() {
  const studentName = process.argv[3];
  if (!studentName) error('학생 이름을 입력하세요');

  const sc = getServiceClient();
  const { data: profile } = await sc.from('profiles').select('id').eq('name', studentName).maybeSingle();
  if (!profile) error(`학생 없음: ${studentName}`);

  const { data: token } = await sc.from('student_tokens').select('slug').eq('profile_id', profile!.id).maybeSingle();
  if (!token) error(`토큰 없음: ${studentName}`);

  const link = `${SITE_URL}/s/${token!.slug}`;
  try {
    execSync('pbcopy', { input: link });
    success(`클립보드 복사 완료: ${link}`);
  } catch {
    warn(`클립보드 복사 실패, 링크: ${link}`);
  }
}

// --- Main ---

async function main() {
  const cmd = process.argv[2];

  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log('사용법:');
    console.log('  manage-student.ts add --name X --birth YYMMDD --school Y [--phone Z]');
    console.log('  manage-student.ts list [--curriculum <id>]');
    console.log('  manage-student.ts link --student <이름> --curriculum <id>');
    console.log('  manage-student.ts info <이름>');
    console.log('  manage-student.ts copy-link <이름>');
    process.exit(0);
  }

  switch (cmd) {
    case 'add': await cmdAdd(); break;
    case 'list': await cmdList(); break;
    case 'link': await cmdLink(); break;
    case 'info': await cmdInfo(); break;
    case 'copy-link': await cmdCopyLink(); break;
    default: error(`알 수 없는 명령: ${cmd}`);
  }
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
