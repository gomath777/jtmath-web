import SessionPageClient from '@/app/dashboard/learning/session/[item_id]/SessionPageClient';

export default async function SupplementSessionPage({
  params,
}: {
  params: Promise<{ item_id: string }>;
}) {
  const { item_id } = await params;
  return (
    <SessionPageClient
      itemId={item_id}
      backHref="/dashboard/supplements"
      backLabel="보충자료로 돌아가기"
    />
  );
}
