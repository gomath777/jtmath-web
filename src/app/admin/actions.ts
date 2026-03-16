'use server';

import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_test');

export async function grantEnrollment(userId: string, courseId: string, durationMonths: number) {
  const supabase = await createClient();

  // 1. Admin Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: '권한이 없습니다.' };
  }
  // 실제 서비스: if (user.email !== 'admin@jtmath.com') return { error: 'Not Admin' }

  // 2. Fetch target user email to send notification
  const { data: targetProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', userId)
    .single();

  const { data: targetAuth, error: authErr } = await supabase.auth.admin?.getUserById(userId) || { data: { user: null } };
  
  if (profileErr || !targetProfile) {
    return { error: '사용자를 찾을 수 없습니다.' };
  }

  // 3. Insert or Update Enrollment
  const validUntil = new Date();
  validUntil.setMonth(validUntil.getMonth() + durationMonths);

  const { error: enrollError } = await supabase
    .from('enrollments')
    .upsert({
      user_id: userId,
      course_id: courseId,
      source: 'manual_admin',
      valid_until: validUntil.toISOString()
    }, { onConflict: 'user_id,course_id' });

  if (enrollError) {
    console.error('Enroll Error:', enrollError);
    return { error: '수강 권한 부여 실패' };
  }

  // 4. Send Welcome Email via Resend
  // Supabase admin.getUserById() only works with service_role key.
  // We'll use a placeholder email if we can't get it, or we could have stored it in profiles.
  // In a real app we'd fetch the email securely. Let's assume we use a fallback for demo.

  // NOTE: If you add RESEND_API_KEY, this will actually send.
  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: 'jtmath <onboarding@resend.dev>', // Change to verified domain later
        to: process.env.ADMIN_NOTIFY_EMAIL || 'test@jtmath.com', // Send to admin for testing to avoid spam, or actual user email if available
        subject: `[jtmath] ${targetProfile.name}님, 수강 신청이 승인되었습니다! 🎉`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #e21d48;">jtmath 수강 신청 완료 안내</h1>
            <p>안녕하세요, <strong>${targetProfile.name}</strong>님!</p>
            <p>수강 신청하신 강좌에 대한 승인이 완료되어 지금부터 바로 내 강의실에서 수강이 가능합니다.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0f172a;">▶ 필수: 1:1 관리를 위한 카카오톡 오픈채팅방 입장 안내</h3>
              <p>원활한 과제 제출 및 질의응답을 위해 반드시 아래 오픈채팅방에 입장해주세요.</p>
              <a href="https://open.kakao.com/o/YOUR_LINK_HERE" style="display: inline-block; background-color: #FEE500; color: #371D1E; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; margin-top: 10px;">
                카카오톡 소통방 입장하기
              </a>
            </div>

            <p>강의 수강 전 <strong>[내 강의실] -> [Lesson 0: 수강 전 오리엔테이션]</strong>을 반드시 시청해주세요!</p>
            <br/>
            <a href="https://your-domain.com/dashboard" style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">내 강의실 바로가기</a>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Email Send Error:', emailErr);
      // We don't block the UI if email fails, but we should log it.
    }
  }

  return { success: true };
}
