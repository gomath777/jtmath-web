import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

// GET: 범위 내 모든 SLA. query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&subject=gs1
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const url = req.nextUrl;
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const subject = url.searchParams.get('subject') || '';

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  let q = sc
    .from('student_lesson_assignments')
    .select(`
      id, profile_id, scheduled_date, status, variant, notes,
      profile:profiles!inner ( name ),
      curriculum_item:curriculum_items!inner (
        id, week_number, session_number, label, title, public_slug,
        curriculum:curricula!inner ( subject_slug )
      )
    `)
    .order('scheduled_date', { ascending: true });

  if (from) q = q.gte('scheduled_date', from);
  if (to) q = q.lte('scheduled_date', to);
  if (subject) q = q.eq('curriculum_item.curriculum.subject_slug', subject);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data || [] });
}

// POST: 단건 또는 일괄 SLA 생성 (학생×페이지×날짜 매트릭스 셀 추가)
// body: { profile_ids: string[], curriculum_item_id: string, scheduled_date: 'YYYY-MM-DD', variant?: string }
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.profile_ids) || typeof body.curriculum_item_id !== 'string' || typeof body.scheduled_date !== 'string') {
    return NextResponse.json({ error: 'profile_ids[], curriculum_item_id, scheduled_date 필수' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.scheduled_date)) {
    return NextResponse.json({ error: 'scheduled_date 형식: YYYY-MM-DD' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const variant = typeof body.variant === 'string' ? body.variant : 'default';
  const rows = body.profile_ids.map((pid: string) => ({
    profile_id: pid,
    curriculum_item_id: body.curriculum_item_id,
    scheduled_date: body.scheduled_date,
    status: 'pending',
    variant,
  }));

  const { data, error } = await sc
    .from('student_lesson_assignments')
    .upsert(rows, { onConflict: 'profile_id,curriculum_item_id,scheduled_date', ignoreDuplicates: false })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length || 0 });
}
