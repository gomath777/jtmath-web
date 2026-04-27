import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStudentFromRequest, renewToken, setStudentCookie } from '@/utils/student-auth';

/**
 * KST(UTC+9) 기준 오늘 날짜 'YYYY-MM-DD' 문자열.
 */
function getTodayKstYmd(): string {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 다음 정규 배포 시각(일·수요일 21:00 KST)의 ISO 문자열.
 */
function computeNextReleaseAt(): string {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const nowKstMs = nowMs + KST_OFFSET_MS;

  for (let i = 0; i < 8; i++) {
    const kstDate = new Date(nowKstMs + i * 86400000);
    const dow = kstDate.getUTCDay();
    if (dow !== 0 && dow !== 3) continue;

    const y = kstDate.getUTCFullYear();
    const m = kstDate.getUTCMonth();
    const dm = kstDate.getUTCDate();
    // KST 21:00 == UTC 12:00
    const releaseMs = Date.UTC(y, m, dm, 12, 0, 0);

    if (releaseMs > nowMs) {
      return new Date(releaseMs).toISOString();
    }
  }
  return '';
}

export async function GET(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const urlSlug = req.nextUrl.searchParams.get('slug');
  if (urlSlug && urlSlug !== student.slug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Get student profile
  const { data: profile } = await sc
    .from('profiles')
    .select('id, name, school, exam_date_midterm, exam_date_final')
    .eq('id', student.profileId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 });
  }

  const profilePayload = {
    name: profile.name,
    school: profile.school,
    exam_date_midterm: profile.exam_date_midterm as string | null,
    exam_date_final: profile.exam_date_final as string | null,
  };

  // Get assigned curricula
  const { data: links } = await sc
    .from('student_curriculum_links')
    .select('curriculum_id')
    .eq('profile_id', student.profileId);

  const curriculumIds = (links || []).map(l => l.curriculum_id);

  if (curriculumIds.length === 0) {
    const newToken = await renewToken(student);
    const res = NextResponse.json({
      profile: profilePayload,
      curricula: [],
      odapjiCount: 0,
      todayTasks: [],
      nextReleaseAt: computeNextReleaseAt(),
    });
    return setStudentCookie(res, newToken);
  }

  const { data: curricula } = await sc
    .from('curricula')
    .select('id, title, subject_slug, start_date')
    .in('id', curriculumIds);

  const { data: items } = await sc
    .from('curriculum_items')
    .select('id, curriculum_id, week_number, session_number, label, publish_date, is_released')
    .in('curriculum_id', curriculumIds)
    .eq('is_released', true)
    .order('week_number', { ascending: true })
    .order('session_number', { ascending: true });

  // ─── 세션 구성 ─────────────────────────────────────
  // 학습 완료(status) / 영상 시청률(videoProgress) 추적은 대시보드에서 제거.
  // 이유: 영상 시청 ≠ 학습 완료 (학생은 모르는 문제만 해설강의 시청).
  // 학습 완료 추적은 운영자가 매쓰플랫 앱에서 개별 관리.
  // 향후 개념강의(여름방학) 도입 시 재평가.
  const curriculaWithSessions = (curricula || []).map(c => {
    const sessionItems = (items || []).filter(i => i.curriculum_id === c.id);
    return {
      ...c,
      sessions: sessionItems.map(item => ({
        id: item.id,
        week_number: item.week_number,
        session_number: item.session_number,
        label: item.label,
        publishDate: (item.publish_date as string | null) ?? null,
      })),
    };
  });

  // Count unread odapji
  const { count: odapjiCount } = await sc
    .from('odapji_files')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', student.profileId)
    .eq('is_read', false);

  // ─── "오늘 할 일" 계산 ─────────────────────────────────────
  // 단순화: is_released=true 세션 전부를 후보로.
  // 우선순위: 밀린(지난 주) 학습페이지 → 오늘 학습페이지 → 개념강의 → 나머지
  const SUBJECT_LABEL: Record<string, string> = {
    gs1: '공통수학1', gs2: '공통수학2',
    ds: '대수', ds2: '대수',
    mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
    ht: '확률과통계', gi: '기하', s2: '수학2',
  };

  interface TodayTask {
    kind: 'session' | 'concept';
    id: string;
    title: string;
    subject_slug: string;
    subject_label: string;
    meta: string;
    concept_set_id?: string;
    isOverdue?: boolean;
    isToday?: boolean;
    publishDate?: string | null;
  }
  // 세션 URL은 basePath를 모르는 API가 아닌 클라이언트가 조립: `${basePath}/${slug}/session/${id}`

  const todayKst = getTodayKstYmd();

  const sessionTasks: TodayTask[] = [];
  for (const c of curriculaWithSessions) {
    for (const s of c.sessions) {
      const publishDate = s.publishDate;
      const isOverdue = !!publishDate && publishDate < todayKst;
      const isToday = !!publishDate && publishDate === todayKst;
      sessionTasks.push({
        kind: 'session',
        id: s.id,
        title: s.label || `${s.week_number}주차 ${s.session_number}차시`,
        subject_slug: c.subject_slug,
        subject_label: SUBJECT_LABEL[c.subject_slug] || c.subject_slug,
        meta: `${c.title} · ${s.week_number}주차 ${s.session_number}차시`,
        isOverdue,
        isToday,
        publishDate,
      });
    }
  }

  // 2) 개념강의 후보 (완료 스킵 없음)
  const conceptTasks: TodayTask[] = [];
  const { data: conceptAssigns } = await sc
    .from('assignments')
    .select('set_id, published_at')
    .eq('user_id', student.profileId)
    .not('set_id', 'is', null)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  const conceptSetIds = (conceptAssigns || []).map(a => a.set_id).filter(Boolean);

  if (conceptSetIds.length > 0) {
    const { data: conceptSets } = await sc
      .from('learning_sets')
      .select('id, title, subject_slug, chapter_order')
      .in('id', conceptSetIds)
      .eq('kind', 'concept')
      .order('chapter_order', { ascending: true });

    const publishOrder = new Map(
      (conceptAssigns || []).map((a, idx) => [a.set_id, idx]),
    );
    const sortedSets = (conceptSets || []).slice().sort(
      (a, b) => (publishOrder.get(a.id) ?? 999) - (publishOrder.get(b.id) ?? 999),
    );

    for (const set of sortedSets) {
      conceptTasks.push({
        kind: 'concept',
        id: set.id,
        title: set.title,
        subject_slug: set.subject_slug || '',
        subject_label: SUBJECT_LABEL[set.subject_slug || ''] || set.subject_slug || '',
        meta: '개념강의',
        concept_set_id: set.id,
      });
    }
  }

  // 우선순위 정렬
  const overdueSessionTasks = sessionTasks
    .filter(t => t.isOverdue)
    .sort((a, b) => (a.publishDate || '').localeCompare(b.publishDate || ''));
  const todaySessionTasks = sessionTasks.filter(t => t.isToday);
  const otherSessionTasks = sessionTasks.filter(t => !t.isOverdue && !t.isToday);

  const prioritized: TodayTask[] = [];
  const pushed = new Set<string>();
  const markPush = (t: TodayTask) => {
    const key = `${t.kind}:${t.id}`;
    if (pushed.has(key)) return;
    prioritized.push(t);
    pushed.add(key);
  };

  if (overdueSessionTasks[0]) markPush(overdueSessionTasks[0]);
  for (const t of todaySessionTasks) {
    if (prioritized.length >= 3) break;
    markPush(t);
  }
  if (conceptTasks[0] && prioritized.length < 3) markPush(conceptTasks[0]);
  for (const t of otherSessionTasks) {
    if (prioritized.length >= 3) break;
    markPush(t);
  }
  for (const t of conceptTasks.slice(1)) {
    if (prioritized.length >= 3) break;
    markPush(t);
  }

  const todayTasks = prioritized.slice(0, 3);

  const newToken = await renewToken(student);
  const res = NextResponse.json({
    profile: profilePayload,
    curricula: curriculaWithSessions,
    odapjiCount: odapjiCount || 0,
    todayTasks,
    nextReleaseAt: computeNextReleaseAt(),
  });
  return setStudentCookie(res, newToken);
}
