import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

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
  if (typeof body.scheduled_date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.scheduled_date)) {
      return NextResponse.json({ error: 'scheduled_date 형식: YYYY-MM-DD' }, { status: 400 });
    }
    updates.scheduled_date = body.scheduled_date;
  }
  if (typeof body.status === 'string' && ['pending', 'released', 'completed'].includes(body.status)) {
    updates.status = body.status;
    if (body.status === 'released' && !body.released_at) {
      updates.released_at = new Date().toISOString();
    }
  }
  if (typeof body.variant === 'string') updates.variant = body.variant;
  if (typeof body.notes === 'string' || body.notes === null) updates.notes = body.notes;

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: '변경할 필드 없음' }, { status: 400 });

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data, error } = await sc.from('student_lesson_assignments').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}

export async function DELETE(
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
  const { error } = await sc.from('student_lesson_assignments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
