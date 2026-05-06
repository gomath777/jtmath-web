'use client';

import { useState } from 'react';
import { Download, FileText, Play, CheckCircle2, BookOpen, Lightbulb } from 'lucide-react';
import LearningVideoPlayer from '@/components/LearningVideoPlayer';
import type { ProgressMap } from './types';

interface PdfItem {
  url: string;
  cdn_url?: string;
  original_name: string;
  file_size?: string;
}

interface VideoItem {
  bunny_video_id: string;
  title: string;
  problem_number: number;
  raw_text?: string;
  order_index?: number;
  duration_seconds?: number | null;
}

interface SideContent {
  label: string;
  pdf: PdfItem;
  hintbook?: PdfItem;
}

interface ContentGroupContent {
  label: string;
  step?: number | string;
  description?: string;
  is_optional?: boolean;
  is_bonus?: boolean;
  pdf?: PdfItem;
  pdfs?: PdfItem[];
  hintbook?: PdfItem;
  videos?: VideoItem[];
  page_range?: string;
  guide_text?: string;
  side_a?: SideContent;
  side_b?: SideContent;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getSubLabel(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('레벨5') || l.includes('고난도')) return '고난도 도전';
  if (l.includes('레벨4')) return '심화 문제';
  if (l.includes('레벨3')) return '실전 문제';
  if (l.includes('올 스캔') || l.includes('올스캔')) return '전 범위 점검';
  if (l.includes('단계')) return '심화유형';
  return '기본 문제';
}

