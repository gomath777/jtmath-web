import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStudentFromRequest } from '@/utils/student-auth';

/**
 * 학생에게 배정된 개념강의(learning_sets where kind='concept') 세트 반환.
 *
 * 배정 소스: assignments 테이블
 *   - assignments.user_id = 내 profile_id
 *   - assignments.set_id → learning_sets (kind='concept')
 *
 * 진도: video_watch_progress 참조해서 영상별 시청 상태 반환.
 */
export async function GET(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // 1) 본인에게 직접 배정된 concept set_id 목록
  const { data: assigns } = await sc
    .from('assignments')
    .select('set_id, published_at, label')
    .eq('user_id', student.profileId)
    .not('set_id', 'is', null);

  const setIds = (assigns || []).map(a => a.set_id).filter(Boolean);

  if (setIds.length === 0) {
    return NextResponse.json({ sets: [] });
  }

  // 2) 해당 set들 중 kind='concept'만 조회
  const { data: sets, error } = await sc
    .from('learning_sets')
    .select('id, title, description, subject_slug, pdfs, pdf_url, pdf_filename, chapter_order, kind, created_at')
    .in('id', setIds)
    .eq('kind', 'concept')
    .order('subject_slug', { ascending: true })
    .order('chapter_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const validSetIds = (sets || []).map(s => s.id);
  if (validSetIds.length === 0) {
    return NextResponse.json({ sets: [] });
  }

  // 3) 각 set의 영상 목록
  const { data: videos } = await sc
    .from('learning_set_videos')
    .select('set_id, bunny_video_id, title, problem_number, order_index, is_matched, duration_seconds')
    .in('set_id', validSetIds)
    .order('order_index', { ascending: true });

  // 4) 시청 진도 (내꺼만)
  const bunnyIds = (videos || []).map(v => v.bunny_video_id).filter(Boolean);
  const { data: progress } = bunnyIds.length > 0
    ? await sc
        .from('video_watch_progress')
        .select('bunny_video_id, watch_percent, completed')
        .eq('user_id', student.profileId)
        .in('bunny_video_id', bunnyIds)
    : { data: [] as any[] };

  const progressMap: Record<string, { watch_percent: number; completed: boolean }> = {};
  for (const p of progress || []) {
    progressMap[p.bunny_video_id] = { watch_percent: p.watch_percent ?? 0, completed: !!p.completed };
  }

  // 5) set별 영상 합치고 반환
  const result = (sets || []).map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
    subject_slug: s.subject_slug,
    chapter_order: s.chapter_order,
    pdfs: s.pdfs || (s.pdf_url ? [{ url: s.pdf_url, original_name: s.pdf_filename }] : []),
    videos: (videos || [])
      .filter(v => v.set_id === s.id)
      .map(v => ({
        bunny_video_id: v.bunny_video_id,
        title: v.title,
        lecture_number: v.problem_number,   // 개념강의에서는 '강 번호'로 사용
        order_index: v.order_index,
        duration_seconds: v.duration_seconds,
        progress: v.bunny_video_id ? (progressMap[v.bunny_video_id] || null) : null,
      })),
  }));

  return NextResponse.json({ sets: result });
}
