import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// 수강 옵션 문자열 → subject slug 매핑
function parseCourseOption(option: string): string | null {
  if (option.includes('공수1') || option.includes('공통수학1') || option.includes('공통수학 1')) return 'common-math-1';
  if (option.includes('공수2') || option.includes('공통수학2') || option.includes('공통수학 2')) return 'common-math-2';
  if (option.includes('대수')) return 'algebra';
  if (option.includes('미적1') || option.includes('미적분1') || option.includes('미적분 1')) return 'calculus-1';
  if (option.includes('기하')) return 'geometry';
  return null; // "기타" 등 → 수동 처리
}

const INITIAL_PASSWORD = '123456';

export async function POST(request: NextRequest) {
  // 1. 시크릿 키 인증
  const authHeader = request.headers.get('authorization');
  const secret = process.env.SHEET_SYNC_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }

  // 2. 바디 파싱
  let body: {
    email: string;
    name: string;
    school: string;
    birth_date: string;
    phone_student: string;
    phone_parent: string;
    course_option: string;
    naver_id?: string;
    duration_months?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 });
  }

  const { email, name, school, birth_date, phone_student, phone_parent, course_option, naver_id, duration_months = 6 } = body;

  if (!email || !name || !birth_date) {
    return NextResponse.json({ error: '필수 항목 누락 (email, name, birth_date)' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const password = INITIAL_PASSWORD;

  // 3. Supabase Auth 계정 생성 (이미 있으면 기존 계정 사용)
  let userId: string;
  let isNew = true;

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    // 이미 존재하는 계정 → profiles에서 찾기
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('assignment_email', email)
      .single();

    if (!existing) {
      return NextResponse.json({ error: '계정 생성 실패: ' + createError.message }, { status: 500 });
    }

    userId = existing.id;
    isNew = false;
  } else {
    if (!newUser?.user) {
      return NextResponse.json({ error: '계정 생성 실패' }, { status: 500 });
    }
    userId = newUser.user.id;

    // 4. 프로필 생성
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      name,
      school: school || '미입력',
      birth_date,
      phone_student: phone_student || '미입력',
      phone_parent: phone_parent || '미입력',
      assignment_email: email,
    });

    if (profileError) {
      return NextResponse.json({ error: '프로필 생성 실패: ' + profileError.message }, { status: 500 });
    }
  }

  // 5. 수강 권한 부여
  const subjectSlug = parseCourseOption(course_option || '');
  const enrolledCourses: string[] = [];

  if (subjectSlug) {
    // subject slug → subject id 조회
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('slug', subjectSlug)
      .single();

    if (subject) {
      // 해당 과목의 활성 강의 전체 조회
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('subject_id', subject.id)
        .eq('is_active', true);

      if (courses && courses.length > 0) {
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + duration_months);

        const enrollments = courses.map((c) => ({
          user_id: userId,
          course_id: c.id,
          source: 'sheet_sync',
          valid_until: validUntil.toISOString(),
        }));

        await supabase
          .from('enrollments')
          .upsert(enrollments, { onConflict: 'user_id,course_id' });

        enrolledCourses.push(...courses.map((c) => c.title));
      }
    }
  }

  return NextResponse.json({
    success: true,
    isNew,
    userId,
    email,
    password,
    naver_id: naver_id || null,
    course_option: course_option || null,
    enrolled_courses: enrolledCourses,
    message: isNew
      ? `계정 생성 완료. 수강 권한: ${enrolledCourses.length}개 강의`
      : `기존 계정 사용. 수강 권한 업데이트: ${enrolledCourses.length}개 강의`,
  });
}
