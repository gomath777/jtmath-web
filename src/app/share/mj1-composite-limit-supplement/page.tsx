import type { Metadata } from 'next';
import { Download, Play } from 'lucide-react';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '미적분1 · 합성함수 극한 보강자료',
  description: '미적분1 합성함수 극한 보강용 개념노트와 개념강의',
  robots: { index: false, follow: false },
};

const NOTE_URL =
  'https://mathgo-pdfs.b-cdn.net/concept/mj1/03_%ED%95%A8%EC%88%98%EC%9D%98%EC%97%B0%EC%86%8D/1_2_1_%20%ED%95%A8%EC%88%98%EC%9D%98%20%EC%97%B0%EC%86%8D%28%ED%95%A9%EC%84%B1%ED%95%A8%EC%88%98%20%EC%97%B0%EC%86%8D%20%ED%8A%B9%EA%B0%95%29_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf';

const VIDEO = {
  title: '합성함수의 연속 특강',
  id: 'b8e81a45-1edc-44bb-94ef-d9338be7c321',
} as const;

function embedUrl(id: string): string {
  return `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=false&preload=true&responsive=true`;
}

export default function Mj1CompositeLimitSupplementPage() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
        <header className="border-b border-border-cream pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone">
            미적분1 · 오프라인 보강자료
          </p>
          <div className="mt-3 grid gap-5 md:grid-cols-[1fr_260px] md:items-end">
            <div>
              <h1 className="font-serif text-[28px] leading-tight tracking-tight md:text-[34px]">
                합성함수 극한 보강자료
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-olive">
                개념노트 1개와 개념강의 1개만 담았습니다. 노트를 먼저 열고, 영상을 이어서
                확인하세요.
              </p>
            </div>
            <div className="rounded-2xl border border-border-cream bg-ivory p-4 shadow-whisper">
              <p className="text-[12px] font-semibold text-charcoal">학습 순서</p>
              <ol className="mt-3 space-y-2 text-[13px] leading-5 text-olive">
                <li>1. 개념노트 열기</li>
                <li>2. 개념강의 보기</li>
              </ol>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          <a
            href={getPdfDownloadHref(NOTE_URL)}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-border-cream bg-ivory p-4 transition-all hover:border-terracotta/40 hover:shadow-ring-warm focus:outline-none focus-visible:shadow-ring-terracotta"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
              <Download className="h-4 w-4" />
            </span>
            <p className="mt-4 text-[12px] font-semibold text-terracotta">개념노트</p>
            <h2 className="mt-1 text-[15px] font-semibold leading-snug text-ink">
              함수의 연속(합성함수 연속 특강)
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-olive">
              노트를 먼저 열어 풀이 흐름을 확인하세요.
            </p>
          </a>

          <a
            href={embedUrl(VIDEO.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-border-cream bg-ivory p-4 transition-all hover:border-olive/40 hover:shadow-ring-warm focus:outline-none focus-visible:shadow-ring-warm"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-olive/10 text-olive">
              <Play className="h-4 w-4" fill="currentColor" />
            </span>
            <p className="mt-4 text-[12px] font-semibold text-olive">개념강의</p>
            <h2 className="mt-1 text-[15px] font-semibold leading-snug text-ink">
              {VIDEO.title}
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-olive">
              노트 확인 후 이어서 시청하세요.
            </p>
          </a>
        </section>

        <section className="mt-10 border-t border-border-cream pt-6">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[12px] font-semibold text-terracotta">개념강의</p>
            <h2 className="font-serif text-[21px] tracking-tight text-ink">{VIDEO.title}</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border-cream bg-ink shadow-whisper">
            <iframe
              src={embedUrl(VIDEO.id)}
              title={`미적분1 ${VIDEO.title}`}
              loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="aspect-video h-auto w-full"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
