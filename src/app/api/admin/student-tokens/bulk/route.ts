import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { generateSlug } from '@/utils/student-auth';

// POST: Bulk create tokens for multiple profiles
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { profile_ids } = await req.json();
  if (!profile_ids || !Array.isArray(profile_ids) || profile_ids.length === 0) {
    return NextResponse.json({ error: 'profile_ids 배열 필수' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Get all profiles
  const { data: profiles } = await sc
    .from('profiles')
    .select('id, name, birth_date')
    .in('id', profile_ids);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 });
  }

  // Check existing tokens
  const { data: existingTokens } = await sc
    .from('student_tokens')
    .select('profile_id')
    .in('profile_id', profile_ids);

  const existingProfileIds = new Set((existingTokens || []).map(t => t.profile_id));

  // Collect used slugs to avoid collision within this batch
  const usedSlugs = new Set<string>();
  const { data: allSlugs } = await sc.from('student_tokens').select('slug');
  (allSlugs || []).forEach(s => usedSlugs.add(s.slug));

  const results: Array<{
    profile_id: string;
    name: string;
    slug: string;
    url: string;
    status: 'created' | 'skipped' | 'error';
    reason?: string;
  }> = [];

  for (const profile of profiles) {
    if (existingProfileIds.has(profile.id)) {
      results.push({
        profile_id: profile.id,
        name: profile.name,
        slug: '',
        url: '',
        status: 'skipped',
        reason: '이미 토큰 존재',
      });
      continue;
    }

    // Extract birth_pin
    let birthPin = '';
    if (profile.birth_date) {
      const cleaned = profile.birth_date.replace(/\D/g, '');
      if (cleaned.length >= 6) {
        birthPin = cleaned.slice(-6);
      }
    }

    if (!birthPin || birthPin.length !== 6) {
      results.push({
        profile_id: profile.id,
        name: profile.name,
        slug: '',
        url: '',
        status: 'error',
        reason: '생년월일 정보 없음',
      });
      continue;
    }

    // Generate unique slug
    let slug = generateSlug();
    while (usedSlugs.has(slug)) {
      slug = generateSlug();
    }
    usedSlugs.add(slug);

    const { error } = await sc
      .from('student_tokens')
      .insert({ profile_id: profile.id, slug, birth_pin: birthPin });

    if (error) {
      results.push({
        profile_id: profile.id,
        name: profile.name,
        slug: '',
        url: '',
        status: 'error',
        reason: error.message,
      });
    } else {
      results.push({
        profile_id: profile.id,
        name: profile.name,
        slug,
        url: `https://jtmath.kr/s/${slug}`,
        status: 'created',
      });
    }
  }

  return NextResponse.json({
    results,
    summary: {
      created: results.filter(r => r.status === 'created').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
    },
  });
}
