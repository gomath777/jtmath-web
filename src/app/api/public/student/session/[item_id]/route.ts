import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStudentFromRequest, renewToken, setStudentCookie } from '@/utils/student-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ item_id: string }> }) {
  const student = await getStudentFromRequest(req);
  if (!student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { item_id } = await params;

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // 1. Get curriculum item
  const { data: item, error: itemError } = await sc
    .from('curriculum_items')
    .select('id, curriculum_id, week_number, session_number, label, publish_date, is_released')
    .eq('id', item_id)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: '차시를 찾을 수 없습니다' }, { status: 404 });
  }

  // 2. Check student has access via student_curriculum_links
  const { data: link } = await sc
    .from('student_curriculum_links')
    .select('id')
    .eq('profile_id', student.profileId)
    .eq('curriculum_id', item.curriculum_id)
    .single();

  if (!link) {
    return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
  }

  // 3. Check released
  if (!item.is_released) {
    return NextResponse.json({ error: '아직 공개되지 않은 차시입니다' }, { status: 403 });
  }

  // 4. 학생에게 배정된 variant 조회 (없으면 default)
  const { data: variantRow } = await sc
    .from('student_session_variants')
    .select('variant')
    .eq('profile_id', student.profileId)
    .eq('curriculum_item_id', item_id)
    .maybeSingle();
  const requestedVariant = variantRow?.variant ?? 'default';

  // 5. 블록 조회 — 요청 variant 우선, 없으면 default fallback
  let blocks: unknown[] = [];
  if (requestedVariant !== 'default') {
    const { data: variantBlocks } = await sc
      .from('session_blocks')
      .select('*')
      .eq('curriculum_item_id', item_id)
      .eq('variant', requestedVariant)
      .order('order_index', { ascending: true });
    if (variantBlocks && variantBlocks.length > 0) blocks = variantBlocks;
  }
  if (blocks.length === 0) {
    const { data: defaultBlocks } = await sc
      .from('session_blocks')
      .select('*')
      .eq('curriculum_item_id', item_id)
      .eq('variant', 'default')
      .order('order_index', { ascending: true });
    blocks = defaultBlocks || [];
  }

  // 5. Get video watch progress
  const { data: progress } = await sc
    .from('video_watch_progress')
    .select('bunny_video_id, watch_percent, completed')
    .eq('user_id', student.profileId);

  const progressMap: Record<string, { watch_percent: number; completed: boolean }> = {};
  (progress || []).forEach((p: { bunny_video_id: string; watch_percent: number; completed: boolean }) => {
    progressMap[p.bunny_video_id] = { watch_percent: p.watch_percent, completed: p.completed };
  });

  // 6. Get curriculum info
  const { data: curriculum } = await sc
    .from('curricula')
    .select('title, subject_slug')
    .eq('id', item.curriculum_id)
    .single();

  // Update last_accessed_at on token (마스터 PIN 접근은 학원장 본인이므로 학생 활동에서 제외)
  if (!student.isMaster) {
    await sc
      .from('student_tokens')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('slug', student.slug);
  }

  // Renew cookie
  const newToken = await renewToken(student);
  const res = NextResponse.json({
    item,
    curriculum,
    blocks,
    progress: progressMap,
  });
  return setStudentCookie(res, newToken);
}
