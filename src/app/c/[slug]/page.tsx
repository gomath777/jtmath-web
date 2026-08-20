import { createClient as createServiceClient } from '@supabase/supabase-js';
import StudentDashboardClient from '@/app/s/[slug]/StudentDashboardClient';

/**
 * 오프라인 학원생용 학습 페이지.
 * 온라인 페이지(`/s/<slug>`)와 동일한 대시보드 컴포넌트 재사용 — basePath="/c" 전달.
 * student_type='offline' 학생만 접근 가능.
 */
export default async function ClassroomPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: token } = await sc
    .from('student_tokens')
    .select('id, slug, is_active, student_type')
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('student_type', 'offline')
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

  return <StudentDashboardClient slug={slug} basePath="/c" />;
}
