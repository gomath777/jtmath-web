import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET: 학생용 차시 블록 조회
export async function GET(req: NextRequest, { params }: { params: Promise<{ item_id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { item_id } = await params;

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. curriculum_item 정보 가져오기
  const { data: item, error: itemError } = await sc
    .from('curriculum_items')
    .select('id, curriculum_id, week_number, session_number, label, publish_date')
    .eq('id', item_id)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: '차시를 찾을 수 없습니다' }, { status: 404 });
  }

  // 2. 학생이 이 커리큘럼에 접근 권한이 있는지 확인
  // 직접 배정 확인
  const { data: directAssignment } = await sc
    .from('assignments')
    .select('id')
    .eq('user_id', user.id)
    .eq('curriculum_id', item.curriculum_id)
    .limit(1);

  // 강의 기반 배정 확인
  const { data: courseAssignment } = await sc
    .from('assignments')
    .select('id, course_id')
    .eq('curriculum_id', item.curriculum_id)
    .is('user_id', null)
    .limit(1);

  let hasAccess = (directAssignment && directAssignment.length > 0);

  if (!hasAccess && courseAssignment && courseAssignment.length > 0) {
    const courseIds = courseAssignment.map(a => a.course_id).filter(Boolean);
    if (courseIds.length > 0) {
      const { data: enrollment } = await sc
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .in('course_id', courseIds)
        .gte('valid_until', new Date().toISOString())
        .limit(1);
      hasAccess = (enrollment && enrollment.length > 0);
    }
  }

  if (!hasAccess) {
    return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
  }

  // 3. 공개일 확인
  if (item.publish_date && new Date(item.publish_date + 'T00:00:00') > new Date()) {
    return NextResponse.json({ error: '아직 공개되지 않은 차시입니다' }, { status: 403 });
  }

  // 4. 블록 조회
  const { data: blocks, error: blocksError } = await sc
    .from('session_blocks')
    .select('*')
    .eq('curriculum_item_id', item_id)
    .order('order_index', { ascending: true });

  if (blocksError) {
    return NextResponse.json({ error: blocksError.message }, { status: 500 });
  }

  // 5. 영상 시청 진행률
  const { data: progress } = await sc
    .from('video_watch_progress')
    .select('bunny_video_id, watch_percent, completed')
    .eq('user_id', user.id);

  const progressMap: Record<string, { watch_percent: number; completed: boolean }> = {};
  (progress || []).forEach((p: { bunny_video_id: string; watch_percent: number; completed: boolean }) => {
    progressMap[p.bunny_video_id] = { watch_percent: p.watch_percent, completed: p.completed };
  });

  // 6. 커리큘럼 제목
  const { data: curriculum } = await sc
    .from('curricula')
    .select('title, subject_slug')
    .eq('id', item.curriculum_id)
    .single();

  return NextResponse.json({
    item,
    curriculum,
    blocks: blocks || [],
    progress: progressMap,
  });
}
