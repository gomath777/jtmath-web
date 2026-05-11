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

interface CalendarConceptItem {
  id: string;
  title: string;
  subject_slug: string;
  subject_label: string;
  publishDate: string | null;
}

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
  lessonSlug?: string | null;
}

interface CurriculumSession {
  id: string;
  week_number: number;
  session_number: number;
  label: string | null;
  publishDate: string | null;
  lessonSlug: string | null;
}

interface CurriculumGroup {
  id: string;
  title: string;
  subject_slug: string;
  sessions: CurriculumSession[];
}

async function getDashboardFromSla(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sc: any,
  profileId: string,
  todayKst: string,
) {
  const { data: rowsRaw, error } = await sc
    .from('student_lesson_assignments')
    .select(`
      id, scheduled_date, status, variant,
      curriculum_item:curriculum_items!inner (
        id, week_number, session_number, label, title, publish_date, public_slug,
        curriculum:curricula ( subject_slug, title )
      )
    `)
    .eq('profile_id', profileId)
    .order('scheduled_date', { ascending: true });

  if (error) throw new Error(`student_lesson_assignments 조회 실패: ${error.message}`);

  const rows = (rowsRaw || []) as unknown as Array<{
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
      publish_date: string | null;
      public_slug: string | null;
      curriculum: { subject_slug: string; title: string } | null;
    } | null;
  }>;

  const calendarSessions: CalendarSessionEntry[] = [];
  const subjectGroups = new Map<string, CurriculumGroup>();

  for (const row of rows) {
    const ci = row.curriculum_item;
    if (!ci) continue;
    const subj = ci.curriculum?.subject_slug || '';
    const subjectLabel = SUBJECT_LABEL[subj] || ci.curriculum?.title || subj;
    const isReleased = row.status === 'released' || row.status === 'completed';
    const displayLabel = ci.title || ci.label;

    calendarSessions.push({
      id: row.id,
      subject_slug: subj,
      subject_label: subjectLabel,
      week_number: ci.week_number ?? 0,
      session_number: ci.session_number ?? 0,
      label: displayLabel,
      publishDate: row.scheduled_date,
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
      id: row.id,
      week_number: ci.week_number ?? 0,
      session_number: ci.session_number ?? 0,
      label: displayLabel,
      publishDate: row.scheduled_date,
      lessonSlug: ci.public_slug,
    });
  }

  const curriculaWithSessions = Array.from(subjectGroups.values());

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

  const calendarConceptItems: CalendarConceptItem[] = [];

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
  for (const t of otherSessionTasks) { if (prioritized.length >= 3) break; markPush(t); }

  return {
    curricula: curriculaWithSessions,
    todayTasks: prioritized.slice(0, 3),
    calendarSessions,
    calendarConceptItems,
  };
}

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
  const dashData = await getDashboardFromSla(sc, student.profileId, todayKst);

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
