import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import SeasonsClient from './SeasonsClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

export const dynamic = 'force-dynamic';

export default async function AdminSeasonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: seasons } = await sc
    .from('curricula')
    .select('id, title, subject_slug, schedule_pattern, start_date, description, created_at')
    .order('start_date', { ascending: false });

  const ids = (seasons || []).map((s: { id: string }) => s.id);
  const stats: Record<string, { activePages: number; enrolledStudents: number }> = {};
  if (ids.length > 0) {
    const { data: items } = await sc
      .from('curriculum_items')
      .select('curriculum_id')
      .in('curriculum_id', ids)
      .is('archived_at', null);
    (items || []).forEach((it: { curriculum_id: string }) => {
      if (!stats[it.curriculum_id]) stats[it.curriculum_id] = { activePages: 0, enrolledStudents: 0 };
      stats[it.curriculum_id].activePages += 1;
    });
    const { data: enrolls } = await sc
      .from('student_curriculum_links')
      .select('curriculum_id')
      .in('curriculum_id', ids);
    (enrolls || []).forEach((e: { curriculum_id: string }) => {
      if (!stats[e.curriculum_id]) stats[e.curriculum_id] = { activePages: 0, enrolledStudents: 0 };
      stats[e.curriculum_id].enrolledStudents += 1;
    });
  }

  const enriched = (seasons || []).map((s: { id: string; title: string; subject_slug: string | null; schedule_pattern: string | null; start_date: string; description: string | null }) => ({
    ...s,
    active_pages: stats[s.id]?.activePages || 0,
    enrolled_students: stats[s.id]?.enrolledStudents || 0,
  }));

  return <SeasonsClient seasons={enriched} />;
}
