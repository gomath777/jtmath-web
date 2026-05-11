import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

// GET: 이 학습 페이지를 배정받은 학생들 목록
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

  const { data, error } = await sc
    .from('student_lesson_assignments')
    .select(`
      id, scheduled_date, status, variant, notes, created_at,
      profile:profiles!inner ( id, name, school )
    `)
    .eq('curriculum_item_id', id)
    .order('scheduled_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data || [] });
}

// POST: 학생 다중 일괄 배정 (메인 액션)
// body: { profile_ids: string[], scheduled_date: 'YYYY-MM-DD', variant?: string, status?: 'pending' | 'released' }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.profile_ids) || typeof body.scheduled_date !== 'string') {
    return NextResponse.json({ error: 'profile_ids[], scheduled_date 필수' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.scheduled_date)) {
    return NextResponse.json({ error: 'scheduled_date 형식: YYYY-MM-DD' }, { status: 400 });
  }
  const status = body.status === 'released' ? 'released' : 'pending';
  const variant = typeof body.variant === 'string' ? body.variant : 'default';

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const rows = body.profile_ids.map((pid: string) => ({
    profile_id: pid,
    curriculum_item_id: id,
    scheduled_date: body.scheduled_date,
    status,
    released_at: status === 'released' ? new Date().toISOString() : null,
    variant,
    notes: typeof body.notes === 'string' ? body.notes : null,
  }));

  const { data, error } = await sc
    .from('student_lesson_assignments')
    .upsert(rows, { onConflict: 'profile_id,curriculum_item_id,scheduled_date', ignoreDuplicates: false })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length || 0, assignments: data });
}
