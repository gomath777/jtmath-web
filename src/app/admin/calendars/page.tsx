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
}

interface CalendarConceptItem {
  id: string;
  title: string;
  subject_slug: string;
  subject_label: string;
  publishDate: string | null;
}

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

  const { data: allSessions } = await sc
    .from('student_sessions')
    .select('id, profile_id, subject_slug, week_number, session_number, label, publish_date, is_released, lecture:lectures(title)');

  const { data: allAssigns } = await sc
    .from('assignments')
    .select('user_id, set_id, published_at')
    .not('set_id', 'is', null)
    .not('published_at', 'is', null);

  const setIds = Array.from(new Set((allAssigns || []).map(a => a.set_id).filter(Boolean)));
  const setsRes = setIds.length > 0
    ? await sc.from('learning_sets').select('id, title, subject_slug, chapter_order').in('id', setIds)
    : { data: [] as Array<{ id: string; title: string; subject_slug: string | null; chapter_order: number | null }> };
  const setMap = new Map((setsRes.data || []).map(s => [s.id, s]));

  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const ymdKst = (iso: string) => new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
  const addDaysKst = (iso: string, days: number) => {
    const d = new Date(new Date(iso).getTime() + days * 86400000 + KST_OFFSET_MS);
    return d.toISOString().slice(0, 10);
  };

  const sessionsByProfile = new Map<string, CalendarSessionEntry[]>();
  for (const s of allSessions || []) {
    const lecture = s.lecture as unknown as { title: string } | null;
    const arr = sessionsByProfile.get(s.profile_id) || [];
    arr.push({
      id: s.id,
      subject_slug: s.subject_slug,
      subject_label: SUBJECT_LABEL[s.subject_slug] || s.subject_slug,
      week_number: s.week_number,
      session_number: s.session_number,
      label: s.label ?? lecture?.title ?? null,
      publishDate: s.publish_date as string | null,
      is_released: s.is_released,
    });
    sessionsByProfile.set(s.profile_id, arr);
  }

  const assignsByProfile = new Map<string, Array<{ set_id: string; published_at: string }>>();
  for (const a of allAssigns || []) {
    if (!a.set_id || !a.published_at) continue;
    const arr = assignsByProfile.get(a.user_id) || [];
    arr.push({ set_id: a.set_id, published_at: a.published_at });
    assignsByProfile.set(a.user_id, arr);
  }

  const conceptsByProfile = new Map<string, CalendarConceptItem[]>();
  for (const [profileId, assigns] of Array.from(assignsByProfile.entries())) {
    const items: CalendarConceptItem[] = [];
    const byWeek = new Map<string, Array<{ setId: string; chapter_order: number | null }>>();
    for (const a of assigns) {
      const set = setMap.get(a.set_id);
      if (!set) continue;
      if (!byWeek.has(a.published_at)) byWeek.set(a.published_at, []);
      byWeek.get(a.published_at)!.push({ setId: a.set_id, chapter_order: set.chapter_order });
    }
    for (const [publishedAt, list] of Array.from(byWeek.entries())) {
      list.sort((x, y) => (x.chapter_order ?? 999) - (y.chapter_order ?? 999));
      const kstYmd = ymdKst(publishedAt);
      const dowKst = new Date(kstYmd + 'T00:00:00Z').getUTCDay();
      const weekOffsets = dowKst === 1 ? [0, 1, 3, 4] : dowKst === 4 ? [0, 1] : [0];
      list.forEach((item, idx) => {
        const set = setMap.get(item.setId);
        if (!set) return;
        const slot = idx % weekOffsets.length;
        const extraWeek = Math.floor(idx / weekOffsets.length);
        const publishDate = addDaysKst(publishedAt, extraWeek * 7 + weekOffsets[slot]);
        items.push({
          id: set.id,
          title: set.title,
          subject_slug: set.subject_slug || '',
          subject_label: SUBJECT_LABEL[set.subject_slug || ''] || set.subject_slug || '',
          publishDate,
        });
      });
    }
    conceptsByProfile.set(profileId, items);
  }

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
