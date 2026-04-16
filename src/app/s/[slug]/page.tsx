import { createClient as createServiceClient } from '@supabase/supabase-js';
import StudentDashboardClient from './StudentDashboardClient';

export default async function StudentPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Verify slug exists (server-side)
  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: token } = await sc
    .from('student_tokens')
    .select('id, slug, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!token) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-ivory border border-border-cream rounded-2xl px-8 py-12 text-center max-w-sm">
          <p className="font-serif text-[18px] text-ink tracking-tight">
            유효하지 않은 학습 페이지입니다
          </p>
          <p className="text-[13px] text-olive mt-2">
            링크를 다시 확인해주세요
          </p>
        </div>
      </div>
    );
  }

  return <StudentDashboardClient slug={slug} />;
}
