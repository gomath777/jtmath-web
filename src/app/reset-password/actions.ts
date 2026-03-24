'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string;
  const passwordConfirm = formData.get('passwordConfirm') as string;

  if (!password || password.length < 6) {
    return { error: '비밀번호는 6자 이상이어야 합니다.' };
  }

  if (password !== passwordConfirm) {
    return { error: '비밀번호가 일치하지 않습니다.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: '비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.' };
  }

  redirect('/login?reset=true');
}
