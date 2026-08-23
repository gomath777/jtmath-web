import type { Metadata } from 'next';
import { CheckCircle2, Download, Play, Route } from 'lucide-react';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import type { ConceptGateConfig } from '../_components/conceptAccess';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '공통수학2 · 1.1.1 보강자료',
  description: '공통수학2 1.1.1 선분의 내분점 보충 학습 자료',
  robots: { index: false, follow: false },
};

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'gs2_111_supplement_unlocked',
  path: '/share/gs2-111-supplement',
  tokenSeed: 'gs2-111-supplement:v1',
  passcodeEnvKeys: ['GS2_111_SUPPLEMENT_PASSCODE', 'GS2_CONCEPT_PASSCODE'],
};

const NOTE_URL =
  'https://mathgo-pdfs.b-cdn.net/concept/gs2/01_%EB%8F%84%ED%98%95%EC%9D%98%EB%B0%A9%EC%A0%95%EC%8B%9D/1_1_1_%20%E1%84%89%E1%85%A5%E1%86%AB%E1%84%87%E1%85%AE%E1%86%AB%E1%84%8B%E1%85%B4%20%E1%84%82%E1%85%A2%E1%84%87%E1%85%AE%E1%86%AB_%E1%84%82%E1%85%A2%E1%84%87%E1%85%AE%E1%86%AB%E1%84%8C%E1%85%A5%E1%86%B7%E1%84%8B%E1%85%B4%20%E1%84%8C%E1%85%AA%E1%84%91%E1%85%AD.pdf?v=dd28d0ba5c';

type Video = {
  readonly step: string;
  readonly title: string;
  readonly subtitle: string;
  readonly id: string;
};

type PageProps = {
  readonly searchParams?: Promise<{
    readonly gate?: string | readonly string[];
  }>;
};

const VIDEOS: readonly Video[] = [
  {
    step: '영상 1',
    title: '선분의 내분점',
    subtitle: '보강 영상입니다.',
    id: 'd8ac7347-08c2-4e18-889c-945912bb343c',
  },
];

function embedUrl(id: string): string {
  return `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=false&preload=true&responsive=true`;
}

export default async function Gs2Supplement111Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="공통수학2"
      heading="1.1.1 보강자료"
      gate={resolvedSearchParams?.gate}
    >
      <div className="min-h-screen bg-parchment text-ink">
        <main className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
          <header className="border-b border-border-cream pb-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone">
              공통수학2 · 오프라인 보강자료
            </p>
            <div className="mt-3 grid gap-5 md:grid-cols-[1fr_280px] md:items-end">
              <div>
                <h1 className="font-serif text-[28px] leading-tight tracking-tight md:text-[34px]">
                  1.1.1 선분의 내분점
                </h1>
                <p className="mt-3 max-w-2xl text-[14px] leading-6 text-olive">
                  개념노트 1개와 보강 영상 1개로 구성했습니다. 노트를 먼저 받은 뒤,
                  영상을 확인하세요.
                </p>
              </div>
              <div className="rounded-2xl border border-border-cream bg-ivory p-4 shadow-whisper">
                <p className="text-[12px] font-semibold text-charcoal">학습 순서</p>
                <ol className="mt-3 space-y-2 text-[13px] text-olive">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-terracotta" />
                    개념노트 열기
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-terracotta" />
                    내분점 영상 보기
                  </li>
                </ol>
              </div>
            </div>
          </header>

          <section className="mt-8 grid gap-3 md:grid-cols-3">
            <a
              href={NOTE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-border-cream bg-ivory p-4 transition-all hover:border-terracotta/40 hover:shadow-ring-warm focus:outline-none focus-visible:shadow-ring-terracotta"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                <Download className="h-4 w-4" />
              </span>
              <p className="mt-4 text-[12px] font-semibold text-terracotta">개념노트</p>
              <h2 className="mt-1 text-[15px] font-semibold leading-snug text-ink">
                선분의 내분과 내분점의 좌표
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-olive">
                개념노트를 먼저 받고 풀이 공간에 직접 정리하세요.
              </p>
            </a>

            {VIDEOS.map((video) => (
              <a
                key={video.id}
                href={embedUrl(video.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-border-cream bg-ivory p-4 transition-all hover:border-olive/40 hover:shadow-ring-warm focus:outline-none focus-visible:shadow-ring-warm"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-olive/10 text-olive">
                  <Play className="h-4 w-4" fill="currentColor" />
                </span>
                <p className="mt-4 text-[12px] font-semibold text-olive">{video.step}</p>
                <h2 className="mt-1 text-[15px] font-semibold leading-snug text-ink">
                  {video.title}
                </h2>
                <p className="mt-2 text-[13px] leading-5 text-olive">{video.subtitle}</p>
              </a>
            ))}
          </section>

          <section className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="lg:pt-1">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-charcoal">
                <Route className="h-4 w-4 text-terracotta" />
                오늘의 보강 흐름
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border-cream bg-ivory p-4">
                  <p className="text-[13px] font-semibold text-ink">진행 순서</p>
                  <ol className="mt-3 space-y-2 text-[13px] leading-5 text-olive">
                    <li>1. 개념노트 받기</li>
                    <li>2. 영상 1 보기</li>
                  </ol>
                </div>
                <div className="rounded-2xl border border-border-cream bg-ivory p-4">
                  <p className="text-[13px] font-semibold text-ink">완료 기준</p>
                  <ol className="mt-3 space-y-2 text-[13px] leading-5 text-olive">
                    <li>1. 개념노트 다 풀기</li>
                    <li>2. 영상 1개 다 보기</li>
                    <li>3. 카톡으로 받은 복습 문제지 풀기</li>
                  </ol>
                  <p className="mt-3 text-[12px] leading-5 text-stone">
                    복습 문제지 PDF는 카톡으로 따로 전달됩니다.
                  </p>
                </div>
              </div>
            </aside>

            <div className="space-y-8">
              {VIDEOS.map((video) => (
                <section key={video.id} className="border-t border-border-cream pt-6 first:border-t-0 first:pt-0">
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-[12px] font-semibold text-terracotta">{video.step}</p>
                    <h2 className="font-serif text-[21px] tracking-tight text-ink">{video.title}</h2>
                    <p className="text-[12px] text-stone">{video.subtitle}</p>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border-cream bg-ink shadow-whisper">
                    <iframe
                      src={embedUrl(video.id)}
                      title={`공통수학2 1.1.1 ${video.title}`}
                      loading="lazy"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="aspect-video h-auto w-full"
                    />
                  </div>
                </section>
              ))}
            </div>
          </section>
        </main>
      </div>
    </ConceptAccessPage>
  );
}
