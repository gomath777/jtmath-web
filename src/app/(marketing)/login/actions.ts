'use server';

import { createClient } from '@/utils/supabase/server';
import { setSimpleAdminCookie, verifySimpleAdminPasscode } from '@/utils/admin-auth';
import { redirect } from 'next/navigation';

export async function loginAdmin(formData: FormData) {
  const passcode = String(formData.get('admin_passcode') || '').replace(/\D/g, '').slice(0, 6);

  if (!verifySimpleAdminPasscode(passcode)) {
    return { error: '관리자 비밀번호가 맞지 않습니다.' };
  }

  await setSimpleAdminCookie(passcode);
  redirect('/admin/calendars-new');
}

export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  // 성공 시 대시보드로 이동
  redirect('/dashboard');
}
