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
    .select('profile_id, curricula(id, title, subject_slug)');

  const { data: releasedItems } = await sc
    .from('curriculum_items')
    .select('curriculum_id, week_number, session_number, label, publish_date')
    .eq('is_released', true)
    .order('publish_date', { ascending: false });

  const linksByProfile = new Map<string, { id: string; title: string; subject: string }[]>();
  for (const l of links || []) {
    const c = l.curricula as unknown as { id: string; title: string; subject_slug: string } | null;
    if (!c) continue;
    const arr = linksByProfile.get(l.profile_id) || [];
    arr.push({ id: c.id, title: c.title, subject: c.subject_slug });
    linksByProfile.set(l.profile_id, arr);
  }

  const latestByCurriculum = new Map<string, { label: string; weekSession: string; publishDate: string }>();
  for (const r of releasedItems || []) {
    if (latestByCurriculum.has(r.curriculum_id)) continue;
    latestByCurriculum.set(r.curriculum_id, {
      label: r.label || `${r.week_number}주차 ${r.session_number}차시`,
      weekSession: `${r.week_number}-${r.session_number}`,
      publishDate: r.publish_date,
    });
  }

  const students = tokens.map(t => {
    const profile = t.profiles;
    const studentCurricula = linksByProfile.get(t.profile_id) || [];

    let latestRelease: { curriculumTitle: string; label: string; weekSession: string; publishDate: string } | null = null;
    for (const c of studentCurricula) {
      const l = latestByCurriculum.get(c.id);
      if (!l) continue;
      if (!latestRelease || l.publishDate > latestRelease.publishDate) {
        latestRelease = { curriculumTitle: c.title, ...l };
      }
    }

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
      curricula: studentCurricula.map(c => c.title),
      latestRelease,
    };
  });

  return <StudentsClient students={students} />;
}
