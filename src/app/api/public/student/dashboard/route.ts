import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStudentFromRequest, renewToken, setStudentCookie } from '@/utils/student-auth';

function getTodayKstYmd(): string {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

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
    const releaseMs = Date.UTC(y, m, dm, 12, 0, 0); // KST 21:00 = UTC 12:00

    if (releaseMs > nowMs) {
      return new Date(releaseMs).toISOString();
    }
  }
  return '';
}

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

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

  const { data: profile } = await sc
    .from('profiles')
    .select('id, name, school, exam_date_midterm, exam_date_final')
    .eq('id', student.profileId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 });
  }

  // ─── 새 모델: student_sessions → lectures ───────────────────────────────
  const sessionQuery = sc
    .from('student_sessions')
    .select('id, subject_slug, week_number, session_number, label, publish_date, is_released, variant, lecture:lectures(title)')
    .eq('profile_id', student.profileId)
    .order('subject_slug', { ascending: true })
    .order('week_number', { ascending: true })
    .order('session_number', { ascending: true });

  // 캘린더에는 미릴리즈도 포함(잠금 표시용). 학습 페이지/오늘 할 일 계산은 아래에서 is_released로 필터.
  const { data: studentSessions } = await sessionQuery;

  // subject_slug별로 그룹핑 → 기존 curricula 구조와 호환 (released 세션만)
  const subjectGroups = new Map<string, {
    id: string;
    title: string;
    subject_slug: string;
    sessions: Array<{ id: string; week_number: number; session_number: number; label: string | null; publishDate: string | null }>;
  }>();

  for (const s of studentSessions || []) {
    if (!s.is_released) continue; // curricula 그룹에는 released만
    const subj = s.subject_slug;
    if (!subjectGroups.has(subj)) {
      subjectGroups.set(subj, {
        id: subj,
        title: SUBJECT_LABEL[subj] || subj,
        subject_slug: subj,
        sessions: [],
      });
    }
    const lecture = s.lecture as unknown as { title: string } | null;
    subjectGroups.get(subj)!.sessions.push({
      id: s.id,
      week_number: s.week_number,
      session_number: s.session_number,
      label: s.label ?? lecture?.title ?? null,
      publishDate: s.publish_date as string | null,
    });
  }

  const curriculaWithSessions = Array.from(subjectGroups.values());

  // ─── 4주 캘린더용 flat 세션 목록 (마스터/학생 공통) ──────────────────────
  interface CalendarSessionEntry {
    id: string;
    subject_slug: string;
    subject_label: string;
    week_number: number;
    session_number: number;
    label: string | null;
    publishDate: string | null;
    is_released: boolean;
  }
  const calendarSessions: CalendarSessionEntry[] = (studentSessions || []).map(s => {
    const lecture = s.lecture as unknown as { title: string } | null;
    return {
      id: s.id,
      subject_slug: s.subject_slug,
      subject_label: SUBJECT_LABEL[s.subject_slug] || s.subject_slug,
      week_number: s.week_number,
      session_number: s.session_number,
      label: s.label ?? lecture?.title ?? null,
      publishDate: s.publish_date as string | null,
      is_released: s.is_released,
    };
  });

  // ─── 오답지 카운트 ────────────────────────────────────────────────────────
  const { count: odapjiCount } = await sc
    .from('odapji_files')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', student.profileId)
    .eq('is_read', false);

  // ─── 오늘 할 일 계산 ─────────────────────────────────────────────────────
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
        subject_label: c.title,
        meta: `${c.title} · ${s.week_number}주차 ${s.session_number}차시`,
        isOverdue,
        isToday,
        publishDate,
      });
    }
  }

  // 개념강의 (assignments 기반, 기존 그대로)
  const conceptTasks: TodayTask[] = [];
  const conceptAssignsBase = sc
    .from('assignments')
    .select('set_id, published_at')
    .eq('user_id', student.profileId)
    .not('set_id', 'is', null)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false });
  // 캘린더에는 미래 배정도 포함(잠금 표시). todayTasks는 아래 dueConcepts 필터로 오늘 이전만 사용.
  const { data: conceptAssigns } = await conceptAssignsBase;

  const conceptSetIds = (conceptAssigns || []).map(a => a.set_id).filter(Boolean);

  if (conceptSetIds.length > 0) {
    const { data: conceptSets } = await sc
      .from('learning_sets')
      .select('id, title, subject_slug, chapter_order')
      .in('id', conceptSetIds);

    const setMap = new Map((conceptSets || []).map(s => [s.id, s]));

    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const ymdKst = (iso: string) => new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
    const addDaysKst = (iso: string, days: number) => {
      const d = new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000 + KST_OFFSET_MS);
      return d.toISOString().slice(0, 10);
    };

    const byWeek = new Map<string, Array<{ setId: string; chapter_order: number | null }>>();
    for (const a of conceptAssigns || []) {
      const set = setMap.get(a.set_id);
      if (!set || set.id == null) continue;
      const key = a.published_at as string;
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key)!.push({ setId: a.set_id, chapter_order: set.chapter_order });
    }

    for (const [publishedAt, items] of Array.from(byWeek.entries())) {
      items.sort((a, b) => (a.chapter_order ?? 999) - (b.chapter_order ?? 999));

      // 수업 요일 패턴: 일요일 공개(→월) = 월·화·목·금, 수요일 공개(→목) = 목·금
      const kstYmd = ymdKst(publishedAt);
      const dowKst = new Date(kstYmd + 'T00:00:00Z').getUTCDay();
      const weekOffsets = dowKst === 1 ? [0, 0, 3, 3] : dowKst === 4 ? [0, 0] : [0];

      items.forEach((item, idx) => {
        const set = setMap.get(item.setId);
        if (!set) return;
        const slot = idx % weekOffsets.length;
        const extraWeek = Math.floor(idx / weekOffsets.length);
        const publishDate = addDaysKst(publishedAt, extraWeek * 7 + weekOffsets[slot]);
        conceptTasks.push({
          kind: 'concept',
          id: set.id,
          title: set.title,
          subject_slug: set.subject_slug || '',
          subject_label: SUBJECT_LABEL[set.subject_slug || ''] || set.subject_slug || '',
          meta: '개념강의',
          concept_set_id: set.id,
          publishDate,
        });
      });
    }
  }

  // 우선순위 정렬
  const overdueSessionTasks = sessionTasks
    .filter(t => t.isOverdue)
    .sort((a, b) => (a.publishDate || '').localeCompare(b.publishDate || ''));
  const todaySessionTasks = sessionTasks.filter(t => t.isToday);
  const otherSessionTasks = sessionTasks.filter(t => !t.isOverdue && !t.isToday);

  // 오늘 할 일에는 publishDate가 오늘 이전인 개념강의만 포함 (마스터는 미래 배정도 fetch하므로 여기서 필터)
  const dueConcepts = conceptTasks.filter(t => !t.publishDate || t.publishDate <= todayKst);

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
  if (dueConcepts[0] && prioritized.length < 3) markPush(dueConcepts[0]);
  for (const t of otherSessionTasks) {
    if (prioritized.length >= 3) break;
    markPush(t);
  }
  for (const t of dueConcepts.slice(1)) {
    if (prioritized.length >= 3) break;
    markPush(t);
  }

  const todayTasks = prioritized.slice(0, 3);

  const newToken = await renewToken(student);
  const res = NextResponse.json({
    profile: {
      name: profile.name,
      school: profile.school,
      exam_date_midterm: profile.exam_date_midterm as string | null,
      exam_date_final: profile.exam_date_final as string | null,
    },
    curricula: curriculaWithSessions,
    odapjiCount: odapjiCount || 0,
    todayTasks,
    nextReleaseAt: computeNextReleaseAt(),
    isMaster: student.isMaster ?? false,
    calendarSessions,
    calendarConceptItems: conceptTasks.map(t => ({
      id: t.id,
      title: t.title,
      subject_slug: t.subject_slug,
      subject_label: t.subject_label,
      publishDate: t.publishDate ?? null,
    })),
  });
  return setStudentCookie(res, newToken);
}
