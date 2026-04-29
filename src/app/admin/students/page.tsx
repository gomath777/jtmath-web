import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import StudentsClient from './StudentsClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

export default async function AdminStudentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  type TokenRow = {
    slug: string;
    is_active: boolean;
    last_accessed_at: string | null;
    student_type: string;
    profile_id: string;
    profiles: {
      id: string;
      name: string;
      school: string | null;
      grade: number | null;
      phone_student: string | null;
    };
  };
  const tokensRes = await sc
    .from('student_tokens')
    .select(
      'slug, is_active, last_accessed_at, student_type, profile_id, ' +
      'profiles!inner(id, name, school, grade, phone_student)',
    )
    .order('created_at', { ascending: false });
  const tokens = (tokensRes.data || []) as unknown as TokenRow[];

  const { data: links } = await sc
    .from('student_curriculum_links')
    .select('profile_id, curricula(id, title, subject_slug, start_date)');

  const { data: allItems } = await sc
    .from('curriculum_items')
    .select('curriculum_id, week_number, session_number, label, publish_date, is_released')
    .order('week_number', { ascending: true })
    .order('session_number', { ascending: true });

  type CurriculumMeta = { id: string; title: string; subject: string; startDate: string | null };
  const linksByProfile = new Map<string, CurriculumMeta[]>();
  for (const l of links || []) {
    const c = l.curricula as unknown as { id: string; title: string; subject_slug: string; start_date: string | null } | null;
    if (!c) continue;
    const arr = linksByProfile.get(l.profile_id) || [];
    arr.push({ id: c.id, title: c.title, subject: c.subject_slug, startDate: c.start_date });
    linksByProfile.set(l.profile_id, arr);
  }

  type CurriculumStats = {
    total: number;
    released: number;
    nextItem: { weekSession: string; label: string; publishDate: string | null } | null;
    latestReleased: { weekSession: string; label: string; publishDate: string | null } | null;
  };
  const statsByCurriculum = new Map<string, CurriculumStats>();
  for (const item of allItems || []) {
    const stat = statsByCurriculum.get(item.curriculum_id) || {
      total: 0,
      released: 0,
      nextItem: null,
      latestReleased: null,
    };
    stat.total += 1;
    const itemRef = {
      weekSession: `${item.week_number}-${item.session_number}`,
      label: item.label || `${item.week_number}주차 ${item.session_number}차시`,
      publishDate: item.publish_date,
    };
    if (item.is_released) {
      stat.released += 1;
      stat.latestReleased = itemRef;
    } else if (!stat.nextItem) {
      stat.nextItem = itemRef;
    }
    statsByCurriculum.set(item.curriculum_id, stat);
  }

  const students = tokens.map(t => {
    const profile = t.profiles;
    const studentCurricula = linksByProfile.get(t.profile_id) || [];

    const curriculaProgress = studentCurricula.map(c => {
      const stat = statsByCurriculum.get(c.id) || { total: 0, released: 0, nextItem: null, latestReleased: null };
      return {
        id: c.id,
        title: c.title,
        subject: c.subject,
        startDate: c.startDate,
        total: stat.total,
        released: stat.released,
        nextItem: stat.nextItem,
        latestReleased: stat.latestReleased,
      };
    });

    return {
      profileId: profile?.id || '',
      name: profile?.name || '(이름없음)',
      school: profile?.school || '',
      grade: profile?.grade ?? null,
      phone: profile?.phone_student || '',
      slug: t.slug,
      studentType: t.student_type || 'online',
      active: t.is_active,
      lastAccessedAt: t.last_accessed_at,
      curriculaProgress,
    };
  });

  return <StudentsClient students={students} />;
}
