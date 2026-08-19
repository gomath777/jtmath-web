import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/admin/AdminLayout';
import { isLocalAdminMode } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com')
  .split(',')
  .map((email) => email.trim());

const LESSONS = [
  { subject: '공수2', slug: 'gs2-midterm-2026-w1s1-plane-line', accent: 'bg-terracotta' },
  { subject: '미적1', slug: 'mj1-midterm-2026-w1s1-limit', accent: 'bg-olive' },
  { subject: '대수', slug: 'ds2-gichul-01-756fb2', accent: 'bg-crimson' },
  { subject: '대수(하나고)', slug: 'ds2-gichul-03-b1273c', accent: 'bg-terracotta' },
  { subject: '기하', slug: 'gh-midterm-2026-w1s1-conic', accent: 'bg-ink-soft' },
] as const;

type LessonSlug = (typeof LESSONS)[number]['slug'];

type SessionBlockContent = {
  readonly label?: string;
  readonly pdf?: unknown;
  readonly pdfs?: readonly unknown[];
  readonly hintbooks?: readonly unknown[];
  readonly videos?: readonly { readonly problem_number?: number }[];
  readonly links?: readonly unknown[];
};

type SessionBlockRow = {
  readonly id: string;
  readonly block_type: string;
  readonly order_index: number | null;
  readonly content: SessionBlockContent;
};

type CurriculumItemRow = {
  readonly id: string;
  readonly public_slug: LessonSlug;
  readonly title: string | null;
  readonly unit_name: string | null;
  readonly session_blocks: readonly SessionBlockRow[];
};

type DemoRow = {
  readonly slug: string;
  readonly profiles: readonly { readonly name: string }[] | null;
};

function getBlockStatus(block: SessionBlockRow): 'ready' | 'partial' | 'empty' {
  const pdfCount = (block.content.pdf ? 1 : 0) + (block.content.pdfs?.length ?? 0);
  const hintbookCount = block.content.hintbooks?.length ?? 0;
  const videoCount = block.content.videos?.length ?? 0;
  const linkCount = block.content.links?.length ?? 0;
  if (pdfCount + hintbookCount + videoCount + linkCount === 0) return 'empty';
  if (videoCount > 0 || pdfCount > 0 || hintbookCount > 0) return 'ready';
  return 'partial';
}

function statusLabel(status: ReturnType<typeof getBlockStatus>): string {
  if (status === 'ready') return '준비';
  if (status === 'partial') return '확인';
  return '비어있음';
}

async function requireAdmin(): Promise<void> {
  if (isLocalAdminMode()) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');
}

export default async function MidtermFrontDashboardPage() {
  noStore();
  await requireAdmin();

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const slugs = LESSONS.map((lesson) => lesson.slug);
  const [{ data: items }, { data: demoTokens }] = await Promise.all([
    sc
      .from('curriculum_items')
      .select('id, public_slug, title, unit_name, session_blocks(id, block_type, order_index, content)')
      .in('public_slug', slugs),
    sc
      .from('student_tokens')
      .select('slug, profiles!inner(name)')
      .eq('slug', 'jt-ot-gs2')
      .eq('is_active', true)
      .limit(1),
  ]);

  const itemBySlug = new Map(
    ((items as readonly CurriculumItemRow[] | null) ?? []).map((item) => [item.public_slug, item]),
  );
  const demo = ((demoTokens as readonly DemoRow[] | null) ?? [])[0] ?? null;

  return (
    <AdminLayout activeNav="midterm-front">
      <div className="min-w-0">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold text-crimson">2026 2학기 중간고사</p>
            <h1 className="mt-1 font-serif text-[28px] text-ink">4주 전반전 1주 1차시 점검</h1>
            <p className="mt-1 text-[13px] text-olive">
              목금 슬롯에 배정할 첫 수업 페이지의 PDF, 해설강의, 올스캔 블록을 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {demo ? (
              <Link
                href={`/s/${demo.slug}`}
                className="rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-ivory transition-colors hover:bg-black"
              >
                공수2 테스트 학생 열기
              </Link>
            ) : (
              <span className="rounded-lg border border-border-warm bg-ivory px-4 py-2 text-[13px] text-stone">
                테스트 학생 미생성
              </span>
            )}
          </div>
        </div>

        <section className="mb-5 grid gap-px overflow-hidden rounded-lg border border-border-warm bg-border-warm md:grid-cols-2 xl:grid-cols-5">
          {LESSONS.map((lesson) => {
            const item = itemBySlug.get(lesson.slug);
            const blocks = item?.session_blocks ?? [];
            const videoTotal = blocks.reduce((sum, block) => sum + (block.content.videos?.length ?? 0), 0);
            const pdfTotal = blocks.reduce(
              (sum, block) =>
                sum +
                (block.content.pdf ? 1 : 0) +
                (block.content.pdfs?.length ?? 0) +
                (block.content.hintbooks?.length ?? 0),
              0,
            );
            return (
              <div key={lesson.slug} className="bg-ivory p-4">
                <div className={`mb-3 h-1.5 w-10 rounded-full ${lesson.accent}`} />
                <p className="text-[12px] font-semibold text-olive">{lesson.subject}</p>
                <p className="mt-1 truncate font-serif text-[20px] text-ink">{item?.title ?? '페이지 없음'}</p>
                <p className="mt-3 text-[12px] text-stone">
                  PDF {pdfTotal}개 · 영상 {videoTotal}개 · 블록 {blocks.length}개
                </p>
              </div>
            );
          })}
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          {LESSONS.map((lesson) => {
            const item = itemBySlug.get(lesson.slug);
            const blocks = [...(item?.session_blocks ?? [])].sort(
              (left, right) => (left.order_index ?? 0) - (right.order_index ?? 0),
            );
            return (
              <section key={lesson.slug} className="rounded-lg border border-border-warm bg-ivory">
                <div className="flex flex-col gap-3 border-b border-border-cream px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-olive">{lesson.subject}</p>
                    <h2 className="mt-1 font-serif text-[21px] text-ink">{item?.title ?? lesson.slug}</h2>
                    <p className="mt-1 text-[12px] text-stone">{lesson.slug}</p>
                  </div>
                  <Link
                    href={`/lesson/${lesson.slug}`}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border-warm px-3 text-[12px] font-semibold text-ink transition-colors hover:bg-sand"
                  >
                    학습페이지 보기
                  </Link>
                </div>
                <div className="divide-y divide-border-cream">
                  {blocks.map((block) => {
                    const status = getBlockStatus(block);
                    const videos = block.content.videos ?? [];
                    const pdfCount = (block.content.pdf ? 1 : 0) + (block.content.pdfs?.length ?? 0);
                    const videoLabel = videos
                      .map((video) => video.problem_number)
                      .filter((value): value is number => typeof value === 'number')
                      .join(', ');
                    return (
                      <div key={block.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[14px] text-ink">
                              {block.content.label ?? block.block_type}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                status === 'ready'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : status === 'partial'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {statusLabel(status)}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] text-stone">
                            PDF {pdfCount} · 힌트북 {block.content.hintbooks?.length ?? 0} · 링크 {block.content.links?.length ?? 0}
                          </p>
                        </div>
                        <div className="min-w-0 text-left md:w-56 md:text-right">
                          <p className="text-[12px] font-semibold text-olive">해설강의 {videos.length}개</p>
                          <p className="mt-1 break-words text-[12px] text-stone">
                            {videoLabel || '없음'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {blocks.length === 0 && (
                    <div className="px-5 py-8 text-center text-[13px] text-stone">블록이 없습니다.</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
