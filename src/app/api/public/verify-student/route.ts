import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { signToken, setStudentCookie } from '@/utils/student-auth';

export async function POST(req: NextRequest) {
  const { slug, birth_pin } = await req.json();

  if (!slug || !birth_pin) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Find student token by slug
  const { data: tokenRow, error } = await sc
    .from('student_tokens')
    .select('id, profile_id, slug, birth_pin, is_active')
    .eq('slug', slug)
    .single();

  if (error || !tokenRow) {
    return NextResponse.json({ error: '학생 정보를 찾을 수 없습니다' }, { status: 404 });
  }

  if (!tokenRow.is_active) {
    return NextResponse.json({ error: '비활성화된 계정입니다' }, { status: 403 });
  }

  // Verify birth pin — 학생 본인 PIN 또는 관리자 마스터 PIN
  // 마스터 PIN(ADMIN_MASTER_PIN)은 학원장이 모든 학생 계정을 impersonate 하기 위한 백도어.
  // .env.local 에만 보관하고 학생/외부엔 절대 공유 금지.
  const masterPin = process.env.ADMIN_MASTER_PIN;
  const isMasterAccess = !!masterPin && birth_pin === masterPin;
  const isOwnerAccess = tokenRow.birth_pin === birth_pin;
  if (!isOwnerAccess && !isMasterAccess) {
    return NextResponse.json({ error: '생년월일이 일치하지 않습니다' }, { status: 401 });
  }

  // 마스터 PIN 접근은 학생 본인 활동이 아니므로 last_accessed_at 업데이트하지 않음.
  // 별도 audit 은 아래 student_events 로 남김.
  if (!isMasterAccess) {
    await sc
      .from('student_tokens')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', tokenRow.id);
  }

  // 마스터 접근 감사 로그 (실 학생 로그와 분리되게 별도 이벤트). 실패해도 로그인은 허용.
  if (isMasterAccess && !isOwnerAccess) {
    try {
      await sc.from('student_events').insert({
        profile_id: tokenRow.profile_id,
        event_type: 'admin_master_access',
        metadata: { slug: tokenRow.slug },
      });
    } catch {
      /* silent */
    }
  }

  // Get student name
  const { data: profile } = await sc
    .from('profiles')
    .select('name')
    .eq('id', tokenRow.profile_id)
    .single();

  // Sign token and set cookie (master access는 isMaster claim 으로 표시 → 이후 라우트에서 활동 추적 제외)
  const token = await signToken(tokenRow.profile_id, tokenRow.slug, isMasterAccess && !isOwnerAccess);
  const res = NextResponse.json({
    success: true,
    name: profile?.name || '',
    slug: tokenRow.slug,
  });

  return setStudentCookie(res, token);
}
