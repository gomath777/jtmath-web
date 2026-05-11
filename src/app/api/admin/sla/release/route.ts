import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

// POST: 일괄 release. body 두 가지 형태:
//   { ids: string[] } — 특정 SLA들만
//   { scheduled_date: 'YYYY-MM-DD', subject?: 'gs1' } — 그날 모든 SLA
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const releasedAt = new Date().toISOString();

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const { data, error } = await sc
      .from('student_lesson_assignments')
      .update({ status: 'released', released_at: releasedAt })
      .in('id', body.ids)
      .eq('status', 'pending')
      .select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ released: data?.length || 0 });
  }

  if (typeof body.scheduled_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.scheduled_date)) {
    let q = sc
      .from('student_lesson_assignments')
      .update({ status: 'released', released_at: releasedAt })
      .eq('scheduled_date', body.scheduled_date)
      .eq('status', 'pending');
    if (typeof body.subject === 'string' && body.subject) {
      // subject 필터는 단순 UPDATE로 불가 → 먼저 ID 조회 후 update
      const { data: targets } = await sc
        .from('student_lesson_assignments')
        .select('id, curriculum_item:curriculum_items!inner ( curriculum:curricula!inner ( subject_slug ) )')
        .eq('scheduled_date', body.scheduled_date)
        .eq('status', 'pending');
      type Row = { id: string; curriculum_item: { curriculum: { subject_slug: string } } | null };
      const ids = ((targets as unknown as Row[]) || [])
        .filter(r => r.curriculum_item?.curriculum?.subject_slug === body.subject)
        .map(r => r.id);
      if (ids.length === 0) return NextResponse.json({ released: 0 });
      q = sc
        .from('student_lesson_assignments')
        .update({ status: 'released', released_at: releasedAt })
        .in('id', ids);
    }
    const { data, error } = await q.select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ released: data?.length || 0 });
  }

  return NextResponse.json({ error: 'ids[] 또는 scheduled_date 필수' }, { status: 400 });
}
