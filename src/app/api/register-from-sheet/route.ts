import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SECRET_KEY = 'jtmath-sheet-sync-2026';

export async function POST(req: NextRequest) {
  try {
    // Authorization: Bearer <key> 검증
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone_student, phone_parent, birth_date, school } = body;

    if (!email || !name) {
      return NextResponse.json({ error: '이름과 이메일은 필수입니다' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 이미 존재하는 계정 확인
    const { data: existing } = await supabase.auth.admin.listUsers();
    const alreadyExists = existing.users.some(u => u.email === email.trim());
    if (alreadyExists) {
      return NextResponse.json({ success: true, message: '이미 등록된 이메일', password: '' });
    }

    // 기본 비밀번호: 123456
    const password = '123456';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // 생년월일 포맷 정규화 (yyyy-mm-dd → yymmdd)
    let birthFormatted = String(birth_date || '').trim();
    if (birthFormatted.includes('-')) {
      const parts = birthFormatted.split('-');
      if (parts.length === 3) {
        birthFormatted = parts[0].slice(-2) + parts[1] + parts[2];
      }
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name: name.trim(),
      phone_student: String(phone_student || '').trim(),
      phone_parent: String(phone_parent || '').trim(),
      birth_date: birthFormatted,
      school: String(school || '').trim(),
      assignment_email: email.trim(),
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${name} 계정 생성 완료`,
      password,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
