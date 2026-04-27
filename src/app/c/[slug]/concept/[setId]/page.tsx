import ConceptDetailClient from '@/app/s/[slug]/concept/[setId]/ConceptDetailClient';

export default async function ClassroomConceptDetailPage({
  params,
}: {
  params: Promise<{ slug: string; setId: string }>;
}) {
  const { slug, setId } = await params;
  return <ConceptDetailClient setId={setId} backHref={`/c/${slug}`} />;
}
