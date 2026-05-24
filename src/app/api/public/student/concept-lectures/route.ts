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

  // 5) set별 영상 합치고 반환 (assignment의 published_at도 같이 — 시즌 캘린더용)
  const publishedAtBySet = new Map<string, string | null>();
  for (const a of assigns || []) {
    if (a.set_id) publishedAtBySet.set(a.set_id, a.published_at as string | null);
  }

  // 차시별 교재 override (assignments.textbook_id) — 마이그레이션 전엔 컬럼이 없어 에러날 수 있으므로
  // 별도·내성 조회: 실패하면 빈 맵으로 폴백(주교재만 적용).
  const overrideBookBySet = new Map<string, string | null>();
  {
    const { data: ovr } = await sc
      .from('assignments')
      .select('set_id, textbook_id')
      .eq('user_id', student.profileId)
      .not('set_id', 'is', null)
      .not('textbook_id', 'is', null);
    for (const a of ovr || []) overrideBookBySet.set(a.set_id, (a as any).textbook_id ?? null);
  }

  // 5-1) 교재 복습 해상도: assignment override → 학생 주교재(과목별) → 과목 기본교재 → (교재×차시) 쪽수
  const { data: studentBooks } = await sc
    .from('student_textbooks')
    .select('subject_slug, textbook_id')
    .eq('profile_id', student.profileId);
  const bookBySubject = new Map<string, string>();
  for (const b of studentBooks || []) bookBySubject.set(b.subject_slug, b.textbook_id);

  // 과목 기본교재 (명시 지정 없으면 폴백) — 내성 조회(컬럼 없으면 빈 맵)
  const defaultBySubject = new Map<string, string>();
  {
    const subjects = Array.from(new Set((sets || []).map(s => s.subject_slug || '').filter(Boolean)));
    if (subjects.length > 0) {
      const { data: defaults } = await sc
        .from('textbooks')
        .select('subject_slug, id')
        .in('subject_slug', subjects)
        .eq('is_default', true);
      for (const d of defaults || []) defaultBySubject.set(d.subject_slug, d.id);
    }
  }

  // 각 set에 적용할 교재 결정
  const bookBySet = new Map<string, string>();
  for (const s of sets || []) {
    const subj = s.subject_slug || '';
    const tb = overrideBookBySet.get(s.id) || bookBySubject.get(subj) || defaultBySubject.get(subj);
    if (tb) bookBySet.set(s.id, tb);
  }

  const usedBookIds = Array.from(new Set(Array.from(bookBySet.values())));
  const bookName = new Map<string, string>();
  const pagesByKey = new Map<string, { page_start: number | null; page_end: number | null; note: string | null }>();
  if (usedBookIds.length > 0) {
    const { data: books } = await sc.from('textbooks').select('id, name').in('id', usedBookIds);
    for (const b of books || []) bookName.set(b.id, b.name);
    const { data: pages } = await sc
      .from('textbook_chapter_pages')
      .select('textbook_id, learning_set_id, page_start, page_end, note')
      .in('textbook_id', usedBookIds)
      .in('learning_set_id', validSetIds);
    for (const p of pages || []) {
      pagesByKey.set(`${p.textbook_id}:${p.learning_set_id}`, {
        page_start: p.page_start, page_end: p.page_end, note: p.note,
      });
    }
  }

  function buildReview(setId: string) {
    const tb = bookBySet.get(setId);
    if (!tb) return null; // 교재 미지정 → 컴포넌트가 description 폴백
    const name = bookName.get(tb) || null;
    const pg = pagesByKey.get(`${tb}:${setId}`);
    if (pg && pg.page_start != null && pg.page_end != null) {
      let label = `${name ? name + ' ' : ''}p.${pg.page_start}~${pg.page_end}`;
      if (pg.note) label += ` · ${pg.note}`;
      return { textbookName: name, pageStart: pg.page_start, pageEnd: pg.page_end, note: pg.note, label };
    }
    // 교재만 있고 쪽수 미빌드 → 단원 안내 폴백
    return { textbookName: name, pageStart: null, pageEnd: null, note: pg?.note ?? null, label: `${name ? name + ' ' : ''}해당 단원 풀이` };
  }

  const result = (sets || []).map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
    review: buildReview(s.id),
    subject_slug: s.subject_slug,
    chapter_order: s.chapter_order,
    published_at: publishedAtBySet.get(s.id) || null,
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
