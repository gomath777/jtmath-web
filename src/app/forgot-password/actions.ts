'use server';

import { createClient } from '@/utils/supabase/server';

export async function sendPasswordReset(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: '이메일을 입력해주세요.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) {
    console.error('Password reset error:', error);
    // 보안상 이메일 존재 여부를 노출하지 않음
  }

  // 항상 성공 메시지 반환 (이메일 존재 여부 숨김)
  return { success: true };
}
