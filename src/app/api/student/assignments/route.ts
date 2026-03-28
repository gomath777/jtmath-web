import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET: 학생 본인에게 배정된 학습 목록
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. 직접 배정된 것 (user_id 매칭)
  const { data: directAssignments } = await sc
    .from('assignments')
    .select(`
      id, label, week_number, session_number, published_at, created_at, curriculum_id, curriculum_item_id,
      learning_sets (
        id, title, description, subject_slug, pdf_url,
        learning_set_videos ( id, problem_number, bunny_video_id, title, is_matched, order_index )
      )
    `)
    .eq('user_id', user.id)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  // 2. 강의 배정된 것 (course_id → enrollments 매칭)
  const { data: enrollments } = await sc
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)
    .gte('valid_until', new Date().toISOString());

  const courseIds = (enrollments || []).map((e: { course_id: string }) => e.course_id);

  let courseAssignments: typeof directAssignments = [];
  if (courseIds.length > 0) {
    const { data } = await sc
      .from('assignments')
      .select(`
        id, label, week_number, session_number, published_at, created_at, curriculum_id, curriculum_item_id,
        learning_sets (
          id, title, description, subject_slug, pdf_url,
          learning_set_videos ( id, problem_number, bunny_video_id, title, is_matched, order_index )
        )
      `)
      .in('course_id', courseIds)
      .is('user_id', null)
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    courseAssignments = data;
  }

  // 3. 시청 진행률 가져오기
  const { data: progress } = await sc
    .from('video_watch_progress')
    .select('bunny_video_id, watch_percent, completed')
    .eq('user_id', user.id);

  const progressMap: Record<string, { watch_percent: number; completed: boolean }> = {};
  (progress || []).forEach((p: { bunny_video_id: string; watch_percent: number; completed: boolean }) => {
    progressMap[p.bunny_video_id] = { watch_percent: p.watch_percent, completed: p.completed };
  });

  // 4. 합치기 (중복 제거)
  const allAssignments = [...(directAssignments || []), ...(courseAssignments || [])];
  const seen = new Set<string>();
  const unique = allAssignments.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // 5. 커리큘럼 정보 보강 (차시 배정인 경우 커리큘럼 제목 + 차시 라벨 추가)
  const curriculumIds = [...new Set(unique.filter(a => a.curriculum_id).map(a => a.curriculum_id))];
  const curriculumItemIds = [...new Set(unique.filter(a => a.curriculum_item_id).map(a => a.curriculum_item_id))];

  let curriculaMap: Record<string, { title: string; subject_slug: string }> = {};
  let itemsMap: Record<string, { label: string; week_number: number; session_number: number }> = {};

  if (curriculumIds.length > 0) {
    const { data: curricula } = await sc
      .from('curricula')
      .select('id, title, subject_slug')
      .in('id', curriculumIds);
    (curricula || []).forEach((c: any) => { curriculaMap[c.id] = { title: c.title, subject_slug: c.subject_slug }; });
  }

  if (curriculumItemIds.length > 0) {
    const { data: items } = await sc
      .from('curriculum_items')
      .select('id, label, week_number, session_number')
      .in('id', curriculumItemIds);
    (items || []).forEach((i: any) => { itemsMap[i.id] = { label: i.label, week_number: i.week_number, session_number: i.session_number }; });
  }

  // 배정에 커리큘럼 정보 병합
  const enriched = unique.map(a => ({
    ...a,
    curriculum: a.curriculum_id ? curriculaMap[a.curriculum_id] || null : null,
    curriculum_item: a.curriculum_item_id ? itemsMap[a.curriculum_item_id] || null : null,
  }));

  return NextResponse.json({ assignments: enriched, progress: progressMap });
}
