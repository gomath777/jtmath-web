import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const url = req.nextUrl;
  const subject = url.searchParams.get('subject') || '';
  const search = url.searchParams.get('search') || '';
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  let q = sc
    .from('curriculum_items')
    .select(`
      id, week_number, session_number, label, title, publish_date, is_released, public_slug,
      curriculum:curricula!inner ( id, subject_slug, title )
    `, { count: 'exact' })
    .order('week_number', { ascending: true, nullsFirst: false })
    .order('session_number', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (subject) q = q.eq('curriculum.subject_slug', subject);
  if (search) q = q.or(`label.ilike.%${search}%,title.ilike.%${search}%,public_slug.ilike.%${search}%`);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [], total: count || 0, offset, limit });
}
