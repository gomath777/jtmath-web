import type { Metadata } from 'next';
import { CheckCircle2, Download, Play, Route } from 'lucide-react';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '공통수학2 · 평행이동 대칭이동 보강자료',
  description: '공통수학2 평행이동과 대칭이동 보강용 개념노트와 개념강의',
  robots: { index: false, follow: false },
};

const NOTES = [
  {
    title: '평행이동',
    url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/03_%EB%8F%84%ED%98%95%EC%9D%98%EC%9D%B4%EB%8F%99/1_4_1_%20%ED%8F%89%ED%96%89%EC%9D%B4%EB%8F%99.pdf?v=0ff2a86a29',
  },
  {
    title: '대칭이동',
    url: 'https://mathgo-pdfs.b-cdn.net/concept/gs2/03_%EB%8F%84%ED%98%95%EC%9D%98%EC%9D%B4%EB%8F%99/1_4_2_%20%EB%8C%80%EC%B9%AD%EC%9D%B4%EB%8F%99.pdf?v=efc24ed166',
  },
] as const;

const VIDEOS = [
  {
    step: '영상 1',
    title: '평행이동',
    id: '11c31370-fedf-4216-88d8-6f4a56174877',
  },
  {
    step: '영상 2',
    title: '대칭이동',
    id: 'cd457a3e-b487-4342-964d-d1139dba5bc2',
  },
] as const;

function embedUrl(id: string): string {
  return `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=false&preload=true&responsive=true`;
}

export default function Gs2TransformSupplementPage() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
        <header className="border-b border-border-cream pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone">
            공통수학2 · 오프라인 보강자료
          </p>
          <div className="mt-3 grid gap-5 md:grid-cols-[1fr_280px] md:items-end">
            <div>
              <h1 className="font-serif text-[28px] leading-tight tracking-tight md:text-[34px]">
                평행이동 · 대칭이동 보강자료
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-olive">
                개념노트 2개와 개념강의 2개로 구성했습니다. 노트를 먼저 받은 뒤,
                평행이동부터 대칭이동 순서로 확인하세요.
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

        <section className="mt-8 grid gap-3 md:grid-cols-4">
          {NOTES.map((note) => (
            <a
              key={note.url}
              href={getPdfDownloadHref(note.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-border-cream bg-ivory p-4 transition-all hover:border-terracotta/40 hover:shadow-ring-warm focus:outline-none focus-visible:shadow-ring-terracotta"
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
              className="group rounded-2xl border border-border-cream bg-ivory p-4 transition-all hover:border-olive/40 hover:shadow-ring-warm focus:outline-none focus-visible:shadow-ring-warm"
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
                  <li>1. 평행이동 개념노트 풀기</li>
                  <li>2. 평행이동 영상 보기</li>
                  <li>3. 대칭이동 개념노트 풀기</li>
                  <li>4. 대칭이동 영상 보기</li>
                </ol>
              </div>
              <div className="rounded-2xl border border-border-cream bg-ivory p-4">
                <p className="text-[13px] font-semibold text-ink">완료 기준</p>
                <ol className="mt-3 space-y-2 text-[13px] leading-5 text-olive">
                  <li>1. 개념노트 다 풀기</li>
                  <li>2. 영상 2개 다 보기</li>
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
                    title={`공통수학2 평행이동 대칭이동 보강자료 ${video.title}`}
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
