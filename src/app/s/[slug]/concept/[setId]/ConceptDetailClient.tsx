'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, FileText, Download, Play, CheckCircle2, BookOpen,
  Loader2, Check,
} from 'lucide-react';
import LearningVideoPlayer from '@/components/LearningVideoPlayer';
import { SUBJECT_LABELS } from '@/components/blocks/types';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';

interface PdfItem {
  url: string;
  original_name?: string;
  file_size?: string;
}

interface ConceptVideo {
  bunny_video_id: string;
  title: string;
  lecture_number: number | null;
  order_index: number;
  duration_seconds: number | null;
  progress: { watch_percent: number; completed: boolean } | null;
}

interface ConceptReview {
  textbookName: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  note: string | null;
  label: string;
}

interface ConceptSet {
  id: string;
  title: string;
  description: string | null;
  review: ConceptReview | null;
  subject_slug: string;
  chapter_order: number | null;
  pdfs: PdfItem[];
  videos: ConceptVideo[];
}

interface Props {
  setId: string;
  backHref: string;
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds < 1) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}시간 ${m % 60}분`;
  }
  return s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${m}분`;
}

function cleanTitle(title: string): string {
  return title
    .replace(/^(?:대수|미적분1)\s*개념\s*\d+강\s*/, '')
    .replace(/^(?:공수1|공수2|공통수학1|공통수학2)\s*\d+강(?:\s*개념)?\s*/, '')
    .replace(/^\d+(?:\.\d+)+\.?\s*/, '')
    .replace(/(?:\.remuxed)?\.mp4$/i, '')
    .replace(/\s+copy$/i, '')
    .trim();
}

