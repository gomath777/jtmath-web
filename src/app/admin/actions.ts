'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_test');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map((e) => e.trim());

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return null;
  }
  return user;
}

export async function grantEnrollment(userId: string, courseId: string, durationMonths: number) {
  const admin = await checkAdmin();
  if (!admin) return { error: '권한이 없습니다.' };

  const supabase = createAdminClient();

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', userId)
    .single();

  if (!targetProfile) return { error: '사용자를 찾을 수 없습니다.' };

  const validUntil = new Date();
  validUntil.setMonth(validUntil.getMonth() + durationMonths);

  const { error: enrollError } = await supabase
    .from('enrollments')
    .upsert(
      { user_id: userId, course_id: courseId, source: 'admin_grant', valid_until: validUntil.toISOString() },
      { onConflict: 'user_id,course_id' }
    );

  if (enrollError) {
    console.error('Enroll Error:', enrollError);
    return { error: '수강 권한 부여 실패' };
  }

  // 이메일 알림 (선택)
  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: 'jtmath <onboarding@resend.dev>',
        to: process.env.ADMIN_NOTIFY_EMAIL || 'test@jtmath.com',
        subject: `[jtmath] ${targetProfile.name}님, 수강 신청이 승인되었습니다!`,
        html: `<p>${targetProfile.name}님의 수강 권한이 ${durationMonths}개월간 부여되었습니다.</p>`,
      });
    } catch (emailErr) {
      console.error('Email Send Error:', emailErr);
    }
  }

  return { success: true };
}

export async function revokeEnrollment(enrollmentId: string) {
  const admin = await checkAdmin();
  if (!admin) return { error: '권한이 없습니다.' };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId);

  if (error) {
    console.error('Revoke Error:', error);
    return { error: '수강 권한 삭제 실패' };
  }

  return { success: true };
}
