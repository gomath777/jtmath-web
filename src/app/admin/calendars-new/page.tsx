import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import CalendarsNewClient from './CalendarsNewClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds2: '대수', mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하',
};

export const dynamic = 'force-dynamic';

export interface CalendarSlaEntry {
  id: string;                   // SLA id
  lessonSlug: string;           // curriculum_items.public_slug → /lesson/{slug}
  subject_slug: string;
  subject_label: string;
  category: string;             // concept | gichul | shimhwa
  week_number: number;          // 표시용 (캘린더 그리드는 publishDate 로 위치 결정)
  session_number: number;       // curriculum_items.session_number
  variant_label: string | null;
  label: string;                // curriculum_items.title (+ variant_label suffix)
  publishDate: string;          // scheduled_date (YYYY-MM-DD)
  is_released: boolean;         // status === 'released'
}

export interface CalendarPhase {
  label: string;
  startYmd: string;
  endYmd: string | null;
}

interface StudentCard {
  slug: string;
  profileId: string;
  name: string;
  school: string;
  grade: number | null;
  sla: CalendarSlaEntry[];
  phase: CalendarPhase | null;
}

// 기말 마무리 단계 배너 라벨 (st-dashboard 응답과 동일하게 유지)
const REVIEW_PHASE_LABEL = '전체 오답 반복 · 취약유형 보충 · 모의내신';

type ProfileRow = Readonly<{
  readonly id: string;
  readonly name: string;
  readonly school: string | null;
  readonly grade: number | null;
  readonly review_phase_start: string | null;
  readonly exam_date_final: string | null;
}>;

type TokenQueryRow = Readonly<{
  readonly slug: string;
  readonly profile_id: string;
  readonly profiles: ProfileRow | readonly ProfileRow[] | null;
}>;

type TokenRow = Readonly<{
  readonly slug: string;
  readonly profile_id: string;
  readonly profiles: ProfileRow;
}>;

type CurriculumQueryRow = Readonly<{
  readonly subject_slug: string;
}>;

type CurriculumItemQueryRow = Readonly<{
  readonly public_slug: string;
  readonly title: string;
  readonly category: string;
  readonly session_number: number | null;
  readonly variant_label: string | null;
  readonly curriculum: CurriculumQueryRow | readonly CurriculumQueryRow[] | null;
}>;

type SlaQueryRow = Readonly<{
  readonly id: string;
  readonly profile_id: string;
  readonly scheduled_date: string | null;
  readonly status: string;
  readonly curriculum_item: CurriculumItemQueryRow | readonly CurriculumItemQueryRow[] | null;
}>;

type SlaRow = Readonly<{
  readonly id: string;
  readonly profile_id: string;
  readonly scheduled_date: string | null;
  readonly status: string;
  readonly curriculum_item: Omit<CurriculumItemQueryRow, 'curriculum'> & Readonly<{
    readonly curriculum: CurriculumQueryRow;
  }>;
}>;

export default async function AdminCalendarsNewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // 1. 활성 학생 토큰
  const tokensRes = await sc
    .from('student_tokens')
    .select('slug, profile_id, profiles!inner(id, name, school, grade, review_phase_start, exam_date_final)')
    .eq('is_active', true)
    .eq('show_in_calendar', true)
    .returns<TokenQueryRow[]>(); // 퇴원 학생은 캘린더에서 숨김 (포탈은 portal_expires_at 까지 유지)
  const tokens = (tokensRes.data ?? []).flatMap(toTokenRow);

  // 2. 전 학생 SLA + curriculum_item + curricula 한 번에
  const { data: slaRows } = await sc
    .from('student_lesson_assignments')
    .select(`
      id, profile_id, scheduled_date, status,
      curriculum_item:curriculum_items!inner(
        id, public_slug, title, category, session_number, variant_label,
        curriculum:curricula!inner(subject_slug)
      )
    `)
    .order('scheduled_date')
    .returns<SlaQueryRow[]>();

  const slaByProfile = new Map<string, CalendarSlaEntry[]>();
  for (const row of (slaRows ?? []).flatMap(toSlaRow)) {
    if (!row.scheduled_date) continue;
    const ci = row.curriculum_item;
    const subject = ci.curriculum.subject_slug;
    const titleText = ci.title || '(라벨 미설정)';
    // 개념강의는 N차시 prefix 자동 부여 — 배정 시 "공수1 N차시" 호명 쉽도록.
    // 단, title에 이미 "차시"가 들어있으면 중복 방지.
    // 기출/심화는 단원명 자체가 제목에 들어가므로 prefix 불필요.
    const alreadyHasChasi = /차시/.test(titleText);
    const labelBase = ci.category === 'concept' && ci.session_number && !alreadyHasChasi
      ? `${ci.session_number}차시 ${titleText}`
      : titleText;
    const label = ci.variant_label ? `${labelBase} (v${ci.variant_label})` : labelBase;
    const arr = slaByProfile.get(row.profile_id) || [];
    arr.push({
      id: row.id,
      lessonSlug: ci.public_slug,
      subject_slug: subject,
      subject_label: SUBJECT_LABEL[subject] || subject,
      category: ci.category,
      week_number: 0,    // 신 모델은 캘린더 그리드를 날짜로만 결정 (week 라벨 미사용)
      session_number: ci.session_number ?? 0,
      variant_label: ci.variant_label,
      label,
      publishDate: row.scheduled_date,
      is_released: row.status === 'released',
    });
    slaByProfile.set(row.profile_id, arr);
  }

  // 3. 학생 카드 빌드 (학년 → 가나다 정렬)
  const students: StudentCard[] = tokens
    .map(t => ({
      slug: t.slug,
      profileId: t.profile_id,
      name: t.profiles?.name || '(이름없음)',
      school: t.profiles?.school || '',
      grade: t.profiles?.grade ?? null,
      sla: slaByProfile.get(t.profile_id) || [],
      phase: t.profiles?.review_phase_start
        ? {
            label: REVIEW_PHASE_LABEL,
            startYmd: t.profiles.review_phase_start,
            endYmd: t.profiles.exam_date_final ?? null,
          }
        : null,
    }))
    .sort((a, b) => {
      const ga = a.grade ?? 99;
      const gb = b.grade ?? 99;
      if (ga !== gb) return ga - gb;
      return a.name.localeCompare(b.name, 'ko');
    });

  return <CalendarsNewClient students={students} />;
}

function toTokenRow(row: TokenQueryRow): readonly TokenRow[] {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;
  if (profile === null) return [];
  return [{ slug: row.slug, profile_id: row.profile_id, profiles: profile }];
}

function toSlaRow(row: SlaQueryRow): readonly SlaRow[] {
  const curriculumItem = Array.isArray(row.curriculum_item) ? row.curriculum_item[0] ?? null : row.curriculum_item;
  if (curriculumItem === null) return [];
  const curriculum = Array.isArray(curriculumItem.curriculum) ? curriculumItem.curriculum[0] ?? null : curriculumItem.curriculum;
  if (curriculum === null) return [];
  return [{
    id: row.id,
    profile_id: row.profile_id,
    scheduled_date: row.scheduled_date,
    status: row.status,
    curriculum_item: {
      public_slug: curriculumItem.public_slug,
      title: curriculumItem.title,
      category: curriculumItem.category,
      session_number: curriculumItem.session_number,
      variant_label: curriculumItem.variant_label,
      curriculum,
    },
  }];
}
