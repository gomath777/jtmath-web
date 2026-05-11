import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.public_slug === 'string') {
    if (!SLUG_PATTERN.test(body.public_slug)) {
      return NextResponse.json({ error: '슬러그 형식: 영소문자/숫자/하이픈, 양끝은 영숫자' }, { status: 400 });
    }
    updates.public_slug = body.public_slug;
  }
  if (typeof body.title === 'string') updates.title = body.title;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: '변경할 필드 없음' }, { status: 400 });

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data, error } = await sc.from('curriculum_items').update(updates).eq('id', id).select().single();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 슬러그입니다' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}
