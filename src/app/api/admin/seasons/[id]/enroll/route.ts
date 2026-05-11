import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

// POST: 학생 다중 일괄 시즌 등록 + SLA 자동 펼침
// body: { profile_ids: string[] }
// 동작:
//   1. student_curriculum_links INSERT (이미 있으면 스킵)
//   2. 시즌의 archived_at IS NULL + variant_label IS NULL 페이지 → SLA INSERT
//      - SLA.scheduled_date = curriculum_item.publish_date (NULL이면 시즌 등록 스킵)
//      - SLA.status = is_released ? 'released' : 'pending'
//      - SLA.released_at = is_released ? scheduled_date 12:00 KST : NULL
//   3. 충돌(이미 SLA 있음) 시 ON CONFLICT DO NOTHING
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id: seasonId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.profile_ids) || body.profile_ids.length === 0) {
    return NextResponse.json({ error: 'profile_ids[] 필수' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // 1. 시즌 존재 확인
  const { data: season } = await sc
    .from('curricula').select('id, title').eq('id', seasonId).maybeSingle();
  if (!season) return NextResponse.json({ error: '시즌 없음' }, { status: 404 });

  // 2. 시즌의 자동 펼침 대상 페이지 조회 (active + default variant + publish_date 있는 것)
  const { data: items } = await sc
    .from('curriculum_items')
    .select('id, publish_date, is_released')
    .eq('curriculum_id', seasonId)
    .is('archived_at', null)
    .is('variant_label', null)
    .not('publish_date', 'is', null);

  // 3. student_curriculum_links INSERT (멱등)
  const linkRows = body.profile_ids.map((pid: string) => ({
    profile_id: pid,
    curriculum_id: seasonId,
  }));
  await sc
    .from('student_curriculum_links')
    .upsert(linkRows, { onConflict: 'profile_id,curriculum_id', ignoreDuplicates: true });

  // 4. SLA 자동 펼침
  let inserted = 0;
  if (items && items.length > 0) {
    const slaRows: Array<{
      profile_id: string;
      curriculum_item_id: string;
      scheduled_date: string;
      status: string;
      released_at: string | null;
      variant: string;
    }> = [];
    for (const pid of body.profile_ids as string[]) {
      for (const item of items) {
        const isReleased = !!item.is_released;
        slaRows.push({
          profile_id: pid,
          curriculum_item_id: item.id,
          scheduled_date: item.publish_date,
          status: isReleased ? 'released' : 'pending',
          released_at: isReleased
            ? new Date(item.publish_date + 'T12:00:00Z').toISOString()
            : null,
          variant: 'default',
        });
      }
    }
    const { data: ins, error } = await sc
      .from('student_lesson_assignments')
      .upsert(slaRows, { onConflict: 'profile_id,curriculum_item_id,scheduled_date', ignoreDuplicates: true })
      .select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted = ins?.length || 0;
  }

  return NextResponse.json({
    enrolled: body.profile_ids.length,
    sla_inserted: inserted,
    eligible_pages: items?.length || 0,
  });
}

// DELETE: 학생 시즌 등록 해제
// body: { profile_ids: string[], remove_sla?: boolean }
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id: seasonId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.profile_ids)) {
    return NextResponse.json({ error: 'profile_ids[] 필수' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  await sc
    .from('student_curriculum_links')
    .delete()
    .eq('curriculum_id', seasonId)
    .in('profile_id', body.profile_ids);

  let removedSla = 0;
  if (body.remove_sla) {
    const { data: items } = await sc
      .from('curriculum_items')
      .select('id')
      .eq('curriculum_id', seasonId)
      .is('archived_at', null);
    const itemIds = (items || []).map(i => i.id);
    if (itemIds.length > 0) {
      const { data: del } = await sc
        .from('student_lesson_assignments')
        .delete()
        .in('curriculum_item_id', itemIds)
        .in('profile_id', body.profile_ids)
        .select('id');
      removedSla = del?.length || 0;
    }
  }

  return NextResponse.json({ unenrolled: body.profile_ids.length, sla_removed: removedSla });
}
