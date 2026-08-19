import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isSimpleAdminUnlocked } from '@/utils/admin-auth';
import { getStudentFromRequest, renewToken, setStudentCookie } from '@/utils/student-auth';

// 신 시스템 (/st/{slug}) 전용 대시보드 API.
// student_lesson_assignments (SLA) 단일 소스. 옛 student_sessions / block_assignments / curriculum_links
// 자동 백필 없음 — 운영자가 어드민 폼으로 명시적으로 넣은 row만 노출.

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

interface CalendarSessionEntry {
  id: string;
  subject_slug: string;
  subject_label: string;
  week_number: number;
  session_number: number;
  label: string | null;
  publishDate: string | null;
  is_released: boolean;
  lessonSlug: string | null;
}

interface CurriculumGroup {
  id: string;
  title: string;
  subject_slug: string;
  sessions: Array<{
    id: string;
    week_number: number;
    session_number: number;
    label: string | null;
    publishDate: string | null;
    lessonSlug: string | null;
  }>;
}

interface TodayTask {
  kind: 'session' | 'concept';
  id: string;
  title: string;
  subject_slug: string;
  subject_label: string;
  meta: string;
  lessonSlug?: string | null;
  concept_set_id?: string;
  isOverdue?: boolean;
  isToday?: boolean;
  publishDate?: string | null;
}

