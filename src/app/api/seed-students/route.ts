import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

const TEST_STUDENTS = [
  { name: '김민준', school: '서울고등학교', birth_date: '060315', phone_student: '010-1234-5678', phone_parent: '010-8765-4321', email: 'minjun@test.com' },
  { name: '이서연', school: '한양고등학교', birth_date: '070820', phone_student: '010-2345-6789', phone_parent: '010-9876-5432', email: 'seoyeon@test.com' },
  { name: '박지호', school: '연세고등학교', birth_date: '061102', phone_student: '010-3456-7890', phone_parent: '010-0987-6543', email: 'jiho@test.com' },
  { name: '최수아', school: '이화여자고등학교', birth_date: '080214', phone_student: '010-4567-8901', phone_parent: '010-1098-7654', email: 'sua@test.com' },
  { name: '정현우', school: '대원외국어고등학교', birth_date: '050709', phone_student: '010-5678-9012', phone_parent: '010-2109-8765', email: 'hyunwoo@test.com' },
];

const TEST_PASSWORD = 'test1234!';

export async function GET() {
  const supabase = createAdminClient();

  const results: { name: string; email: string; status: string }[] = [];

  for (const student of TEST_STUDENTS) {
    // 유저 생성
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: student.email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    let userId: string | null = null;

    if (createError) {
      // 이미 존재 → profiles에서 찾기
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('assignment_email', student.email)
        .single();

      if (existing) {
        userId = existing.id;
        results.push({ name: student.name, email: student.email, status: '이미 존재 (스킵)' });
      } else {
        results.push({ name: student.name, email: student.email, status: '실패: ' + createError.message });
      }
      continue;
    }

    userId = newUser?.user?.id ?? null;
    if (!userId) {
      results.push({ name: student.name, email: student.email, status: '실패: userId 없음' });
      continue;
    }

    // 프로필 생성
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      name: student.name,
      school: student.school,
      birth_date: student.birth_date,
      phone_student: student.phone_student,
      phone_parent: student.phone_parent,
      assignment_email: student.email,
    });

    if (profileError) {
      results.push({ name: student.name, email: student.email, status: '프로필 실패: ' + profileError.message });
    } else {
      results.push({ name: student.name, email: student.email, status: '생성 완료' });
    }
  }

  return NextResponse.json({
    success: true,
    password: TEST_PASSWORD,
    results,
  });
}
