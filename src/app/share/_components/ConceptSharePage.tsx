import { Download, Play } from 'lucide-react';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';

export type ConceptPdf = {
  readonly name: string;
  readonly url: string;
};

export type ConceptVideo = {
  readonly num: number;
  readonly title: string;
  readonly id: string;
};

export type ConceptLesson = {
  readonly order: number;
  readonly title: string;
  readonly pdfs: readonly ConceptPdf[];
  readonly videos: readonly ConceptVideo[];
};

type ConceptSharePageProps = {
  readonly subjectLabel: string;
  readonly heading: string;
  readonly lessons: readonly ConceptLesson[];
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

function displayTitle(title: string): string {
  return title
    .replace(/^대수\s*개념\s*\d+강\s*/, '')
    .replace(/\.mp4$/i, '')
    .trim();
}

export function ConceptSharePage({ subjectLabel, heading, lessons }: ConceptSharePageProps) {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            {subjectLabel} · 개념강의
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            {heading}
          </h1>
          <p className="text-[13px] text-olive mt-2">
            개념노트 먼저 받고, 해당 강 노트 옆에 두고 영상 보세요.
          </p>
        </div>

        <div className="space-y-10">
          {lessons.map((lesson) => (
            <section key={lesson.order}>
              <div className="flex items-baseline gap-2 mb-4">
                <h2 className="font-serif text-[20px] tracking-tight">{lesson.title}</h2>
                <span className="text-[12px] text-stone font-mono">{lesson.order}차시</span>
              </div>

              <div className="space-y-2">
                {lesson.pdfs.map((pdf) => (
                  <a
                    key={pdf.url}
                    href={pdf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 hover:shadow-ring-warm transition-all"
                  >
                    <span className="inline-flex items-center justify-center min-w-[64px] h-6 px-2 rounded-md bg-terracotta/10 text-terracotta text-[11px] font-semibold shrink-0">
                      개념노트
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-ink min-w-0 leading-snug">
                      {pdf.name}
                    </span>
                    <Download className="w-3.5 h-3.5 text-stone shrink-0" />
                  </a>
                ))}

                {lesson.videos.map((video) => (
                  <a
                    key={video.id}
                    href={EMBED(video.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-olive/40 hover:shadow-ring-warm transition-all"
                  >
                    <span className="inline-flex items-center justify-center min-w-[64px] h-6 px-2 rounded-md bg-olive/10 text-olive text-[11px] font-semibold shrink-0 tabular-nums">
                      {video.num}강
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-ink min-w-0 leading-snug">
                      {displayTitle(video.title)}
                    </span>
                    <Play className="w-3.5 h-3.5 text-olive shrink-0" fill="currentColor" />
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