export async function GET(req: NextRequest) {
  const urlSlug = req.nextUrl.searchParams.get('slug');
  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  let student = await getStudentFromRequest(req);
  if (!student && urlSlug && await isSimpleAdminUnlocked()) {
    const { data: token } = await sc
      .from('student_tokens')
      .select('slug, profile_id, portal_expires_at')
      .eq('slug', urlSlug)
      .eq('is_active', true)
      .single();

    const expired =
      !!token?.portal_expires_at && new Date(token.portal_expires_at).getTime() <= Date.now();

    if (token && !expired) {
      student = {
        profileId: token.profile_id as string,
        slug: token.slug as string,
        exp: Math.floor(Date.now() / 1000) + 86400,
        isMaster: true,
      };
    }
  }

  if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (urlSlug && urlSlug !== student.slug) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await sc
    .from('profiles')
    .select('id, name, school, exam_date_midterm, exam_date_final, review_phase_start')
    .eq('id', student.profileId)
    .single();

  if (!profile) return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 });

  const { count: odapjiCount } = await sc
    .from('odapji_files')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', student.profileId)
    .eq('is_read', false);

  const todayKst = getTodayKstYmd();

  // SLA 단일 조회
  const { data: rowsRaw } = await sc
    .from('student_lesson_assignments')
    .select(`
      id, scheduled_date, status, variant,
      curriculum_item:curriculum_items!inner (
        id, week_number, session_number, label, title, public_slug,
        curriculum:curricula ( subject_slug, title )
      )
    `)
    .eq('profile_id', student.profileId)
    .order('scheduled_date', { ascending: true });

  type Row = {
    id: string;
    scheduled_date: string;
    status: 'pending' | 'released' | 'completed';
    variant: string;
    curriculum_item: {
      id: string;
      week_number: number | null;
      session_number: number | null;
      label: string | null;
      title: string | null;
      public_slug: string | null;
      curriculum: { subject_slug: string; title: string } | null;
    } | null;
  };

  const rows = (rowsRaw as unknown as Row[]) || [];

  const calendarSessions: CalendarSessionEntry[] = [];
  const subjectGroups = new Map<string, CurriculumGroup>();

  for (const r of rows) {
    const ci = r.curriculum_item;
    if (!ci) continue;
    const subj = ci.curriculum?.subject_slug || '';
    const subjectLabel = SUBJECT_LABEL[subj] || ci.curriculum?.title || subj;
    const isReleased = r.status === 'released' || r.status === 'completed';
    const displayLabel = ci.title || ci.label;

    calendarSessions.push({
      id: r.id,
      subject_slug: subj,
      subject_label: subjectLabel,
      week_number: ci.week_number ?? 0,
      session_number: ci.session_number ?? 0,
      label: displayLabel,
      publishDate: r.scheduled_date,
      is_released: isReleased,
      lessonSlug: ci.public_slug,
    });

    if (!isReleased) continue;
    if (!subjectGroups.has(subj)) {
      subjectGroups.set(subj, {
        id: subj || ci.id,
        title: subjectLabel,
        subject_slug: subj,
        sessions: [],
      });
    }
    subjectGroups.get(subj)!.sessions.push({
      id: r.id,
      week_number: ci.week_number ?? 0,
      session_number: ci.session_number ?? 0,
      label: displayLabel,
      publishDate: r.scheduled_date,
      lessonSlug: ci.public_slug,
    });
  }

  const curriculaWithSessions = Array.from(subjectGroups.values());

  // 개념강의(assignments → learning_sets)를 달력 항목으로 변환.
  // SLA(기출)와 별개 트랙이지만, 학생 포탈 달력에는 함께 노출 (레거시 dashboard 라우트와 동일 로직).
  const conceptTasks: TodayTask[] = [];
  const calendarConceptItems: Array<{ id: string; title: string; subject_slug: string; subject_label: string; publishDate: string | null }> = [];

  const { data: conceptAssigns } = await sc
    .from('assignments')
    .select('set_id, published_at')
    .eq('user_id', student.profileId)
    .not('set_id', 'is', null)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false });

  const conceptSetIds = (conceptAssigns || []).map((a: any) => a.set_id).filter(Boolean);

  if (conceptSetIds.length > 0) {
    const { data: conceptSets } = await sc
      .from('learning_sets')
      .select('id, title, subject_slug, chapter_order')
      .in('id', conceptSetIds)
      .eq('kind', 'concept');
    const setMap = new Map((conceptSets || []).map((s: any) => [s.id, s]));
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const ymdKst = (iso: string) => new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
    const addDaysKst = (iso: string, days: number) =>
      new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000 + KST_OFFSET_MS).toISOString().slice(0, 10);

    // 동일 published_at 에 여러 set이 묶이면 월·화 / 목·금 슬롯으로 자동 분배.
    const byWeek = new Map<string, Array<{ setId: string; chapter_order: number | null }>>();
    for (const a of conceptAssigns || []) {
      const set = setMap.get((a as any).set_id);
      if (!set) continue;
      const key = (a as any).published_at as string;
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key)!.push({ setId: (a as any).set_id, chapter_order: (set as any).chapter_order });
    }

    for (const [publishedAt, items] of Array.from(byWeek.entries())) {
      items.sort((a, b) => (a.chapter_order ?? 999) - (b.chapter_order ?? 999));
      const kstYmd = ymdKst(publishedAt);
      const dowKst = new Date(kstYmd + 'T00:00:00Z').getUTCDay();
      const weekOffsets = dowKst === 1 ? [0, 0, 3, 3] : dowKst === 4 ? [0, 0] : [0];
      items.forEach((item, idx) => {
        const set = setMap.get(item.setId);
        if (!set) return;
        const slot = idx % weekOffsets.length;
        const extraWeek = Math.floor(idx / weekOffsets.length);
        const publishDate = addDaysKst(publishedAt, extraWeek * 7 + weekOffsets[slot]);
        const s2 = set as any;
        const entry = {
          id: s2.id, title: s2.title,
          subject_slug: s2.subject_slug || '',
          subject_label: SUBJECT_LABEL[s2.subject_slug || ''] || s2.subject_slug || '',
          publishDate,
        };
        calendarConceptItems.push(entry);
        conceptTasks.push({ kind: 'concept', ...entry, meta: '개념강의', concept_set_id: s2.id });
      });
    }
  }

  const dueConcepts = conceptTasks.filter(t => !t.publishDate || t.publishDate <= todayKst);

  // 오늘 할 일
  const sessionTasks: TodayTask[] = [];
  for (const c of curriculaWithSessions) {
    for (const s of c.sessions) {
      const publishDate = s.publishDate;
      const isOverdue = !!publishDate && publishDate < todayKst;
      const isToday = !!publishDate && publishDate === todayKst;
      sessionTasks.push({
        kind: 'session',
        id: s.id,
        title: s.label || (s.week_number > 0 ? `${s.week_number}주차 ${s.session_number}차시` : ''),
        subject_slug: c.subject_slug,
        subject_label: c.title,
        meta: s.week_number > 0 ? `${c.title} · ${s.week_number}주차 ${s.session_number}차시` : c.title,
        isOverdue,
        isToday,
        publishDate,
        lessonSlug: s.lessonSlug,
      });
    }
  }

  const overdueSessionTasks = sessionTasks.filter(t => t.isOverdue)
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
  for (const t of todaySessionTasks) { if (prioritized.length >= 3) break; markPush(t); }
  if (dueConcepts[0] && prioritized.length < 3) markPush(dueConcepts[0]);
  for (const t of otherSessionTasks) { if (prioritized.length >= 3) break; markPush(t); }

  const res = NextResponse.json({
    profile: {
      name: profile.name, school: profile.school,
      exam_date_midterm: profile.exam_date_midterm as string | null,
      exam_date_final: profile.exam_date_final as string | null,
    },
    // 기말 마무리 단계 배너 (review_phase_start 세팅된 학생만). 종료일은 기말 시험일,
    // 미정(null)이면 캘린더에서 오픈엔드로 렌더.
    calendarPhase: (profile.review_phase_start as string | null)
      ? {
          label: '전체 오답 반복 · 취약유형 보충 · 모의내신',
          startYmd: profile.review_phase_start as string,
          endYmd: (profile.exam_date_final as string | null) ?? null,
        }
      : null,
    curricula: curriculaWithSessions,
    odapjiCount: odapjiCount || 0,
    todayTasks: prioritized.slice(0, 3),
    nextReleaseAt: computeNextReleaseAt(),
    isMaster: student.isMaster ?? false,
    calendarSessions,
    calendarConceptItems,
  });
  if (student.isMaster) return res;
  const newToken = await renewToken(student);
  return setStudentCookie(res, newToken);
}
