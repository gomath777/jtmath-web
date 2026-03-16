'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function signupUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const passwordConfirm = formData.get('passwordConfirm') as string;
  const name = formData.get('name') as string;
  const birth_date = formData.get('birth_date') as string;
  const school = formData.get('school') as string;
  const phone_student = formData.get('phone_student') as string;
  const phone_parent = formData.get('phone_parent') as string;
  const useSameEmail = formData.get('useSameEmail') === 'on';
  const assignment_email = useSameEmail ? email : formData.get('assignment_email') as string;

  if (password !== passwordConfirm) {
    return { error: '비밀번호가 일치하지 않습니다.' };
  }

  const supabase = await createClient();

  // 1. Supabase Auth 회원가입
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  });

  if (authError || !authData.user) {
    return { error: authError?.message || '회원가입에 실패했습니다.' };
  }

  // 2. 추가 정보를 profiles 테이블에 저장 (schema.sql 기준)
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        id: authData.user.id, // auth.users 테이블의 id와 동일
        name,
        birth_date,
        school,
        phone_student,
        phone_parent,
        assignment_email,
      }
    ]);

  if (profileError) {
    console.error('Profile Insert Error:', profileError);
    return { error: '회원 정보 저장 중 오류가 발생했습니다.' };
  }

  // 완료 후 로그인 페이지 대신 이메일 확인 안내 페이지로 리다이렉트 (프론트에서 처리하도록 변경 가능하나 심플하게 쿼리로 넘김)
  redirect('/signup?check_email=true');
}
