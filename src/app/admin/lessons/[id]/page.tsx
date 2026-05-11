import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';
import LessonDetailClient from './LessonDetailClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

export const dynamic = 'force-dynamic';

export default async function AdminLessonDetailPage({
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

  const { data: itemRow } = await sc
    .from('curriculum_items')
    .select(`
      id, week_number, session_number, label, title, publish_date, is_released, public_slug,
      curriculum:curricula ( id, subject_slug, title )
    `)
    .eq('id', id)
    .maybeSingle();

  if (!itemRow) notFound();

  // 모든 학생 (배정 폼용)
  const { data: students } = await sc
    .from('profiles')
    .select('id, name, school, grade')
    .order('name', { ascending: true });

  // 현재 배정 학생들
  const { data: assignments } = await sc
    .from('student_lesson_assignments')
    .select(`
      id, scheduled_date, status, variant, notes,
      profile:profiles!inner ( id, name, school )
    `)
    .eq('curriculum_item_id', id)
    .order('scheduled_date', { ascending: false });

  return (
    <LessonDetailClient
      item={itemRow as never}
      students={(students as never) || []}
      assignments={(assignments as never) || []}
    />
  );
}
