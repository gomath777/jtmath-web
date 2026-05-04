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

// "1주 1차시" → { week_number: 1, session_number: 1 }
function parseSlotLabel(label: string | null): { week_number: number; session_number: number } | null {
  if (!label) return null;
  const m = label.match(/^(\d+)주\s*(\d+)차시/);
  if (!m) return null;
  return { week_number: parseInt(m[1]), session_number: parseInt(m[2]) };
}

// ─── NEW MODEL: block_assignments ─────────────────────────────────────────────

async function getDashboardFromBlocks(
  sc: any,
  profileId: string,
  todayKst: string,
) {
  const { data: basRaw, error } = await (sc as any)
    .from('block_assignments')
    .select(`
      id,
      scheduled_date,
      slot_label,
      is_released,
      variant,
      notes,
      content_block:content_blocks (
        id,
        subject_slug,
        title,
        category,
        unit_number
      )
    `)
    .eq('profile_id', profileId)
    .order('scheduled_date', { ascending: true });

  if (error) throw new Error(`block_assignments 조회 실패: ${(error as any).message}`);

  const bas = basRaw as Array<{
    id: string;
    scheduled_date: string;
    slot_label: string | null;
    is_released: boolean;
    variant: string;
    notes: string | null;
    content_block: { id: string; subject_slug: string; title: string; category: string; unit_number: number | null } | null;
  }>;

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
  interface CalendarConceptItem {
    id: string;
    title: string;
    subject_slug: string;
    subject_label: string;
    publishDate: string | null;
  }

  const calendarSessions: CalendarSessionEntry[] = [];
  const calendarConceptItems: CalendarConceptItem[] = [];

  // subject_slug 그룹 (released non-concept 블럭, curricula 탭용)
  const subjectGroups = new Map<string, {
    id: string;
    title: string;
    subject_slug: string;
    sessions: Array<{ id: string; week_number: number; session_number: number; label: string | null; publishDate: string | null }>;
  }>();

  for (const ba of bas ?? []) {
    const cb = ba.content_block as unknown as {
      id: string; subject_slug: string; title: string; category: string; unit_number: number | null;
    } | null;
    if (!cb) continue;

    const parsed = parseSlotLabel(ba.slot_label);
    const week_number = parsed?.week_number ?? 0;
    const session_number = parsed?.session_number ?? 0;
    const publishDate = ba.scheduled_date as string | null;
    const label = ba.slot_label ? `${ba.slot_label} ${cb.title}` : cb.title;

    // 신 모델에서는 category(concept/gichul/shimhwa) 구분 없이 모두 세션으로 처리.
    // concept BA들도 block_contents에 컨텐츠가 있으므로 /session/<ba.id> 경로로 연결.
    calendarSessions.push({
      id: ba.id,
      subject_slug: cb.subject_slug,
      subject_label: SUBJECT_LABEL[cb.subject_slug] || cb.subject_slug,
      week_number,
      session_number,
      label: ba.slot_label ?? cb.title,
      publishDate,
      is_released: ba.is_released,
    });

    // curricula 그룹 (released only)
    if (!ba.is_released) continue;
    const subj = cb.subject_slug;
    if (!subjectGroups.has(subj)) {
      subjectGroups.set(subj, {
        id: subj,
        title: SUBJECT_LABEL[subj] || subj,
        subject_slug: subj,
        sessions: [],
      });
    }
    subjectGroups.get(subj)!.sessions.push({
      id: ba.id,
      week_number,
      session_number,
      label,
      publishDate,
    });
  }

  const curriculaWithSessions = Array.from(subjectGroups.values());

  // 오늘 할 일
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
      });
    }
  }

  const conceptTasks: TodayTask[] = calendarConceptItems.map(c => ({
    kind: 'concept' as const,
    id: c.id,
    title: c.title,
    subject_slug: c.subject_slug,
    subject_label: c.subject_label,
    meta: '개념강의',
    concept_set_id: c.id,
    publishDate: c.publishDate,
  }));

  const overdueSessionTasks = sessionTasks.filter(t => t.isOverdue)
    .sort((a, b) => (a.publishDate || '').localeCompare(b.publishDate || ''));
  const todaySessionTasks = sessionTasks.filter(t => t.isToday);
  const otherSessionTasks = sessionTasks.filter(t => !t.isOverdue && !t.isToday);
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
  for (const t of todaySessionTasks) { if (prioritized.length >= 3) break; markPush(t); }
  if (dueConcepts[0] && prioritized.length < 3) markPush(dueConcepts[0]);
  for (const t of otherSessionTasks) { if (prioritized.length >= 3) break; markPush(t); }
  for (const t of dueConcepts.slice(1)) { if (prioritized.length >= 3) break; markPush(t); }

  return {
    curricula: curriculaWithSessions,
    todayTasks: prioritized.slice(0, 3),
    calendarSessions,
    calendarConceptItems,
  };
}

