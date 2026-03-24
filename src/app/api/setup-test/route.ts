import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// GET /api/setup-test
// 테스트 계정을 생성하고 첫 번째 강의에 수강 권한을 부여합니다.
// 개발/테스트 용도로만 사용하세요.
export async function GET() {
  const supabase = createAdminClient();

  const TEST_EMAIL = 'test@jtmath.com';
  const TEST_PASSWORD = 'test1234!';

  // 1. 테스트 유저 생성 시도 (이미 있으면 에러 처리)
  let userId: string;

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (createError) {
    // 이미 존재하는 경우 → profiles 테이블에서 조회
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('assignment_email', TEST_EMAIL)
      .single();

    if (!existingProfile) {
      return NextResponse.json({ error: '유저 생성 실패: ' + createError.message }, { status: 500 });
    }
    userId = existingProfile.id;
  } else {
    if (!newUser?.user) {
      return NextResponse.json({ error: '유저 생성 실패' }, { status: 500 });
    }
    userId = newUser.user.id;

    // 3. 프로필 생성
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      name: '테스트학생',
      school: '테스트고등학교',
      birth_date: '050101',
      phone_student: '010-0000-0000',
      phone_parent: '010-1111-1111',
      assignment_email: TEST_EMAIL,
    });

    if (profileError) {
      return NextResponse.json({ error: '프로필 생성 실패: ' + profileError.message }, { status: 500 });
    }
  }

  // 4. 첫 번째 활성 강의 조회
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(3);

  if (!courses || courses.length === 0) {
    return NextResponse.json({
      success: true,
      message: '테스트 계정이 생성되었습니다. (강의 없음)',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
  }

  // 5. 모든 조회된 강의에 수강 권한 부여 (1년)
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const enrollments = courses.map((course) => ({
    user_id: userId,
    course_id: course.id,
    source: 'admin_grant',
    valid_until: validUntil.toISOString(),
  }));

  const { error: enrollError } = await supabase
    .from('enrollments')
    .upsert(enrollments, { onConflict: 'user_id,course_id' });

  if (enrollError) {
    return NextResponse.json({ error: '수강 권한 부여 실패: ' + enrollError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `테스트 계정 준비 완료! ${courses.length}개 강의 수강 권한 부여됨.`,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    enrolledCourses: courses.map((c) => c.title),
  });
}
