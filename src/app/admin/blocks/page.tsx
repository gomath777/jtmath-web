import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import BlocksAdminClient from './BlocksAdminClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

function parseSlotLabel(label: string | null): { week_number: number; session_number: number } | null {
  if (!label) return null;
  const m = label.match(/^(\d+)주\s*(\d+)차시/);
  if (!m) return null;
  return { week_number: parseInt(m[1]), session_number: parseInt(m[2]) };
}

export default async function BlocksAdminPage() {
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

  // 신 모델 block_assignments × content_blocks
  const { data: allBAs } = await (sc as any)
    .from('block_assignments')
    .select(`
      id, profile_id, scheduled_date, slot_label, is_released, variant,
      content_block:content_blocks(id, subject_slug, title, category, unit_number)
    `);

  const sessionsByProfile = new Map<string, any[]>();
  const conceptsByProfile = new Map<string, any[]>();

  for (const ba of allBAs || []) {
    const cb = ba.content_block as { id: string; subject_slug: string; title: string; category: string; unit_number: number | null } | null;
    if (!cb) continue;
    const parsed = parseSlotLabel(ba.slot_label);
    if (cb.category === 'concept') {
      const arr = conceptsByProfile.get(ba.profile_id) || [];
      arr.push({
        id: ba.id,
        title: ba.slot_label ?? cb.title,
        subject_slug: cb.subject_slug,
        subject_label: SUBJECT_LABEL[cb.subject_slug] || cb.subject_slug,
        publishDate: ba.scheduled_date,
      });
      conceptsByProfile.set(ba.profile_id, arr);
    } else {
      const arr = sessionsByProfile.get(ba.profile_id) || [];
      arr.push({
        id: ba.id,
        subject_slug: cb.subject_slug,
        subject_label: SUBJECT_LABEL[cb.subject_slug] || cb.subject_slug,
        week_number: parsed?.week_number ?? 1,
        session_number: parsed?.session_number ?? 1,
        label: ba.slot_label ?? cb.title,
        publishDate: ba.scheduled_date,
        is_released: ba.is_released,
      });
      sessionsByProfile.set(ba.profile_id, arr);
    }
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

  return <BlocksAdminClient students={students} />;
}
