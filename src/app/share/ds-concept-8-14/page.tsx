import { createClient as createServiceClient } from '@supabase/supabase-js';
import { Download, FileText, Play } from 'lucide-react';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import type { ConceptGateConfig } from '../_components/conceptAccess';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '대수 개념 8~14차시 보충자료',
  robots: { index: false, follow: false },
};

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'ds_concept_8_14_unlocked',
  path: '/share/ds-concept-8-14',
  tokenSeed: 'ds-concept-8-14:v1',
  passcodeEnvKeys: ['DS_CONCEPT_PART2_PASSCODE', 'DS_CONCEPT_PASSCODE'],
};

interface PdfItem {
  url: string;
  original_name?: string;
  file_size?: string;
}

interface VideoRow {
  set_id: string;
  bunny_video_id: string;
  title: string;
  problem_number: number | null;
  order_index: number;
  duration_seconds: number | null;
}

interface ChapterSet {
  id: string;
  title: string;
  description: string | null;
  chapter_order: number | null;
  pdfs: PdfItem[];
  pdf_url: string | null;
  pdf_filename: string | null;
}

class MissingEnvError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable: ${name}`);
    this.name = 'MissingEnvError';
  }
}

type ChapterWithVideos = ChapterSet & {
  readonly videos: readonly VideoRow[];
};

type PageProps = {
  readonly searchParams?: Promise<{
    readonly gate?: string | readonly string[];
  }>;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value) return value;
  throw new MissingEnvError(name);
}

function fmtDuration(s: number | null): string | null {
  if (!s || s < 1) return null;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return sec > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${m}분`;
}

function cleanVideoTitle(t: string): string {
  return t
    .replace(/^대수\s*개념\s*\d+강\s*/, '')
    .replace(/(?:\.remuxed)?\.mp4$/i, '')
    .trim();
}

async function loadChapters() {
  const sc = createServiceClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_KEY'),
  );

  const { data: sets } = await sc
    .from('learning_sets')
    .select('id, title, description, chapter_order, pdfs, pdf_url, pdf_filename')
    .eq('kind', 'concept')
    .eq('subject_slug', 'ds')
    .gte('chapter_order', 8)
    .lte('chapter_order', 14)
    .order('chapter_order', { ascending: true })
    .returns<ChapterSet[]>();

  const chapters = sets || [];

  const ids = chapters.map((c) => c.id);
  const { data: vids } = ids.length
    ? await sc
        .from('learning_set_videos')
        .select('set_id, bunny_video_id, title, problem_number, order_index, duration_seconds')
        .in('set_id', ids)
        .order('order_index', { ascending: true })
        .returns<VideoRow[]>()
    : { data: [] };

  const videosBySet = new Map<string, VideoRow[]>();
  for (const v of vids || []) {
    if (!v.bunny_video_id) continue;
    const existing = videosBySet.get(v.set_id);
    if (existing) {
      existing.push(v);
    } else {
      videosBySet.set(v.set_id, [v]);
    }
  }

  return chapters.map((c): ChapterWithVideos => ({
    ...c,
    pdfs: c.pdfs && c.pdfs.length
      ? c.pdfs
      : c.pdf_url
        ? [{ url: c.pdf_url, original_name: c.pdf_filename || '학습지' }]
        : [],
    videos: videosBySet.get(c.id) || [],
  }));
}

export default async function DsConcept8to14SharePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="대수"
      heading="8차시 ~ 14차시"
      gate={resolvedSearchParams?.gate}
    >
      <DsConcept8to14Content />
    </ConceptAccessPage>
  );
}

async function DsConcept8to14Content() {
  const chapters = await loadChapters();

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-3xl mx-auto px-5 py-10 md:py-14">
        <header className="pb-8 mb-10 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            대수 · 개념강의 보충자료
          </p>
          <h1 className="font-serif text-[28px] md:text-[32px] mt-2 tracking-tight leading-tight">
            8차시 ~ 14차시
          </h1>
          <p className="text-[13px] text-olive mt-3">
            학습지를 먼저 받고, 옆에 두고 영상을 보세요.
          </p>
        </header>

        <div className="space-y-14">
          {chapters.map((c) => (
            <section key={c.id} id={`ch-${c.chapter_order}`}>
              <div className="mb-5">
                <h2 className="font-serif text-[22px] md:text-[24px] tracking-tight">
                  {c.title}
                </h2>
                {c.description && (
                  <p className="text-[13px] text-olive mt-1.5">{c.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* 좌측: 학습지 */}
                <div>
                  <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
                    학습지
                  </p>
                  {c.pdfs.length > 0 ? (
                    <div className="space-y-2">
                      {c.pdfs.map((p, i) => (
                        <a
                          key={i}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
                            <FileText className="w-4.5 h-4.5 text-terracotta" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[13px] truncate">
                              {p.original_name || '학습지 PDF'}
                            </p>
                            {p.file_size && (
                              <p className="text-[11px] text-stone mt-0.5">{p.file_size}</p>
                            )}
                          </div>
                          <Download className="w-4 h-4 text-stone shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-stone italic">학습지 없음</p>
                  )}
                </div>

                {/* 우측: 영상 (클릭 시 새창) */}
                <div>
                  <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
                    개념강의
                  </p>
                  {c.videos.length > 0 ? (
                    <ol className="space-y-2">
                      {c.videos.map((v) => {
                        const dur = fmtDuration(v.duration_seconds);
                        return (
                          <li key={v.bunny_video_id}>
                            <a
                              href={`https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${v.bunny_video_id}?autoplay=true&preload=true&responsive=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors group"
                            >
                              <div className="w-9 h-9 rounded-lg bg-olive/10 flex items-center justify-center shrink-0 group-hover:bg-olive/20 transition-colors">
                                <Play className="w-4 h-4 text-olive ml-0.5" fill="currentColor" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[13px] truncate">
                                  {v.problem_number != null && (
                                    <span className="text-terracotta mr-1.5">{v.problem_number}강</span>
                                  )}
                                  {cleanVideoTitle(v.title)}
                                </p>
                                {dur && (
                                  <p className="text-[11px] text-stone mt-0.5 tabular-nums">{dur}</p>
                                )}
                              </div>
                            </a>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="text-[12px] text-stone italic">영상 없음</p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-20 pt-6 border-t border-border-cream text-center">
          <p className="text-[12px] text-stone">고T수학</p>
        </footer>
      </main>
    </div>
  );
}
