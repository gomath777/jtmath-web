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
        <div className="brand-card p-12 text-center max-w-sm">
          <p className="text-white/60 text-sm">유효하지 않은 학습 페이지입니다</p>
          <p className="text-white/30 text-xs mt-2">링크를 다시 확인해주세요</p>
        </div>
      </div>
    );
  }

  return <StudentDashboardClient slug={slug} />;
}
