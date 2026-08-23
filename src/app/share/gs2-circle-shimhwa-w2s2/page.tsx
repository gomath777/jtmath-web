import type { Metadata } from 'next';
import { ArrowUpRight, CheckCircle2, Download, FileText, Play } from 'lucide-react';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const metadata: Metadata = {
  title: '공통수학2 · 심화유형 모음',
  description: '공통수학2 중간범위 주차별 심화유형 학습자료와 대표문항 해설강의',
  robots: { index: false, follow: false },
};

const WEEKS = [
  {
    week: '1주차',
    session: '2차시',
    topic: '평면좌표와 직선의 방정식',
    materials: [
      {
        title: '심화유형 3배수',
        url: 'https://mathgo-pdfs.b-cdn.net/sessions/share/gs2-shimhwa-all/gs2-shimhwa-1w-1.pdf?v=c2c7fd2050',
      },
    ],
    videos: [
      {
        title: '대표문항 해설강의',
        url: 'https://youtu.be/6WukJhc6Vo8',
      },
    ],
  },
  {
    week: '2주차',
    session: '2차시',
    topic: '원의 방정식',
    materials: [
      {
        title: '심화유형 3배수 1부',
        url: 'https://mathgo-pdfs.b-cdn.net/sessions/share/gs2-shimhwa-all/gs2-shimhwa-2w-1.pdf?v=1f5e98f45e',
      },
      {
        title: '심화유형 3배수 2부',
        url: 'https://mathgo-pdfs.b-cdn.net/sessions/share/gs2-shimhwa-all/gs2-shimhwa-2w-2.pdf?v=4d367bc96a',
      },
    ],
    videos: [
      {
        title: '1부 대표문항 해설강의',
        url: 'https://youtu.be/Tf439r0nLJI',
      },
      {
        title: '2부 대표문항 해설강의',
        url: 'https://youtu.be/loyd9o1JVWE',
      },
    ],
  },
  {
    week: '3주차',
    session: '6차시',
    topic: '도형의 이동',
    materials: [
      {
        title: '심화유형 3배수',
        url: 'https://mathgo-pdfs.b-cdn.net/sessions/share/gs2-shimhwa-all/gs2-shimhwa-3w-1.pdf?v=1cd90b9739',
      },
    ],
    videos: [
      {
        title: '대표문항 해설강의',
        url: 'https://youtu.be/sWmgDfehJ2Q',
      },
    ],
  },
  {
    week: '4주차',
    session: '8차시',
    topic: '집합',
    materials: [
      {
        title: '심화유형 3배수 1부',
        url: 'https://mathgo-pdfs.b-cdn.net/sessions/share/gs2-shimhwa-all/gs2-shimhwa-4w-1.pdf?v=2d0e863961',
      },
      {
        title: '심화유형 3배수 2부',
        url: 'https://mathgo-pdfs.b-cdn.net/sessions/share/gs2-shimhwa-all/gs2-shimhwa-4w-2.pdf?v=7676ad160d',
      },
    ],
    videos: [
      {
        title: '1부 대표문항 해설강의',
        url: 'https://youtu.be/DcDHu46voA4',
      },
      {
        title: '2부 대표문항 해설강의',
        url: 'https://youtu.be/MbcL4BNNzQw',
      },
    ],
  },
] as const;

export default function Gs2CircleShimhwaW2S2Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="mx-auto max-w-4xl px-5 py-9 md:px-8 md:py-14">
        <header className="border-b border-border-cream pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone">
            공통수학2 · 중간범위
          </p>
          <div className="mt-3 grid gap-5 md:grid-cols-[1fr_250px] md:items-end">
            <div>
              <h1 className="font-serif text-[28px] leading-tight tracking-tight md:text-[34px]">
                공수2 심화유형 모음
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-olive">
                주차별 심화유형 학습지와 대표문항 해설강의만 모았습니다. 각 주차 자료를
                먼저 풀고, 막힌 문항은 해설강의로 확인하세요.
              </p>
            </div>
            <div className="rounded-2xl border border-border-cream bg-ivory p-4 shadow-whisper">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-charcoal">
                <CheckCircle2 className="h-4 w-4 text-terracotta" />
                학습 순서
              </div>
              <ol className="mt-3 space-y-2 text-[13px] leading-5 text-olive">
                <li>1. 심화유형 먼저 풀기</li>
                <li>2. 앱 제출 후 오답관리</li>
                <li>3. 대표문항 해설강의 확인</li>
              </ol>
            </div>
          </div>
        </header>

        <section className="mt-8 space-y-7">
          {WEEKS.map((week) => (
            <section
              key={`${week.week}-${week.topic}`}
              className="border-t border-border-cream pt-7 first:border-t-0 first:pt-0"
            >
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-[12px] font-semibold text-terracotta">
                  {week.week} · {week.session}
                </p>
                <h2 className="font-serif text-[22px] tracking-tight text-ink">
                  {week.topic}
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-2.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-stone">
                    <FileText className="h-3.5 w-3.5 text-terracotta" />
                    심화유형 PDF
                  </p>
                  <div className="space-y-2">
                    {week.materials.map((material) => (
                      <a
                        key={material.url}
                        href={getPdfDownloadHref(material.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-2xl border border-border-cream bg-ivory p-4 transition-colors hover:border-terracotta/40 focus:outline-none focus-visible:shadow-ring-terracotta"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                          <Download className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold leading-snug text-ink">
                            {material.title}
                          </span>
                          <span className="mt-1 block text-[12px] text-olive">
                            PDF 열기
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-stone">
                    <Play className="h-3.5 w-3.5 text-olive" fill="currentColor" />
                    대표 해설강의
                  </p>
                  <div className="space-y-2">
                    {week.videos.map((video) => (
                      <a
                        key={video.url}
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-2xl border border-border-cream bg-ivory p-4 transition-colors hover:border-olive/40 focus:outline-none focus-visible:shadow-ring-warm"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-olive/10 text-olive">
                          <Play className="h-4 w-4" fill="currentColor" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold leading-snug text-ink">
                            {video.title}
                          </span>
                          <span className="mt-1 block text-[12px] text-olive">
                            YouTube에서 보기
                          </span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-stone transition-colors group-hover:text-olive" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </section>
      </main>
    </div>
  );
}
