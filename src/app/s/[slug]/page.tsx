import { createClient as createServiceClient } from '@supabase/supabase-js';
import StudentDashboardClient from './StudentDashboardClient';

export default async function StudentPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ admin?: string | string[] }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const adminParam = Array.isArray(sp?.admin) ? sp?.admin[0] : sp?.admin;
  const adminReturnHref = adminParam === '1' ? '/admin/calendars-new' : undefined;

  // Verify slug exists (server-side)
  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // 온라인 페이지는 student_type 검증 없이 그대로 통과 — 기존 운영 영향 0.
  // 오프라인 학생은 별도 slug + /c/<slug> 페이지로만 접근하도록 운영하면 충돌 없음.
  // (SQL 마이그레이션은 /c 페이지 작동에만 필요. /s 는 항상 그대로 작동.)
  const { data: token } = await sc
    .from('student_tokens')
    .select('id, slug, is_active, portal_expires_at')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  // 퇴원 학생: portal_expires_at 이 지나면 포탈 접근 차단 (그 전까지는 정상 접근)
  const expired =
    !!token?.portal_expires_at && new Date(token.portal_expires_at).getTime() <= Date.now();

  if (!token || expired) {
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

  return (
    <StudentDashboardClient
      slug={slug}
      basePath="/s"
      dashboardEndpoint="/api/public/student/st-dashboard"
      adminReturnHref={adminReturnHref}
    />
  );
}
