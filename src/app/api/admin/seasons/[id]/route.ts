import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: season } = await sc
    .from('curricula')
    .select('id, title, subject_slug, schedule_pattern, start_date, description')
    .eq('id', id)
    .maybeSingle();
  if (!season) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: items } = await sc
    .from('curriculum_items')
    .select('id, week_number, session_number, label, title, unit_name, category, variant_label, publish_date, public_slug, is_released, sort_order')
    .eq('curriculum_id', id)
    .is('archived_at', null)
    .order('week_number', { ascending: true, nullsFirst: false })
    .order('session_number', { ascending: true, nullsFirst: false })
    .order('sort_order', { ascending: true, nullsFirst: true });

  const { data: enrolled } = await sc
    .from('student_curriculum_links')
    .select(`
      profile_id, enrolled_at,
      profile:profiles!inner ( id, name, school, grade )
    `)
    .eq('curriculum_id', id);

  return NextResponse.json({ season, items: items || [], enrolled: enrolled || [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.title === 'string') updates.title = body.title;
  if (typeof body.description === 'string' || body.description === null) updates.description = body.description;
  if (typeof body.start_date === 'string') updates.start_date = body.start_date;
  if (typeof body.schedule_pattern === 'string' || body.schedule_pattern === null) updates.schedule_pattern = body.schedule_pattern;

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: '변경할 필드 없음' }, { status: 400 });

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
  const { data, error } = await sc.from('curricula').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ season: data });
}
