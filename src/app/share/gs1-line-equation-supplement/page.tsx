import type { Metadata } from 'next';
import { CheckCircle2, Download, Play, Route } from 'lucide-react';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '공통수학 · 직선의 방정식 보강자료',
  description: '직선의 방정식 파트 보강용 개념노트와 개념강의',
  robots: { index: false, follow: false },
};

const NOTES = [
  {
    title: '두 직선의 평행 조건과 수직 조건',
    url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/01_%EB%8F%84%ED%98%95%EC%9D%98%EB%B0%A9%EC%A0%95%EC%8B%9D/1_2_1_%20%E1%84%83%E1%85%AE%20%E1%84%8C%E1%85%B5%E1%86%A8%E1%84%89%E1%85%A5%E1%86%AB%E1%84%8B%E1%85%B4%20%E1%84%91%E1%85%A7%E1%86%BC%E1%84%92%E1%85%A2%E1%86%BC%20%E1%84%8C%E1%85%A9%E1%84%80%E1%85%A5%E1%86%AB%E1%84%80%E1%85%AA%20%E1%84%89%E1%85%AE%E1%84%8C%E1%85%B5%E1%86%A8%20%E1%84%8C%E1%85%A9%E1%84%80%E1%85%A5%E1%86%AB.pdf?v=123598d795',
  },
  {
    title: '점과 직선 사이의 거리',
    url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/01_%EB%8F%84%ED%98%95%EC%9D%98%EB%B0%A9%EC%A0%95%EC%8B%9D/1_2_2_%20%E1%84%8C%E1%85%A5%E1%86%B7%E1%84%80%E1%85%AA%20%E1%84%8C%E1%85%B5%E1%86%A8%E1%84%89%E1%85%A5%E1%86%AB%20%E1%84%89%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%8B%E1%85%B4%20%E1%84%80%E1%85%A5%E1%84%85%E1%85%B5.pdf?v=374cf8f3c0',
  },
] as const;

const VIDEOS = [
  {
    step: '영상 1',
    title: '직선의 방정식',
    id: '088e36a4-926e-4876-849b-cea45e5b62c6',
  },
  {
    step: '영상 2',
    title: '두 직선의 위치관계',
    id: '522649b4-452f-45d4-bc4c-bb1c12b637e4',
  },
  {
    step: '영상 3',
    title: '점과 직선 사이의 거리',
    id: '9b63b85f-18de-4ea4-a6ee-c26b916e1daa',
  },
] as const;

function embedUrl(id: string): string {
  return `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=false&preload=true&responsive=true`;
}

export default function Gs1LineEquationSupplementPage() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
        <header className="border-b border-border-cream pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone">
            공통수학 · 오프라인 보강자료
          </p>
          <div className="mt-3 grid gap-5 md:grid-cols-[1fr_280px] md:items-end">
            <div>
              <h1 className="font-serif text-[28px] leading-tight tracking-tight md:text-[34px]">
                직선의 방정식 보강자료
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-olive">
                개념노트 2개와 개념강의 3개로 구성했습니다. 노트를 먼저 받은 뒤,
                영상을 순서대로 확인하세요.
              </p>
            </div>
            <div className="rounded-2xl border border-border-cream bg-ivory p-4 shadow-whisper">
              <p className="text-[12px] font-semibold text-charcoal">학습 순서</p>
              <ol className="mt-3 space-y-2 text-[13px] text-olive">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-terracotta" />
                  개념노트 먼저 풀기
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-terracotta" />
                  영상 보며 노트 보완하기
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-terracotta" />
                  복습 문제지로 마무리
                </li>
              </ol>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-3 md:grid-cols-5">
          {NOTES.map((note) => (
            <a
              key={note.url}
              href={getPdfDownloadHref(note.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-border-cream bg-ivory p-4 transition-all hover:border-terracotta/40 hover:shadow-ring-warm focus:outline-none focus-visible:shadow-ring-terracotta md:col-span-1"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                <Download className="h-4 w-4" />
              </span>
              <p className="mt-4 text-[12px] font-semibold text-terracotta">개념노트</p>
              <h2 className="mt-1 text-[15px] font-semibold leading-snug text-ink">
                {note.title}
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-olive">
                먼저 열고 풀이 공간에 직접 정리하세요.
              </p>
            </a>
          ))}

          {VIDEOS.map((video) => (
            <a
              key={video.id}
              href={embedUrl(video.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-border-cream bg-ivory p-4 transition-all hover:border-olive/40 hover:shadow-ring-warm focus:outline-none focus-visible:shadow-ring-warm md:col-span-1"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-olive/10 text-olive">
                <Play className="h-4 w-4" fill="currentColor" />
              </span>
              <p className="mt-4 text-[12px] font-semibold text-olive">{video.step}</p>
              <h2 className="mt-1 text-[15px] font-semibold leading-snug text-ink">
                {video.title}
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-olive">
                노트 확인 후 이어서 시청하세요.
              </p>
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
                  <li>3. 영상 2 보기</li>
                  <li>4. 영상 3 보기</li>
                </ol>
              </div>
              <div className="rounded-2xl border border-border-cream bg-ivory p-4">
                <p className="text-[13px] font-semibold text-ink">완료 기준</p>
                <ol className="mt-3 space-y-2 text-[13px] leading-5 text-olive">
                  <li>1. 개념노트 다 풀기</li>
                  <li>2. 영상 3개 다 보기</li>
                  <li>3. 복습 문제지 풀기</li>
                </ol>
              </div>
            </div>
          </aside>

          <div className="space-y-8">
            {VIDEOS.map((video) => (
              <section
                key={video.id}
                className="border-t border-border-cream pt-6 first:border-t-0 first:pt-0"
              >
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-[12px] font-semibold text-terracotta">{video.step}</p>
                  <h2 className="font-serif text-[21px] tracking-tight text-ink">
                    {video.title}
                  </h2>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border-cream bg-ink shadow-whisper">
                  <iframe
                    src={embedUrl(video.id)}
                    title={`직선의 방정식 보강자료 ${video.title}`}
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
  );
}
