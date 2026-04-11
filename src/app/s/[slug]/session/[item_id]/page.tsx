import SessionPageClient from '@/app/dashboard/learning/session/[item_id]/SessionPageClient';

export default async function StudentSessionPage({
  params,
}: {
  params: Promise<{ slug: string; item_id: string }>;
}) {
  const { slug, item_id } = await params;

  return (
    <SessionPageClient
      itemId={item_id}
      backHref={`/s/${slug}`}
      backLabel="대시보드로 돌아가기"
      apiEndpoint={`/api/public/student/session/${item_id}`}
      progressEndpoint="/api/public/student/watch-progress"
    />
  );
}
