import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';
import SeasonDetailClient from './SeasonDetailClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

export const dynamic = 'force-dynamic';

export default async function AdminSeasonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: season } = await sc
    .from('curricula')
    .select('id, title, subject_slug, schedule_pattern, start_date, description')
    .eq('id', id)
    .maybeSingle();
  if (!season) notFound();

  const { data: items } = await sc
    .from('curriculum_items')
    .select('id, week_number, session_number, label, title, unit_name, category, variant_label, publish_date, public_slug')
    .eq('curriculum_id', id)
    .is('archived_at', null)
    .order('week_number', { ascending: true, nullsFirst: false })
    .order('session_number', { ascending: true, nullsFirst: false })
    .order('sort_order', { ascending: true, nullsFirst: true });

  const { data: students } = await sc
    .from('profiles')
    .select('id, name, school, grade')
    .order('name', { ascending: true });

  const { data: enrolled } = await sc
    .from('student_curriculum_links')
    .select('profile_id, enrolled_at')
    .eq('curriculum_id', id);

  return (
    <SeasonDetailClient
      season={season as never}
      items={(items as never) || []}
      students={(students as never) || []}
      enrolledIds={(enrolled as Array<{ profile_id: string }> || []).map(e => e.profile_id)}
    />
  );
}