// ─── 타임라인 스텝 (개념강의 전용) ─────────────────────────────────────────────
function TimelineStep({
  number,
  title,
  description,
  isLast = false,
  children,
}: {
  number: number;
  title: string;
  description: string;
  isLast?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0" style={{ width: 32 }}>
        <div className="w-8 h-8 rounded-full border-2 border-terracotta bg-ivory flex items-center justify-center shrink-0">
          <span className="text-[13px] font-semibold text-terracotta">{number}</span>
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border-cream mt-1.5 mb-0" style={{ minHeight: 24 }} />
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isLast ? 'pb-2' : 'pb-7'}`}>
        <h3 className="text-[16px] font-semibold text-ink tracking-tight leading-tight mt-0.5">
          {title}
        </h3>
        <p className="text-[13px] text-stone mt-0.5 mb-4 leading-snug">{description}</p>
        {children}
      </div>
    </div>
  );
}

// ─── 개념강의 레이아웃 ──────────────────────────────────────────────────────────
function ConceptLayout({
  data,
  progress,
  progressEndpoint,
}: {
  data: ContentGroupContent;
  progress: ProgressMap;
  progressEndpoint?: string;
}) {
  const pdf = data.pdf;
  const pdfs = data.pdfs || (pdf ? [pdf] : []);
  const videos = (data.videos || []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const pageRange = data.page_range;

  const [activeVideo, setActiveVideo] = useState<number | null>(null);

  const completedCount = videos.filter(v => progress[v.bunny_video_id]?.completed).length;
  const allVideosWatched = videos.length > 0 && completedCount === videos.length;

  return (
    <div className="pt-1">
      {/* ① 학습지 받기 */}
      {pdfs.length > 0 && (
        <TimelineStep
          number={1}
          title="학습지 받기"
          description="영상을 보기 전 학습지를 다운로드해서 준비하세요"
        >
          <div className="space-y-2">
            {pdfs.map((p, idx) => {
              const url = p.url || p.cdn_url || '';
              const name = p.original_name || 'document.pdf';
              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-4 py-3.5 rounded-xl bg-sand hover:bg-white hover:shadow-ring-warm transition-all border border-border-cream"
                >
                  <div className="w-9 h-9 rounded-lg bg-crimson/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4.5 h-4.5 text-crimson" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate tracking-tight">{name}</p>
                    {p.file_size && <p className="text-[11px] text-stone mt-0.5">{p.file_size}</p>}
                  </div>
                  <Download className="w-4 h-4 text-stone group-hover:text-terracotta transition-colors shrink-0" />
                </a>
              );
            })}
          </div>
        </TimelineStep>
      )}

      {/* ② 강의 시청 */}
      {videos.length > 0 && (
        <TimelineStep
          number={pdfs.length > 0 ? 2 : 1}
          title="강의 시청"
          description="학습지를 보면서 영상을 차례대로 시청하세요"
        >
          <div className="rounded-xl border border-border-cream overflow-hidden bg-sand divide-y divide-border-cream">
            {videos.map((video, idx) => {
              const p = progress[video.bunny_video_id];
              const isActive = activeVideo === idx;
              const isDone = p?.completed;
              const videoLabel = video.title || `${video.problem_number}번 해설강의`;

              return (
                <div key={idx}>
                  <button
                    onClick={() => setActiveVideo(isActive ? null : idx)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-white' : 'hover:bg-white/60'}`}
                  >
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4 text-terracotta shrink-0" />
                      : <Play className={`w-4 h-4 shrink-0 ${isActive ? 'text-terracotta' : 'text-stone'}`} />
                    }
                    <span className={`text-[13px] flex-1 leading-snug ${isDone ? 'text-stone line-through' : 'text-charcoal'} ${isActive ? 'font-medium text-ink no-underline' : ''}`}
                      style={isDone && !isActive ? {} : { textDecoration: 'none' }}>
                      {videoLabel}
                    </span>
                    {video.duration_seconds ? (
                      <span className="text-[12px] text-stone shrink-0">{formatDuration(video.duration_seconds)}</span>
                    ) : p && !isDone ? (
                      <span className="text-[11px] text-stone shrink-0">{p.watch_percent}%</span>
                    ) : null}
                  </button>
                  {isActive && (
                    <div className="px-4 pb-4 pt-2 bg-white">
                      <LearningVideoPlayer
                        bunnyVideoId={video.bunny_video_id}
                        libraryId="566809"
                        initialProgress={p?.watch_percent || 0}
                        initialCompleted={p?.completed || false}
                        progressEndpoint={progressEndpoint}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TimelineStep>
      )}

      {/* ③ 개념서 복습 */}
      <TimelineStep
        number={(pdfs.length > 0 ? 1 : 0) + (videos.length > 0 ? 1 : 0) + 1}
        title="개념서 복습"
        description="영상 시청 후, 개념서를 풀며 배운 내용을 정리하세요"
        isLast
      >
        <div className={`rounded-xl border border-border-cream p-5 text-center mb-4 transition-colors ${allVideosWatched ? 'bg-sand' : 'bg-sand/50'}`}>
          <BookOpen className={`w-7 h-7 mx-auto mb-2 ${allVideosWatched ? 'text-terracotta' : 'text-stone'}`} />
          {pageRange ? (
            <p className={`text-[15px] font-semibold tracking-tight ${allVideosWatched ? 'text-ink' : 'text-stone'}`}>
              개념서 {pageRange}
            </p>
          ) : (
            <p className="text-[14px] text-stone">개념서 풀이</p>
          )}
          <p className="text-[12px] text-terracotta font-medium mt-2">풀이하기</p>
          {videos.length > 0 && (
            <p className="text-[11px] text-stone mt-2">
              {allVideosWatched
                ? '강의를 모두 시청했습니다 ✓'
                : `강의를 모두 시청한 후 진행하세요 (${completedCount}/${videos.length})`}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border-cream bg-ivory overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border-cream">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-stone">풀이 후</span>
          </div>
          <div className="divide-y divide-border-cream">
            {[
              '개념서 답안을 메쓰플랫 앱에 제출',
              "카톡으로 '제출완료' 보내기",
              '선생님이 보내주는 오답관리로 마무리',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="w-5 h-5 rounded-full bg-terracotta/10 text-terracotta text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[13px] text-charcoal leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </TimelineStep>
    </div>
  );
}

// ─── 심화유형 A/B 양면 한 칸 ─────────────────────────────────────────────────
function SidePanel({ side }: { side: SideContent }) {
  const url = side.pdf.url || side.pdf.cdn_url || '';
  const hintUrl = side.hintbook ? (side.hintbook.url || side.hintbook.cdn_url || '') : '';
  return (
    <div className="p-4 space-y-2">
      <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-stone mb-2.5">{side.label}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 px-3 py-3 rounded-xl bg-sand hover:bg-white hover:shadow-ring-warm transition-all border border-border-cream"
      >
        <FileText className="w-4 h-4 text-charcoal shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-ink truncate">{side.pdf.original_name}</p>
          {side.pdf.file_size && <p className="text-[10px] text-stone mt-0.5">{side.pdf.file_size}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-1 text-[10px] tracking-wider uppercase font-medium text-charcoal bg-ivory px-2 py-1 rounded-md shadow-ring-warm group-hover:bg-terracotta group-hover:text-ivory transition-all">
          <Download className="w-3 h-3" />
          PDF
        </div>
      </a>
      {side.hintbook && (
        <a
          href={hintUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-terracotta/[0.06] border border-terracotta/20 hover:bg-terracotta/10 transition-all"
        >
          <Lightbulb className="w-3.5 h-3.5 text-terracotta shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-wider uppercase font-medium text-terracotta">힌트북</p>
            <p className="text-[11px] text-olive">힌트만 보고 재도전</p>
          </div>
          <Download className="w-3 h-3 text-terracotta/60 shrink-0" />
        </a>
      )}
    </div>
  );
}

// ─── 심화유형 A·B 2열 레이아웃 ───────────────────────────────────────────────
function ShimhwaPairLayout({ data }: { data: ContentGroupContent }) {
  const sideA = data.side_a!;
  const sideB = data.side_b!;
  const stepStr = data.step != null
    ? (typeof data.step === 'number' ? String(data.step).padStart(2, '0') : data.step)
    : null;

  return (
    <div className="bg-ivory border border-border-cream rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 pt-5 pb-4 border-b border-border-cream">
        <div className="flex items-baseline gap-3">
          {stepStr && (
            <span className="font-serif font-medium text-terracotta text-[26px] leading-none tracking-tight shrink-0">
              {stepStr}
            </span>
          )}
          <div className="flex-1 flex items-baseline gap-2.5 flex-wrap">
            <h3 className="font-serif font-medium text-[19px] text-ink tracking-tight leading-tight">{data.label}</h3>
            {data.is_optional && (
              <span className="text-[10px] tracking-wider uppercase font-medium text-stone bg-sand border border-border-cream px-2 py-0.5 rounded-full">
                선택
              </span>
            )}
          </div>
        </div>
        {data.is_optional && (
          <p className="text-[12px] text-stone mt-1.5 leading-snug">
            어려워서 안 해도 됩니다. 도전하고 싶은 학생만!
          </p>
        )}
        {data.description && (
          <p className="text-[13px] text-olive mt-2 leading-relaxed">{data.description}</p>
        )}
      </div>

      {/* A | B 2열 */}
      <div className="grid grid-cols-2 divide-x divide-border-cream">
        <SidePanel side={sideA} />
        <SidePanel side={sideB} />
      </div>
    </div>
  );
}

// ─── 보충 학습지 레이아웃 ────────────────────────────────────────────────────
function BonusLayout({ data }: { data: ContentGroupContent }) {
  const pdf = data.pdf!;
  const hintbook = data.hintbook;
  const pdfUrl = pdf.url || pdf.cdn_url || '';
  const hintUrl = hintbook ? (hintbook.url || hintbook.cdn_url || '') : '';

  return (
    <div className="bg-ivory border border-border-cream rounded-2xl overflow-hidden">
      <div className="px-6 pt-4 pb-3 border-b border-border-cream flex items-center gap-2.5">
        <span className="text-[10px] tracking-[0.1em] uppercase font-semibold text-stone bg-sand border border-border-cream px-2 py-0.5 rounded-full">
          보충 학습지
        </span>
        <h3 className="font-serif font-medium text-[17px] text-ink tracking-tight">{data.label}</h3>
      </div>
      <div className="px-4 py-4 space-y-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 px-4 py-3.5 rounded-xl bg-sand hover:bg-white hover:shadow-ring-warm transition-all border border-border-cream"
        >
          <FileText className="w-5 h-5 text-charcoal shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-ink truncate tracking-tight">{pdf.original_name}</p>
            {pdf.file_size && <p className="text-[11px] text-stone mt-0.5">{pdf.file_size}</p>}
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-[11px] tracking-wider uppercase font-medium text-charcoal bg-ivory px-3 py-1.5 rounded-md shadow-ring-warm group-hover:bg-terracotta group-hover:text-ivory group-hover:shadow-ring-terracotta transition-all">
            <Download className="w-3 h-3" />
            PDF
          </div>
        </a>
        {hintbook && (
          <a
            href={hintUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-terracotta/[0.06] border border-terracotta/20 hover:bg-terracotta/10 transition-all"
          >
            <Lightbulb className="w-4 h-4 text-terracotta shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] tracking-wider uppercase font-medium text-terracotta">힌트북</p>
              <p className="text-[12px] text-olive">각 문항 힌트만 보고 재도전</p>
            </div>
            <Download className="w-3.5 h-3.5 text-terracotta/60 shrink-0" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── 기출/심화 레이아웃 ─────────────────────────────────────────────────────────
function GichulLayout({
  data,
  progress,
  progressEndpoint,
}: {
  data: ContentGroupContent;
  progress: ProgressMap;
  progressEndpoint?: string;
}) {
  const label = data.label || '';
  const description = data.description;
  const pdf = data.pdf;
  const pdfs = data.pdfs || (pdf ? [pdf] : []);
  const hintbook = data.hintbook;
  const videos = (data.videos || []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const subLabel = getSubLabel(label);

  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [lectureOpen, setLectureOpen] = useState(false);

  return (
    <div className="bg-ivory border border-border-cream rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 pt-5 pb-4 border-b border-border-cream">
        <div className="flex items-baseline gap-3">
          {data.step != null && (
            <span className="font-serif font-medium text-terracotta text-[26px] leading-none tracking-tight shrink-0">
              {typeof data.step === 'number' ? String(data.step).padStart(2, '0') : data.step}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-serif font-medium text-[19px] text-ink tracking-tight leading-tight">{label}</h3>
            <p className="text-[11px] tracking-[0.1em] uppercase text-stone mt-1">{subLabel}</p>
          </div>
        </div>
        {description && (
          <p className="text-[13px] text-olive mt-2.5 leading-relaxed whitespace-pre-line">{description}</p>
        )}
      </div>

      {/* 문제지 */}
      {pdfs.length > 0 && (
        <div className="px-4 pt-4 pb-1 space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-stone px-1 mb-2">문제지</p>
          {pdfs.map((p, idx) => {
            const url = p.url || p.cdn_url || '';
            const name = p.original_name || 'document.pdf';
            return (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-4 py-3.5 rounded-xl bg-sand hover:bg-white hover:shadow-ring-warm transition-all border border-border-cream"
              >
                <FileText className="w-5 h-5 text-charcoal shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-ink truncate tracking-tight">{name}</p>
                  {p.file_size && <p className="text-[11px] text-stone mt-0.5">{p.file_size}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-1.5 text-[11px] tracking-wider uppercase font-medium text-charcoal bg-ivory px-3 py-1.5 rounded-md shadow-ring-warm group-hover:bg-terracotta group-hover:text-ivory group-hover:shadow-ring-terracotta transition-all">
                  <Download className="w-3 h-3" />
                  PDF
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* 힌트북 */}
      {hintbook && (
        <div className="px-4 pt-3 pb-1">
          <a
            href={hintbook.url || hintbook.cdn_url || ''}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-terracotta/[0.06] border border-terracotta/20 hover:bg-terracotta/10 transition-all"
          >
            <Lightbulb className="w-4 h-4 text-terracotta shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] tracking-wider uppercase font-medium text-terracotta">힌트북</p>
              <p className="text-[12px] text-olive">각 문항 힌트만 보고 재도전</p>
            </div>
            <Download className="w-3.5 h-3.5 text-terracotta/60 shrink-0" />
          </a>
        </div>
      )}

      {/* 해설강의 토글 */}
      {videos.length > 0 && (
        <div className="px-4 pt-3 pb-4">
          <button
            onClick={() => setLectureOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border-cream bg-sand hover:bg-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Play className="w-3.5 h-3.5 text-stone" />
              <span className="text-[13px] font-medium text-charcoal">해설강의</span>
              <span className="text-[11px] text-stone">{videos.length}개</span>
            </div>
            <svg
              className={`w-4 h-4 text-stone transition-transform ${lectureOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {lectureOpen && (
          <div className="mt-2 rounded-xl border border-border-cream overflow-hidden bg-sand divide-y divide-border-cream">
            {videos.map((video, idx) => {
              const p = progress[video.bunny_video_id];
              const isActive = activeVideo === idx;
              const isDone = p?.completed;
              const videoLabel = video.title || `${video.problem_number}번 해설강의`;

              return (
                <div key={idx}>
                  <button
                    onClick={() => setActiveVideo(isActive ? null : idx)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-white' : 'hover:bg-white/60'}`}
                  >
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4 text-terracotta shrink-0" />
                      : <Play className={`w-4 h-4 shrink-0 ${isActive ? 'text-terracotta' : 'text-stone'}`} />
                    }
                    <span className={`text-[13px] flex-1 leading-snug ${isDone ? 'text-stone line-through' : 'text-charcoal'} ${isActive ? 'font-medium text-ink no-underline' : ''}`}
                      style={isDone && !isActive ? {} : { textDecoration: 'none' }}>
                      {videoLabel}
                    </span>
                    {video.duration_seconds ? (
                      <span className="text-[12px] text-stone shrink-0">{formatDuration(video.duration_seconds)}</span>
                    ) : p && !isDone ? (
                      <span className="text-[11px] text-stone shrink-0">{p.watch_percent}%</span>
                    ) : null}
                  </button>
                  {isActive && (
                    <div className="px-4 pb-4 pt-2 bg-white">
                      <LearningVideoPlayer
                        bunnyVideoId={video.bunny_video_id}
                        libraryId="566809"
                        initialProgress={p?.watch_percent || 0}
                        initialCompleted={p?.completed || false}
                        progressEndpoint={progressEndpoint}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function ContentGroupBlock({
  content,
  progress,
  subjectSlug,
  progressEndpoint,
}: {
  content: Record<string, unknown>;
  progress: ProgressMap;
  subjectSlug: string;
  progressEndpoint?: string;
}) {
  const data = content as unknown as ContentGroupContent;

  // A/B 2열 심화유형
  if (data.side_a && data.side_b) {
    return <ShimhwaPairLayout data={data} />;
  }

  // 보충 학습지
  if (data.is_bonus) {
    return <BonusLayout data={data} />;
  }

  // page_range 있으면 개념강의 블럭
  if (data.page_range) {
    return <ConceptLayout data={data} progress={progress} progressEndpoint={progressEndpoint} />;
  }

  // 라벨에 레벨/올스캔/단계 등 기출 키워드 있으면 기출/심화 블럭
  const label = data.label || '';
  const isGichul = /레벨|올스캔|올 스캔|단계/i.test(label);
  if (isGichul) {
    return <GichulLayout data={data} progress={progress} progressEndpoint={progressEndpoint} />;
  }

  // 기본값: 개념강의 레이아웃
  return <ConceptLayout data={data} progress={progress} progressEndpoint={progressEndpoint} />;
}
