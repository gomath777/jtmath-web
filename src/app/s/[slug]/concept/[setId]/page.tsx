import ConceptDetailClient from './ConceptDetailClient';

export default async function StudentConceptDetailPage({
  params,
}: {
  params: Promise<{ slug: string; setId: string }>;
}) {
  const { slug, setId } = await params;
  return <ConceptDetailClient setId={setId} backHref={`/s/${slug}`} />;
}
