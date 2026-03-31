import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SECRET_KEY = 'jtmath-sheet-sync-2026';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 시크릿 키 검증
    if (body.secret !== SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, phone_student, phone_parent, birth_date, school } = body;

    if (!email || !name) {
      return NextResponse.json({ error: '이름과 이메일은 필수입니다' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 이미 존재하는 계정인지 확인
    const { data: existing } = await supabase.auth.admin.listUsers();
    const alreadyExists = existing.users.some(u => u.email === email);
    if (alreadyExists) {
      return NextResponse.json({ message: '이미 등록된 이메일입니다', skipped: true });
    }

    // Auth 계정 생성 (기본 비밀번호: 123456)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: '123456',
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // 프로필 생성
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name,
      phone_student: phone_student || '',
      phone_parent: phone_parent || '',
      birth_date: birth_date || '',
      school: school || '',
      assignment_email: email,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: authData.user.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
