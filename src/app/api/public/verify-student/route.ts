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

  // Verify birth pin
  if (tokenRow.birth_pin !== birth_pin) {
    return NextResponse.json({ error: '생년월일이 일치하지 않습니다' }, { status: 401 });
  }

  // Update last accessed
  await sc
    .from('student_tokens')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  // Get student name
  const { data: profile } = await sc
    .from('profiles')
    .select('name')
    .eq('id', tokenRow.profile_id)
    .single();

  // Sign token and set cookie
  const token = await signToken(tokenRow.profile_id, tokenRow.slug);
  const res = NextResponse.json({
    success: true,
    name: profile?.name || '',
    slug: tokenRow.slug,
  });

  return setStudentCookie(res, token);
}
