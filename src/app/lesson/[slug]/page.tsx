import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { verifyToken } from '@/utils/student-auth';
import { parseWebAiTutorConfig, type WebAiTutorEnvironment } from '@/lib/ai-tutor/web-config';
import { readWebStudentCookie, verifyStrictWebStudentToken } from '@/lib/ai-tutor/web-auth';
import { resolveWebLessonContext, type WebLessonContext } from '@/lib/ai-tutor/web-lesson-context';
import { createDefaultWebAiTutorRuntimeDependencies } from '@/lib/ai-tutor/web-runtime-readiness';
import LessonContent from './LessonContent';
import type { SessionBlock, ProgressMap } from '@/components/blocks/types';

export const dynamic = 'force-dynamic';

// 정적 share 페이지(/share/{slug})로 바로 보낼 lesson slug 목록.
// 보강·외부 콘텐츠를 학생 달력(SLA)에 배포하면서, 클릭 시 share 페이지로 redirect.
// 새 share 페이지를 lesson 시스템에 노출하려면 여기 추가 + curriculum_items에 row 1개 만들면 됨.
const SHARE_REDIRECT_SLUGS = new Set<string>([
  'gs1-review2-lv3',
  'gs1-review2-lv4',
]);

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gh: '기하', gi: '기하', s2: '수학2',
};

interface LessonItem {
  id: string;
  label: string | null;
  title: string | null;
  week_number: number | null;
  session_number: number | null;
  public_slug: string;
  curriculum_id: string | null;
  curricula: { subject_slug: string; title: string } | null;
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // share 페이지로 redirect (보강·외부 콘텐츠)
  if (SHARE_REDIRECT_SLUGS.has(slug)) {
    redirect(`/share/${slug}`);
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: item } = await sc
    .from('curriculum_items')
    .select(`
      id, label, title, week_number, session_number, public_slug, curriculum_id,
      curricula:curricula ( subject_slug, title )
    `)
    .eq('public_slug', slug)
    .maybeSingle();

  if (!item) notFound();
  const lessonItem = item as unknown as LessonItem;

  const cookieStore = await cookies();
  const studentToken = cookieStore.get('student_session')?.value;
  const student = studentToken ? await verifyToken(studentToken) : null;
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  let assignedVariant = 'default';
  let assignedDate: string | null = null;
  if (student) {
    const { data: sla } = await sc
      .from('student_lesson_assignments')
      .select('variant, scheduled_date, status')
      .eq('profile_id', student.profileId)
      .eq('curriculum_item_id', lessonItem.id)
      .order('scheduled_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sla) {
      assignedVariant = (sla as { variant: string }).variant || 'default';
      assignedDate = (sla as { scheduled_date: string }).scheduled_date;
    }
  }

  let blocks: SessionBlock[] = [];
  if (assignedVariant !== 'default') {
    const { data: variantBlocks } = await sc
      .from('session_blocks')
      .select('*')
      .eq('curriculum_item_id', lessonItem.id)
      .eq('variant', assignedVariant)
      .order('order_index', { ascending: true });
    blocks = (variantBlocks as SessionBlock[]) || [];
  }
  if (blocks.length === 0) {
    const { data: defaultBlocks } = await sc
      .from('session_blocks')
      .select('*')
      .eq('curriculum_item_id', lessonItem.id)
      .eq('variant', 'default')
      .order('order_index', { ascending: true });
    blocks = (defaultBlocks as SessionBlock[]) || [];
  }

  const progressMap: ProgressMap = {};
  let progressEndpoint: string | undefined = undefined;
  if (student) {
    const { data: progress } = await sc
      .from('video_watch_progress')
      .select('bunny_video_id, watch_percent, completed')
      .eq('user_id', student.profileId);
    (progress || []).forEach((p: { bunny_video_id: string; watch_percent: number; completed: boolean }) => {
      progressMap[p.bunny_video_id] = { watch_percent: p.watch_percent, completed: p.completed };
    });
    progressEndpoint = `/api/public/student/progress`;
  }

  const subjectSlug = lessonItem.curricula?.subject_slug || '';
  const subjectLabel = SUBJECT_LABEL[subjectSlug] || lessonItem.curricula?.title || '';

  const heading =
    lessonItem.title ||
    lessonItem.label ||
    (lessonItem.week_number && lessonItem.session_number
      ? `${lessonItem.week_number}주차 ${lessonItem.session_number}차시`
      : '학습 페이지');
  const webTutorContext = await loadWebTutorContext({
    cookieHeader,
    lessonSlug: slug,
    env: readWebAiTutorEnvironment(process.env),
  });

  return (
    <LessonContent
      lessonSlug={slug}
      heading={heading}
      subjectLabel={subjectLabel}
      subjectSlug={subjectSlug}
      blocks={blocks}
      progress={progressMap}
      progressEndpoint={progressEndpoint}
      assignedDate={assignedDate}
      isAuthenticated={!!student}
      tutorContext={webTutorContext}
    />
  );
}

async function loadWebTutorContext(input: {
  readonly cookieHeader: string;
  readonly lessonSlug: string;
  readonly env: WebAiTutorEnvironment;
}): Promise<WebLessonContext | null> {
  const token = readWebStudentCookie(input.cookieHeader);
  if (token === null) return null;
  const identity = await verifyStrictWebStudentToken({
    token,
    secret: process.env.STUDENT_TOKEN_SECRET ?? '',
  });
  if (identity === null || identity.isMaster === true) return null;
  const config = parseWebAiTutorConfig(input.env);
  if (!config.ok || config.config.status !== 'enabled') return null;
  const runtime = await createDefaultWebAiTutorRuntimeDependencies(input.env, config.config);
  if (!runtime.ok) return null;
  const result = await resolveWebLessonContext({
    port: runtime.dependencies.lessonPort,
    identity: { profileId: identity.profileId, slug: identity.slug },
    lessonSlug: input.lessonSlug,
    now: new Date(),
  });
  return result.ok ? result.context : null;
}

function readWebAiTutorEnvironment(env: NodeJS.ProcessEnv): WebAiTutorEnvironment {
  return {
    AI_TUTOR_WEB_ENABLED: env.AI_TUTOR_WEB_ENABLED,
    AI_TUTOR_PAID_BILLING_CONFIRMED: env.AI_TUTOR_PAID_BILLING_CONFIRMED,
    GEMINI_API_KEY: env.GEMINI_API_KEY,
    AI_TUTOR_GEMINI_FAST_MODEL: env.AI_TUTOR_GEMINI_FAST_MODEL,
    AI_TUTOR_GEMINI_REASONING_MODEL: env.AI_TUTOR_GEMINI_REASONING_MODEL,
    AI_TUTOR_GEMINI_FALLBACK_MODEL: env.AI_TUTOR_GEMINI_FALLBACK_MODEL,
    AI_TUTOR_MODEL_TIMEOUT_MS: env.AI_TUTOR_MODEL_TIMEOUT_MS,
    AI_TUTOR_RECENT_TURN_COUNT_CAP: env.AI_TUTOR_RECENT_TURN_COUNT_CAP,
    AI_TUTOR_RECENT_TURN_CHARACTER_CAP: env.AI_TUTOR_RECENT_TURN_CHARACTER_CAP,
    AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP: env.AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP,
    STUDENT_TOKEN_SECRET: env.STUDENT_TOKEN_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_KEY,
    VERCEL_ENV: env.VERCEL_ENV,
  };
}
