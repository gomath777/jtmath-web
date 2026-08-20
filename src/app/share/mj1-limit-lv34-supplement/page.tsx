import type { Metadata } from 'next';
import { Download, FileText, Play, Video } from 'lucide-react';
import { ConceptAccessGate } from '../_components/ConceptAccessGate';
import {
  isConceptPageUnlocked,
  readGateStatus,
  unlockConceptPage,
  type ConceptGateConfig,
} from '../_components/conceptAccess';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import { LIMIT_SUPPLEMENT_SECTIONS } from './data';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '미적분1 · 함수의 극한 레벨3·4 보강자료',
  description: '미적분1 함수의 극한 레벨3, 레벨4 보강용 PDF와 해설강의',
  robots: { index: false, follow: false },
};

const PAGE_PATH = '/share/mj1-limit-lv34-supplement';

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'mj1_limit_lv34_supplement',
  path: PAGE_PATH,
  tokenSeed: 'mj1-limit-lv34-supplement-2026',
  passcodeEnvKeys: [],
};

type PageProps = {
  readonly searchParams?: {
    readonly gate?: string | readonly string[];
  };
};

async function unlock(formData: FormData): Promise<void> {
  'use server';

  await unlockConceptPage(formData, GATE_CONFIG);
}

function embedUrl(id: string): string {
  return `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;
}

export default async function Mj1LimitLv34SupplementPage({ searchParams }: PageProps) {
  const isUnlocked = await isConceptPageUnlocked(GATE_CONFIG);

  if (!isUnlocked) {
    return (
      <ConceptAccessGate
        subjectLabel="미적분1"
        heading="함수의 극한 레벨3·4 보강자료"
        status={readGateStatus(searchParams?.gate)}
        action={unlock}
        eyebrowSuffix="보강자료"
        inputLabel="비밀번호"
        inputHelp="전달받은 6자리 비밀번호를 입력하세요."
        placeholder="비밀번호 6자리"
      />
    );
  }

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="mx-auto max-w-5xl px-5 py-9 md:px-8 md:py-12">
        <header className="border-b border-border-cream pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone">
            미적분1 · 개별 보강자료
          </p>
          <div className="mt-3 grid gap-5 md:grid-cols-[1fr_260px] md:items-end">
            <div>
              <h1 className="font-serif text-[28px] leading-tight tracking-tight md:text-[34px]">
                함수의 극한 레벨3·4
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-olive">
                함수의 극한 레벨3, 레벨4 학습지와 촬영된 해설강의만 모았습니다.
                운영용 학생 캘린더와 분리된 보강 페이지입니다.
              </p>
            </div>
            <div className="rounded-2xl border border-border-cream bg-ivory p-4 shadow-whisper">
              <p className="text-[12px] font-semibold text-charcoal">현재 구성</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <p className="text-[22px] font-semibold leading-none text-ink">
                    {LIMIT_SUPPLEMENT_SECTIONS.length}
                  </p>
                  <p className="mt-1 text-stone">PDF</p>
                </div>
                <div>
                  <p className="text-[22px] font-semibold leading-none text-ink">
                    {LIMIT_SUPPLEMENT_SECTIONS.reduce(
                      (count, section) => count + section.videos.length,
                      0,
                    )}
                  </p>
                  <p className="mt-1 text-stone">해설강의</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-8 space-y-8">
          {LIMIT_SUPPLEMENT_SECTIONS.map((section) => (
            <section
              key={section.level}
              className="rounded-2xl border border-border-cream bg-ivory p-4 shadow-whisper md:p-5"
            >
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-terracotta">{section.level}</p>
                  <h2 className="mt-1 font-serif text-[22px] leading-tight tracking-tight text-ink">
                    {section.title}
                  </h2>
                </div>
                <p className="text-[12px] text-stone">해설강의 {section.videos.length}개</p>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
                <a
                  href={getPdfDownloadHref(section.pdf.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-[112px] flex-col justify-between rounded-xl border border-border-cream bg-parchment p-4 transition-colors hover:border-terracotta/45 focus:outline-none focus-visible:shadow-ring-terracotta"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="mt-4 block text-[13px] font-semibold leading-snug text-ink">
                      {section.pdf.name}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[12px] text-stone">
                      {section.pdf.size}
                      <Download className="h-3.5 w-3.5" />
                    </span>
                  </span>
                </a>

                <div>
                  <p className="mb-2.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-stone">
                    <Video className="h-3.5 w-3.5" />
                    해설강의
                  </p>
                  {section.videos.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {section.videos.map((video) => (
                        <a
                          key={video.id}
                          href={embedUrl(video.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-3 rounded-xl border border-border-cream bg-parchment px-3.5 py-3 transition-colors hover:border-olive/45 focus:outline-none focus-visible:shadow-ring-warm"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-olive/10 text-olive group-hover:bg-olive/20">
                            <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold text-terracotta">
                              {video.problemNumber}번
                            </span>
                            <span className="block truncate text-[13px] text-charcoal">
                              {video.source}
                            </span>
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border-warm bg-parchment px-4 py-5 text-[13px] text-stone">
                      촬영된 해설강의가 아직 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
