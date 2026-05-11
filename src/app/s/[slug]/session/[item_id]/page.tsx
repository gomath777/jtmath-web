import { redirect, notFound } from 'next/navigation';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Legacy redirect: /s/{slug}/session/{item_id} → /lesson/{public_slug}
// item_id may be a student_lesson_assignments.id, block_assignments.id, or student_sessions.id
// (compatibility for KakaoTalk URLs sent before the URL migration).
export default async function LegacySessionRedirect({
  params,
}: {
  params: Promise<{ slug: string; item_id: string }>;
}) {
  const { item_id } = await params;

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const publicSlug = await resolvePublicSlug(sc, item_id);
  if (publicSlug) redirect(`/lesson/${publicSlug}`);
  notFound();
}

async function resolvePublicSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sc: any,
  itemId: string,
): Promise<string | null> {
  // 1) student_lesson_assignments.id
  {
    const { data } = await sc
      .from('student_lesson_assignments')
      .select('curriculum_item:curriculum_items ( public_slug )')
      .eq('id', itemId)
      .maybeSingle();
    const ci = (data as unknown as { curriculum_item: { public_slug: string | null } | null } | null)?.curriculum_item;
    if (ci?.public_slug) return ci.public_slug;
  }

  // 2) block_assignments.id → content_blocks.subject_slug + slot_label → curriculum_items
  {
    const { data } = await sc
      .from('block_assignments')
      .select('slot_label, content_block:content_blocks ( subject_slug )')
      .eq('id', itemId)
      .maybeSingle();
    const ba = data as unknown as { slot_label: string | null; content_block: { subject_slug: string } | null } | null;
    if (ba?.content_block?.subject_slug && ba.slot_label) {
      const m = ba.slot_label.match(/^(\d+)주\s*(\d+)차시/);
      if (m) {
        const w = parseInt(m[1]);
        const s = parseInt(m[2]);
        const { data: ci } = await sc
          .from('curriculum_items')
          .select('public_slug, curricula!inner ( subject_slug )')
          .eq('week_number', w)
          .eq('session_number', s)
          .eq('curricula.subject_slug', ba.content_block.subject_slug)
          .not('public_slug', 'is', null)
          .limit(1)
          .maybeSingle();
        const slug = (ci as unknown as { public_slug: string | null } | null)?.public_slug;
        if (slug) return slug;
      }
    }
  }

  // 3) student_sessions.id → subject_slug + week + session → curriculum_items
  {
    const { data: ss } = await sc
      .from('student_sessions')
      .select('subject_slug, week_number, session_number')
      .eq('id', itemId)
      .maybeSingle();
    const row = ss as { subject_slug: string; week_number: number; session_number: number } | null;
    if (row) {
      const { data: ci } = await sc
        .from('curriculum_items')
        .select('public_slug, curricula!inner ( subject_slug )')
        .eq('week_number', row.week_number)
        .eq('session_number', row.session_number)
        .eq('curricula.subject_slug', row.subject_slug)
        .not('public_slug', 'is', null)
        .limit(1)
        .maybeSingle();
      const slug = (ci as unknown as { public_slug: string | null } | null)?.public_slug;
      if (slug) return slug;
    }
  }

  // 4) curriculum_items.id (직접 페이지 id로 접근한 경우)
  {
    const { data } = await sc
      .from('curriculum_items')
      .select('public_slug')
      .eq('id', itemId)
      .maybeSingle();
    const slug = (data as unknown as { public_slug: string | null } | null)?.public_slug;
    if (slug) return slug;
  }

  return null;
}
