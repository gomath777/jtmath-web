import { redirect } from 'next/navigation';

/**
 * /st/[slug] 는 2026-05-14 이후 /s/[slug] 와 통합됨.
 * 이전 북마크·링크 호환을 위해 자동 redirect 만 수행.
 *
 * 신 시스템(SLA 기반 SessionCalendarView)은 이제 /s/[slug] 에서 직접 보임.
 * 구 시스템(student_sessions 기반) 백업은 /sv2/[slug] 에 보존.
 */
export default async function StPortalRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/s/${slug}`);
}
