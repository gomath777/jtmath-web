import SessionPageClient from '@/app/dashboard/learning/session/[item_id]/SessionPageClient';

/**
 * 오프라인 학원생 세션 상세 페이지.
 * `/s/<slug>/session/<id>` 와 동일한 클라이언트 컴포넌트 재사용 — backHref만 /c로.
 */
export default async function ClassroomSessionPage({
  params,
}: {
  params: Promise<{ slug: string; item_id: string }>;
}) {
  const { slug, item_id } = await params;

  return (
    <SessionPageClient
      itemId={item_id}
      backHref={`/c/${slug}`}
      backLabel="학습자료로 돌아가기"
      apiEndpoint={`/api/public/student/session/${item_id}`}
      progressEndpoint="/api/public/student/watch-progress"
    />
  );
}