export default function ConceptDetailClient({ setId, backHref }: Props) {
  const [set, setSet] = useState<ConceptSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/public/student/concept-lectures');
        const d = await res.json();
        const found = (d.sets || []).find((s: ConceptSet) => s.id === setId);
        setSet(found || null);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [setId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment/30">
        <Loader2 className="w-6 h-6 animate-spin text-stone" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="min-h-screen px-5 py-12 bg-parchment/30">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-[13px] text-stone hover:text-terracotta"
        >
          <ChevronLeft className="w-4 h-4" /> 돌아가기
        </Link>
        <p className="mt-12 text-center text-stone">차시를 찾을 수 없습니다</p>
      </div>
    );
  }

  const subjectLabel = SUBJECT_LABELS[set.subject_slug] || set.subject_slug;
  const completedVideos = set.videos.filter(v => v.progress?.completed).length;
  const totalVideos = set.videos.length;
  const allVideosDone = totalVideos > 0 && completedVideos === totalVideos;

  return (
    <div className="min-h-screen bg-parchment/30">
      {/* ─── Sticky header ─── */}
      <header className="sticky top-0 z-20 bg-ivory/95 backdrop-blur-sm border-b border-border-cream">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[13px] text-stone hover:text-terracotta transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>돌아가기</span>
          </Link>
          {totalVideos > 0 && (
            <span className="text-[12px] text-olive tabular-nums">
              영상 {completedVideos}/{totalVideos}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pb-24">
        {/* ─── Title ─── */}
        <div className="pt-10 pb-8">
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone mb-2 font-medium">
            {subjectLabel} · 개념강의
          </p>
          <h1 className="font-serif font-medium text-[26px] text-ink tracking-tight leading-tight">
            {set.title}
          </h1>
        </div>

        {/* ─── STEPS (좌측 세로 타임라인 + 마커) ─── */}
        {(() => {
          const step1Done = pdfDownloaded || set.pdfs.length === 0;
          const step2Done = set.videos.length === 0 || allVideosDone;
          const step3Done = false; // 자동 감지 불가
          const stepStates = [step1Done, step2Done, step3Done];
          const activeIdx = stepStates.findIndex(s => !s);

          const Marker = ({ num, done, active }: { num: number; done: boolean; active: boolean }) => (
            <span className="absolute left-0 top-0 w-8 h-8" aria-hidden>
              {active && (
                <span className="absolute inset-0 rounded-full border-2 border-terracotta animate-ping opacity-30" />
              )}
              <span className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                done
                  ? 'bg-terracotta text-ivory shadow-ring-terracotta'
                  : active
                    ? 'bg-ivory border-2 border-terracotta text-terracotta'
                    : 'bg-ivory border-2 border-terracotta/25 text-terracotta/60'
              }`}>
                {done
                  ? <Check className="w-4 h-4" strokeWidth={2.5} />
                  : <span className="text-[13px] font-medium tabular-nums">{num}</span>}
              </span>
            </span>
          );

          const Tail = ({ done }: { done: boolean }) => (
            <span
              className={`absolute left-[15px] top-10 bottom-0 w-0.5 transition-colors duration-700 ${
                done ? 'bg-terracotta/60' : 'bg-terracotta/20'
              }`}
              aria-hidden
            />
          );

          return (
            <>
              {/* STEP 1: PDF */}
              {set.pdfs.length > 0 && (
                <section className="relative pl-12 pb-12">
                  <Marker num={1} done={step1Done} active={activeIdx === 0} />
                  <Tail done={step1Done} />
                  <h2 className="font-serif font-medium text-[20px] text-ink tracking-tight pt-1">
                    학습지 받기
                  </h2>
                  <p className="text-[13px] text-olive mt-1.5 mb-5">
                    영상을 보기 전 학습지를 다운로드해서 준비하세요
                  </p>
                  <div className="space-y-2.5">
                    {set.pdfs.map((p, idx) => (
                      <a
                        key={idx}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setPdfDownloaded(true)}
                        className="group flex items-center gap-3 px-4 py-4 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 hover:shadow-ring-warm transition-all"
                      >
                        <div className="w-11 h-11 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-terracotta" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[14px] text-ink truncate">
                            {p.original_name || '학습지 PDF'}
                          </p>
                          {p.file_size && (
                            <p className="text-[12px] text-stone mt-0.5">{p.file_size}</p>
                          )}
                        </div>
                        <Download className="w-4 h-4 text-stone group-hover:text-terracotta shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                  {pdfDownloaded && (
                    <p className="text-[12px] text-olive mt-3">
                      ✓ 다운로드 완료 — 학습지를 옆에 두고 영상을 보세요
                    </p>
                  )}
                </section>
              )}

              {/* STEP 2: Videos */}
              {set.videos.length > 0 && (
                <section className="relative pl-12 pb-12">
                  <Marker num={2} done={step2Done} active={activeIdx === 1} />
                  <Tail done={step2Done} />
                  <h2 className="font-serif font-medium text-[20px] text-ink tracking-tight pt-1">
                    강의 시청
                  </h2>
                  <p className="text-[13px] text-olive mt-1.5 mb-5">
                    학습지를 보면서 영상을 차례대로 시청하세요
                  </p>
                  <div className="space-y-3">
                    {set.videos.map(v => {
                      const isOpen = activeVideoId === v.bunny_video_id;
                      const isDone = v.progress?.completed;
                      return (
                        <div
                          key={v.bunny_video_id}
                          className="bg-ivory border border-border-cream rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => setActiveVideoId(isOpen ? null : v.bunny_video_id)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-sand transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-terracotta shrink-0" />
                            ) : (
                              <Play className={`w-5 h-5 shrink-0 ${isOpen ? 'text-terracotta' : 'text-stone'}`} />
                            )}
                            <span className={`text-[14px] flex-1 truncate ${isDone ? 'text-stone' : 'text-charcoal'} ${isOpen ? 'font-medium text-ink' : ''}`}>
                              {v.lecture_number != null ? `${v.lecture_number}강` : ''} {cleanTitle(v.title)}
                            </span>
                            {formatDuration(v.duration_seconds) && (
                              <span className="text-[12px] text-stone shrink-0 tabular-nums">
                                {formatDuration(v.duration_seconds)}
                              </span>
                            )}
                            {v.progress && !isDone && v.progress.watch_percent > 0 && (
                              <span className="text-[12px] text-stone shrink-0 tabular-nums">
                                {v.progress.watch_percent}%
                              </span>
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-3 pb-3">
                              <LearningVideoPlayer
                                bunnyVideoId={v.bunny_video_id}
                                libraryId={CONCEPT_LIBRARY_ID}
                                initialProgress={v.progress?.watch_percent || 0}
                                initialCompleted={v.progress?.completed || false}
                                progressEndpoint="/api/public/student/watch-progress"
                                onProgressUpdate={(percent, completed) => {
                                  setSet(prev => prev ? {
                                    ...prev,
                                    videos: prev.videos.map(vid =>
                                      vid.bunny_video_id === v.bunny_video_id
                                        ? { ...vid, progress: { watch_percent: percent, completed } }
                                        : vid,
                                    ),
                                  } : prev);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* STEP 3: 교재 복습 (마지막 — Tail 없음) */}
              {(set.review || set.description) && (
                <section className="relative pl-12">
                  <Marker num={3} done={step3Done} active={activeIdx === 2} />
                  <h2 className="font-serif font-medium text-[20px] text-ink tracking-tight pt-1">
                    교재 복습
                  </h2>
                  <p className="text-[13px] text-olive mt-1.5 mb-5">
                    영상 시청 후, 교재를 풀며 배운 내용을 정리하세요
                  </p>

                  {/* 메인: 풀이 범위 */}
                  <div
                    className={`rounded-2xl px-6 py-8 text-center border-2 transition-colors mb-3 ${
                      allVideosDone
                        ? 'bg-terracotta/8 border-terracotta/30'
                        : 'bg-ivory border-border-cream'
                    }`}
                  >
                    <BookOpen
                      className={`w-10 h-10 mx-auto mb-4 ${
                        allVideosDone ? 'text-terracotta' : 'text-stone/60'
                      }`}
                    />
                    <p className="font-serif font-medium text-[22px] text-ink tracking-tight leading-snug">
                      {set.review?.label || set.description}
                    </p>
                    <p className="text-[14px] text-charcoal mt-2 font-medium">풀이하기</p>
                    {!allVideosDone && totalVideos > 0 && (
                      <p className="text-[12px] text-stone mt-4">
                        강의를 모두 시청한 후 진행하세요 ({completedVideos}/{totalVideos})
                      </p>
                    )}
                  </div>

                  {/* 풀이 후 — 답안 제출 + 오답관리 */}
                  <div className="rounded-2xl bg-ivory border border-border-cream px-5 py-5">
                    <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-4">
                      풀이 후
                    </p>
                    <ol className="space-y-3 text-[13px] text-charcoal">
                      <li className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-terracotta/10 text-terracotta font-medium text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span className="leading-relaxed">교재 답안을 <span className="font-medium text-ink">매쓰플랫 앱</span>에 제출</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-terracotta/10 text-terracotta font-medium text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span className="leading-relaxed">카톡으로 <span className="font-medium text-ink">'제출완료'</span> 보내기</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-terracotta/10 text-terracotta font-medium text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span className="leading-relaxed">선생님이 보내주는 <span className="font-medium text-ink">오답관리</span>로 마무리</span>
                      </li>
                    </ol>
                    <div className="mt-5 pt-4 border-t border-border-cream/70 text-[12px] text-olive leading-relaxed">
                      💡 모르는 문제는 앱 내 해설강의를 참고하거나, 카톡으로 캡쳐해서 질문하세요
                    </div>
                  </div>
                </section>
              )}
            </>
          );
        })()}

        {/* ─── 비어있을 때 ─── */}
        {set.pdfs.length === 0 && set.videos.length === 0 && !set.description && (
          <div className="text-center py-16 text-stone">
            아직 콘텐츠가 준비되지 않았습니다
          </div>
        )}
      </main>
    </div>
  );
}
