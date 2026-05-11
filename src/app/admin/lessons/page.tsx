import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import LessonsClient from './LessonsClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

export const dynamic = 'force-dynamic';

export default async function AdminLessonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: items } = await sc
    .from('curriculum_items')
    .select(`
      id, week_number, session_number, label, title, publish_date, is_released, public_slug,
      curriculum:curricula!inner ( id, subject_slug, title )
    `)
    .order('week_number', { ascending: true, nullsFirst: false })
    .order('session_number', { ascending: true, nullsFirst: false })
    .limit(500);

  // 각 lesson에 배정된 학생 수 - 별도 쿼리
  const itemIds = (items || []).map((i: { id: string }) => i.id);
  const { data: counts } = itemIds.length > 0
    ? await sc.from('student_lesson_assignments').select('curriculum_item_id').in('curriculum_item_id', itemIds)
    : { data: [] as Array<{ curriculum_item_id: string }> };
  const countMap: Record<string, number> = {};
  (counts || []).forEach((r: { curriculum_item_id: string }) => {
    countMap[r.curriculum_item_id] = (countMap[r.curriculum_item_id] || 0) + 1;
  });

  return <LessonsClient items={(items as never) || []} countMap={countMap} />;
}
