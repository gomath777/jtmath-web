import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import PortalClient from './PortalClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

export default async function AdminPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  // Fetch with service role to bypass RLS
  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Students with tokens
  const { data: tokens } = await sc
    .from('student_tokens')
    .select('slug, is_active, last_accessed_at, profile_id, profiles!inner(id, name, school, phone_student)')
    .order('created_at', { ascending: false });

  // Get all curriculum links
  const { data: links } = await sc
    .from('student_curriculum_links')
    .select('profile_id, curricula(id, title)');

  // Get odapji counts per student
  const { data: odapjiCounts } = await sc
    .from('odapji_files')
    .select('profile_id, is_read');

  // Get session release summary (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: recentReleases } = await sc
    .from('curriculum_items')
    .select('id, curriculum_id, week_number, session_number, label, is_released, publish_date, curricula(title)')
    .gte('publish_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('publish_date', { ascending: false });

  // Transform data for client
  const students = (tokens || []).map(t => {
    const profile = t.profiles as unknown as { id: string; name: string; school: string; phone_student: string };
    const studentLinks = (links || []).filter(l => l.profile_id === t.profile_id);
    const odapji = (odapjiCounts || []).filter(o => o.profile_id === t.profile_id);
    const unread = odapji.filter(o => !o.is_read).length;

    return {
      profileId: profile?.id || '',
      name: profile?.name || '(이름없음)',
      school: profile?.school || '',
      phone: profile?.phone_student || '',
      slug: t.slug,
      active: t.is_active,
      lastAccessedAt: t.last_accessed_at,
      curricula: studentLinks.map(l => {
        const c = l.curricula as unknown as { id: string; title: string };
        return c?.title || '';
      }).filter(Boolean),
      odapjiTotal: odapji.length,
      odapjiUnread: unread,
    };
  });

  const releases = (recentReleases || []).map(r => {
    const c = r.curricula as unknown as { title: string };
    return {
      id: r.id,
      label: r.label || `${r.week_number}주차 ${r.session_number}차시`,
      curriculumTitle: c?.title || '',
      weekSession: `${r.week_number}-${r.session_number}`,
      publishDate: r.publish_date,
      isReleased: r.is_released,
    };
  });

  return <PortalClient students={students} releases={releases} />;
}
