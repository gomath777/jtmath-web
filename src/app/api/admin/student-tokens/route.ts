import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { generateSlug } from '@/utils/student-auth';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

// GET: List all student tokens
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sc = getServiceClient();
  const { data: tokens, error } = await sc
    .from('student_tokens')
    .select(`
      id, slug, birth_pin, is_active, last_accessed_at, created_at,
      profile_id,
      profiles!inner(name, school, phone_student)
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tokens: tokens || [] });
}

// POST: Create a single student token
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { profile_id } = await req.json();
  if (!profile_id) {
    return NextResponse.json({ error: 'profile_id 필수' }, { status: 400 });
  }

  const sc = getServiceClient();

  // Check if token already exists for this profile
  const { data: existing } = await sc
    .from('student_tokens')
    .select('id, slug')
    .eq('profile_id', profile_id)
    .single();

  if (existing) {
    return NextResponse.json({ error: '이미 토큰이 존재합니다', token: existing }, { status: 409 });
  }

  // Get profile for birth_date
  const { data: profile } = await sc
    .from('profiles')
    .select('birth_date, name')
    .eq('id', profile_id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 });
  }

  // Extract birth_pin from birth_date (handle various formats)
  let birthPin = '';
  if (profile.birth_date) {
    const cleaned = profile.birth_date.replace(/\D/g, '');
    if (cleaned.length >= 6) {
      birthPin = cleaned.slice(-6); // Last 6 digits (YYMMDD)
    } else {
      birthPin = cleaned;
    }
  }

  if (!birthPin || birthPin.length !== 6) {
    return NextResponse.json({ error: '생년월일 정보가 유효하지 않습니다 (YYMMDD 6자리 필요)' }, { status: 400 });
  }

  // Generate unique slug
  let slug = generateSlug();
  let attempts = 0;
  while (attempts < 10) {
    const { data: conflict } = await sc
      .from('student_tokens')
      .select('id')
      .eq('slug', slug)
      .single();
    if (!conflict) break;
    slug = generateSlug();
    attempts++;
  }

  const { data: token, error } = await sc
    .from('student_tokens')
    .insert({ profile_id, slug, birth_pin: birthPin })
    .select('id, slug, birth_pin')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    token,
    url: `https://jtmath.kr/s/${slug}`,
    name: profile.name,
  });
}

// DELETE: Deactivate a token
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 });

  const sc = getServiceClient();
  await sc.from('student_tokens').update({ is_active: false }).eq('id', id);

  return NextResponse.json({ success: true });
}
