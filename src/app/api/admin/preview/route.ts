import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { signToken, setStudentCookie } from '@/utils/student-auth';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

// GET /api/admin/preview?slug=xxx&to=/s/xxx/session/yyy
// 어드민 인증 확인 후 해당 학생의 student_session 쿠키(isMaster)를 발급하고 리디렉트.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const slug = req.nextUrl.searchParams.get('slug');
  const to = req.nextUrl.searchParams.get('to');
  if (!slug || !to) {
    return NextResponse.json({ error: 'slug, to 파라미터 필요' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
  const { data: token } = await sc
    .from('student_tokens')
    .select('profile_id')
    .eq('slug', slug)
    .maybeSingle();

  if (!token) {
    return NextResponse.json({ error: '학생 토큰 없음' }, { status: 404 });
  }

  const studentToken = await signToken(token.profile_id, slug, true);
  const response = NextResponse.redirect(new URL(to, req.url));
  return setStudentCookie(response, studentToken);
}
