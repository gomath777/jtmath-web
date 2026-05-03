import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStudentFromRequest, renewToken, setStudentCookie } from '@/utils/student-auth';

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

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

  // 1. student_session 조회 (lecture LEFT JOIN — lecture_id 없어도 통과)
  const { data: ss, error: ssError } = await sc
    .from('student_sessions')
    .select('id, profile_id, subject_slug, week_number, session_number, label, publish_date, is_released, variant, lecture:lectures(id, title, subject_slug)')
    .eq('id', item_id)
    .single();

  if (ssError || !ss) {
    return NextResponse.json({ error: '차시를 찾을 수 없습니다' }, { status: 404 });
  }

  // 2. 권한 확인
  if (ss.profile_id !== student.profileId) {
    return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
  }

  // 3. 공개 여부 (마스터는 미릴리즈 세션도 접근 가능)
  if (!ss.is_released && !student.isMaster) {
    return NextResponse.json({ error: '아직 공개되지 않은 차시입니다' }, { status: 403 });
  }

  // 4. variant는 student_sessions에서 직접 사용
  const requestedVariant = ss.variant;
  const lecture = ss.lecture as unknown as { id: string; title: string; subject_slug: string } | null;

  // 5. session_blocks 조회 — lecture_id + variant (fallback → default)
  let blocks: unknown[] = [];
  if (lecture?.id) {
    if (requestedVariant !== 'default') {
      const { data: variantBlocks } = await sc
        .from('session_blocks')
        .select('*')
        .eq('lecture_id', lecture.id)
        .eq('variant', requestedVariant)
        .order('order_index', { ascending: true });
      if (variantBlocks && variantBlocks.length > 0) blocks = variantBlocks;
    }
    if (blocks.length === 0) {
      const { data: defaultBlocks } = await sc
        .from('session_blocks')
        .select('*')
        .eq('lecture_id', lecture.id)
        .eq('variant', 'default')
        .order('order_index', { ascending: true });
      blocks = defaultBlocks || [];
    }
  }

  // 6. 영상 시청 진도
  const { data: progress } = await sc
    .from('video_watch_progress')
    .select('bunny_video_id, watch_percent, completed')
    .eq('user_id', student.profileId);

  const progressMap: Record<string, { watch_percent: number; completed: boolean }> = {};
  (progress || []).forEach((p: { bunny_video_id: string; watch_percent: number; completed: boolean }) => {
    progressMap[p.bunny_video_id] = { watch_percent: p.watch_percent, completed: p.completed };
  });

  if (!student.isMaster) {
    await sc
      .from('student_tokens')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('slug', student.slug);
  }

  const newToken = await renewToken(student);
  const res = NextResponse.json({
    item: {
      id: ss.id,
      week_number: ss.week_number,
      session_number: ss.session_number,
      label: ss.label ?? lecture?.title ?? null,
      publish_date: ss.publish_date,
      is_released: ss.is_released,
    },
    curriculum: {
      title: SUBJECT_LABEL[ss.subject_slug] || ss.subject_slug,
      subject_slug: ss.subject_slug,
    },
    blocks,
    progress: progressMap,
  });
  return setStudentCookie(res, newToken);
}
