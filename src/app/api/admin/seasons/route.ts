import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

// GET: 시즌 목록 (curricula). 각 시즌에 active 페이지 수·등록 학생 수 포함.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const url = req.nextUrl;
  const subject = url.searchParams.get('subject') || '';

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  let q = sc
    .from('curricula')
    .select('id, title, subject_slug, schedule_pattern, start_date, description, created_at')
    .is('archived_at', null)
    .order('start_date', { ascending: false });

  if (subject) q = q.eq('subject_slug', subject);

  const { data: seasons, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (seasons || []).map(s => s.id);
  const counts: Record<string, { activePages: number; enrolledStudents: number }> = {};
  if (ids.length > 0) {
    const { data: items } = await sc
      .from('curriculum_items')
      .select('curriculum_id')
      .in('curriculum_id', ids)
      .is('archived_at', null);
    (items || []).forEach((it: { curriculum_id: string }) => {
      if (!counts[it.curriculum_id]) counts[it.curriculum_id] = { activePages: 0, enrolledStudents: 0 };
      counts[it.curriculum_id].activePages += 1;
    });

    const { data: enrolls } = await sc
      .from('student_curriculum_links')
      .select('curriculum_id')
      .in('curriculum_id', ids);
    (enrolls || []).forEach((e: { curriculum_id: string }) => {
      if (!counts[e.curriculum_id]) counts[e.curriculum_id] = { activePages: 0, enrolledStudents: 0 };
      counts[e.curriculum_id].enrolledStudents += 1;
    });
  }

  return NextResponse.json({
    seasons: (seasons || []).map(s => ({
      ...s,
      active_pages: counts[s.id]?.activePages || 0,
      enrolled_students: counts[s.id]?.enrolledStudents || 0,
    })),
  });
}

// POST: 새 시즌 생성
// body: { title: string, subject_slug: string, start_date: 'YYYY-MM-DD', description?: string, schedule_pattern?: string }
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== 'string' || typeof body.subject_slug !== 'string' || typeof body.start_date !== 'string') {
    return NextResponse.json({ error: 'title, subject_slug, start_date 필수' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.start_date)) {
    return NextResponse.json({ error: 'start_date 형식: YYYY-MM-DD' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data, error } = await sc.from('curricula').insert({
    title: body.title,
    subject_slug: body.subject_slug,
    start_date: body.start_date,
    description: body.description || null,
    schedule_pattern: body.schedule_pattern || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ season: data });
}