// ─── LEGACY MODEL: student_sessions ──────────────────────────────────────────

async function getDashboardFromLegacy(
  sc: any,
  profileId: string,
  todayKst: string,
) {
  const { data: studentSessions } = await sc
    .from('student_sessions')
    .select('id, subject_slug, week_number, session_number, label, publish_date, is_released, variant, lecture:lectures(title)')
    .eq('profile_id', profileId)
    .order('subject_slug', { ascending: true })
    .order('week_number', { ascending: true })
    .order('session_number', { ascending: true });

  const subjectGroups = new Map<string, {
    id: string; title: string; subject_slug: string;
    sessions: Array<{ id: string; week_number: number; session_number: number; label: string | null; publishDate: string | null }>;
  }>();

  for (const s of (studentSessions || []) as any[]) {
    if (!s.is_released) continue;
    const subj = s.subject_slug;
    if (!subjectGroups.has(subj)) {
      subjectGroups.set(subj, { id: subj, title: SUBJECT_LABEL[subj] || subj, subject_slug: subj, sessions: [] });
    }
    const lecture = s.lecture as unknown as { title: string } | null;
    subjectGroups.get(subj)!.sessions.push({
      id: s.id, week_number: s.week_number, session_number: s.session_number,
      label: s.label ?? lecture?.title ?? null, publishDate: s.publish_date as string | null,
    });
  }

  const curriculaWithSessions = Array.from(subjectGroups.values());

  interface CalendarSessionEntry {
    id: string; subject_slug: string; subject_label: string;
    week_number: number; session_number: number; label: string | null;
    publishDate: string | null; is_released: boolean;
  }

  const calendarSessions: CalendarSessionEntry[] = (studentSessions || []).map((s: any) => {
    const lecture = s.lecture as unknown as { title: string } | null;
    return {
      id: s.id, subject_slug: s.subject_slug, subject_label: SUBJECT_LABEL[s.subject_slug] || s.subject_slug,
      week_number: s.week_number, session_number: s.session_number,
      label: s.label ?? lecture?.title ?? null, publishDate: s.publish_date as string | null, is_released: s.is_released,
    };
  });

  // 개념강의 (기존 assignments + learning_sets)
  interface TodayTask {
    kind: 'session' | 'concept'; id: string; title: string;
    subject_slug: string; subject_label: string; meta: string;
    concept_set_id?: string; isOverdue?: boolean; isToday?: boolean; publishDate?: string | null;
  }

  const sessionTasks: TodayTask[] = [];
  for (const c of curriculaWithSessions) {
    for (const s of c.sessions) {
      const publishDate = s.publishDate;
      sessionTasks.push({
        kind: 'session', id: s.id, title: s.label || `${s.week_number}주차 ${s.session_number}차시`,
        subject_slug: c.subject_slug, subject_label: c.title,
        meta: `${c.title} · ${s.week_number}주차 ${s.session_number}차시`,
        isOverdue: !!publishDate && publishDate < todayKst,
        isToday: !!publishDate && publishDate === todayKst,
        publishDate,
      });
    }
  }

  const conceptTasks: TodayTask[] = [];
  const { data: conceptAssigns } = await sc
    .from('assignments').select('set_id, published_at')
    .eq('user_id', profileId).not('set_id', 'is', null).not('published_at', 'is', null)
    .order('published_at', { ascending: false });

  const conceptSetIds = (conceptAssigns || []).map((a: any) => a.set_id).filter(Boolean);
  const calendarConceptItems: Array<{ id: string; title: string; subject_slug: string; subject_label: string; publishDate: string | null }> = [];

  if (conceptSetIds.length > 0) {
    const { data: conceptSets } = await sc
      .from('learning_sets').select('id, title, subject_slug, chapter_order').in('id', conceptSetIds);
    const setMap = new Map((conceptSets || []).map((s: any) => [s.id, s]));
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const ymdKst = (iso: string) => new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
    const addDaysKst = (iso: string, days: number) =>
      new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000 + KST_OFFSET_MS).toISOString().slice(0, 10);

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
          subject_slug: s2.subject_slug || '', subject_label: SUBJECT_LABEL[s2.subject_slug || ''] || s2.subject_slug || '',
          publishDate,
        };
        calendarConceptItems.push(entry);
        conceptTasks.push({ kind: 'concept', ...entry, meta: '개념강의', concept_set_id: s2.id });
      });
    }
  }

  const overdueSessionTasks = sessionTasks.filter(t => t.isOverdue)
    .sort((a, b) => (a.publishDate || '').localeCompare(b.publishDate || ''));
  const todaySessionTasks = sessionTasks.filter(t => t.isToday);
  const otherSessionTasks = sessionTasks.filter(t => !t.isOverdue && !t.isToday);
  const dueConcepts = conceptTasks.filter(t => !t.publishDate || t.publishDate <= todayKst);

  const prioritized: TodayTask[] = [];
  const pushed = new Set<string>();
  const markPush = (t: TodayTask) => {
    const key = `${t.kind}:${t.id}`;
    if (pushed.has(key)) return; prioritized.push(t); pushed.add(key);
  };
  if (overdueSessionTasks[0]) markPush(overdueSessionTasks[0]);
  for (const t of todaySessionTasks) { if (prioritized.length >= 3) break; markPush(t); }
  if (dueConcepts[0] && prioritized.length < 3) markPush(dueConcepts[0]);
  for (const t of otherSessionTasks) { if (prioritized.length >= 3) break; markPush(t); }
  for (const t of dueConcepts.slice(1)) { if (prioritized.length >= 3) break; markPush(t); }

  return {
    curricula: curriculaWithSessions,
    todayTasks: prioritized.slice(0, 3),
    calendarSessions,
    calendarConceptItems,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const urlSlug = req.nextUrl.searchParams.get('slug');
  if (urlSlug && urlSlug !== student.slug) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: profile } = await sc
    .from('profiles')
    .select('id, name, school, exam_date_midterm, exam_date_final')
    .eq('id', student.profileId)
    .single();

  if (!profile) return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 });

  const { count: odapjiCount } = await sc
    .from('odapji_files')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', student.profileId)
    .eq('is_read', false);

  const todayKst = getTodayKstYmd();
  const useNewModel = process.env.USE_NEW_BLOCKS_MODEL === 'true';

  const dashData = useNewModel
    ? await getDashboardFromBlocks(sc, student.profileId, todayKst)
    : await getDashboardFromLegacy(sc, student.profileId, todayKst);

  const newToken = await renewToken(student);
  const res = NextResponse.json({
    profile: {
      name: profile.name, school: profile.school,
      exam_date_midterm: profile.exam_date_midterm as string | null,
      exam_date_final: profile.exam_date_final as string | null,
    },
    curricula: dashData.curricula,
    odapjiCount: odapjiCount || 0,
    todayTasks: dashData.todayTasks,
    nextReleaseAt: computeNextReleaseAt(),
    isMaster: student.isMaster ?? false,
    calendarSessions: dashData.calendarSessions,
    calendarConceptItems: dashData.calendarConceptItems,
  });
  return setStudentCookie(res, newToken);
}
