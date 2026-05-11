import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import CalendarsClient from './CalendarsClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

interface CalendarSessionEntry {
  id: string;
  subject_slug: string;
  subject_label: string;
  week_number: number;
  session_number: number;
  label: string | null;
  publishDate: string | null;
  is_released: boolean;
  lessonSlug?: string | null;
}

interface CalendarConceptItem {
  id: string;
  title: string;
  subject_slug: string;
  subject_label: string;
  publishDate: string | null;
}

export const dynamic = 'force-dynamic';

export default async function AdminCalendarsPage() {
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
    profile_id: string;
    profiles: { id: string; name: string; school: string | null; grade: number | null };
  };
  const tokensRes = await sc
    .from('student_tokens')
    .select('slug, profile_id, profiles!inner(id, name, school, grade)')
    .eq('is_active', true);
  const tokens = (tokensRes.data || []) as unknown as TokenRow[];

  // ── 단일 SLA 모델로 전 학생 캘린더 조회 ─────────────────────────────────────
  const { data: slaRows } = await sc
    .from('student_lesson_assignments')
    .select(`
      id, profile_id, scheduled_date, status, variant,
      curriculum_item:curriculum_items!inner (
        id, week_number, session_number, label, title, public_slug,
        curriculum:curricula ( subject_slug, title )
      )
    `);

  const sessionsByProfile = new Map<string, CalendarSessionEntry[]>();
  type Row = {
    id: string;
    profile_id: string;
    scheduled_date: string;
    status: 'pending' | 'released' | 'completed';
    variant: string;
    curriculum_item: {
      id: string;
      week_number: number | null;
      session_number: number | null;
      label: string | null;
      title: string | null;
      public_slug: string | null;
      curriculum: { subject_slug: string; title: string } | null;
    } | null;
  };

  for (const r of ((slaRows as unknown as Row[]) || [])) {
    const ci = r.curriculum_item;
    if (!ci) continue;
    const subj = ci.curriculum?.subject_slug || '';
    const subjectLabel = SUBJECT_LABEL[subj] || ci.curriculum?.title || subj;
    const isReleased = r.status === 'released' || r.status === 'completed';
    const arr = sessionsByProfile.get(r.profile_id) || [];
    arr.push({
      id: r.id,
      subject_slug: subj,
      subject_label: subjectLabel,
      week_number: ci.week_number ?? 0,
      session_number: ci.session_number ?? 0,
      label: ci.title || ci.label,
      publishDate: r.scheduled_date,
      is_released: isReleased,
      lessonSlug: ci.public_slug,
    });
    sessionsByProfile.set(r.profile_id, arr);
  }

  const conceptsByProfile = new Map<string, CalendarConceptItem[]>();

  const students = tokens
    .map(t => ({
      slug: t.slug,
      profileId: t.profile_id,
      name: t.profiles?.name || '(이름없음)',
      school: t.profiles?.school || '',
      grade: t.profiles?.grade ?? null,
      sessions: sessionsByProfile.get(t.profile_id) || [],
      concepts: conceptsByProfile.get(t.profile_id) || [],
    }))
    .sort((a, b) => {
      const ga = a.grade ?? 99;
      const gb = b.grade ?? 99;
      if (ga !== gb) return ga - gb;
      return a.name.localeCompare(b.name, 'ko');
    });

  return <CalendarsClient students={students} />;
}
