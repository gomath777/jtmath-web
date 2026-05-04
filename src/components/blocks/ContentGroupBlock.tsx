'use client';

import { useState } from 'react';
import { Download, FileText, ChevronDown, CheckCircle2, Play, Lightbulb } from 'lucide-react';
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
}

interface ContentGroupContent {
  label: string;
  icon?: string;
  step?: number | string;
  description?: string;
  pdf?: PdfItem;
  pdfs?: PdfItem[];
  hintbook?: PdfItem;
  videos?: VideoItem[];
  guide_text?: string;
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

function PdfRow({ p }: { p: PdfItem }) {
  const url = p.url || p.cdn_url || '';
  const name = p.original_name || 'document.pdf';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-4 py-3.5 rounded-xl bg-sand hover:bg-white hover:shadow-ring-warm transition-all"
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
}

// ─── 개념강의 레이아웃 (노션 callout 스타일) ──────────────────────────────────
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
  const [videosOpen, setVideosOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const completedCount = videos.filter(v => progress[v.bunny_video_id]?.completed).length;
  const allDone = videos.length > 0 && completedCount === videos.length;

  const guideText = data.guide_text ||
    '개념서 문제 풀이 후 앱에 답안 제출하고 \'제출완료\' 카톡하기!\n오답관리 후 다음으로 넘어갑니다.\n모르는 문제는 앱 내 해설강의를 참고하거나 카톡으로 캡처해서 질문하세요!';

  return (
    <div className="bg-ivory border border-border-cream rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 pt-6 pb-4 border-b border-border-cream">
        <div className="flex items-baseline gap-3">
          {data.step != null && (
            <span className="font-serif font-medium text-terracotta text-[26px] leading-none tracking-tight shrink-0">
              {typeof data.step === 'number' ? String(data.step).padStart(2, '0') : data.step}
            </span>
          )}
          <h3 className="font-serif font-medium text-[19px] text-ink tracking-tight leading-tight">
            {data.label}
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 📚 개념노트 */}
        {pdfs.length > 0 && (
          <div className="rounded-xl border border-border-cream overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-sand">
              <span className="text-[16px]">📚</span>
              <span className="text-[13px] font-medium text-charcoal tracking-tight">개념노트</span>
            </div>
            <div className="p-3 space-y-2">
              {pdfs.map((p, idx) => <PdfRow key={idx} p={p} />)}
            </div>
          </div>
        )}

        {/* 📺 개념영상 */}
        {videos.length > 0 && (
          <div className="rounded-xl border border-border-cream overflow-hidden">
            <button
              onClick={() => { setVideosOpen(!videosOpen); if (videosOpen) setActiveVideo(null); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 bg-sand hover:bg-sand/70 transition-colors"
            >
              <span className="text-[16px]">📺</span>
              <p className="text-[13px] font-medium text-charcoal tracking-tight flex-1 text-left">
                개념영상
                <span className="ml-2 font-normal text-stone">{videos.length}개</span>
                {completedCount > 0 && (
                  <span className={`ml-1.5 ${allDone ? 'text-terracotta' : 'text-charcoal'}`}>
                    · {completedCount}/{videos.length}
                  </span>
                )}
              </p>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone shrink-0 transition-transform duration-200 ${videosOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {videosOpen && (
              <div className="divide-y divide-border-cream">
                {videos.map((video, idx) => {
                  const p = progress[video.bunny_video_id];
                  const isActive = activeVideo === idx;
                  const isDone = p?.completed;
                  const videoLabel = video.title || `${video.problem_number}번 해설강의`;

                  return (
                    <div key={idx}>
                      <button
                        onClick={() => setActiveVideo(isActive ? null : idx)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-sand' : 'hover:bg-sand/50'}`}
                      >
                        {isDone
                          ? <CheckCircle2 className="w-4 h-4 text-terracotta shrink-0" />
                          : <Play className={`w-4 h-4 shrink-0 ${isActive ? 'text-terracotta' : 'text-stone'}`} />
                        }
                        <span className={`text-[13px] flex-1 leading-snug ${isDone ? 'text-stone' : 'text-charcoal'} ${isActive ? 'font-medium text-ink' : ''}`}>
                          {videoLabel}
                        </span>
                        {p && !isDone && (
                          <span className="text-[11px] text-stone shrink-0">{p.watch_percent}%</span>
                        )}
                      </button>
                      {isActive && (
                        <div className="px-4 pb-4 pt-2 bg-sand">
                          <LearningVideoPlayer
                            bunnyVideoId={video.bunny_video_id}
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

        {/* 🔄 오답관리 */}
        <div className="rounded-xl border border-border-cream overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-sand">
            <span className="text-[16px]">🔄</span>
            <span className="text-[13px] font-medium text-charcoal tracking-tight">오답관리</span>
          </div>
          <div className="px-4 py-3">
            <p className="text-[13px] text-olive leading-relaxed whitespace-pre-line">{guideText}</p>
          </div>
        </div>
      </div>
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
  const videos = data.videos || [];

  // videos 필드가 있으면 개념강의 레이아웃
  if (videos.length > 0 || data.pdf) {
    return <ConceptLayout data={data} progress={progress} progressEndpoint={progressEndpoint} />;
  }

  // ─── 기존 레이아웃 (기출/심화 세션) ────────────────────────────────────────
  const label = data.label || '';
  const description = data.description;
  const pdf = data.pdf;
  const pdfs = data.pdfs || (pdf ? [pdf] : []);
  const hintbook = data.hintbook;
  const subLabel = getSubLabel(label);

  return (
    <div className="bg-ivory border border-border-cream rounded-2xl overflow-hidden">
      {/* ─── Header ─── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-baseline gap-3">
          {data.step != null && (
            <span className="font-serif font-medium text-terracotta text-[26px] leading-none tracking-tight shrink-0">
              {typeof data.step === 'number' ? String(data.step).padStart(2, '0') : data.step}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-serif font-medium text-[19px] text-ink tracking-tight leading-tight">
              {label}
            </h3>
            <p className="text-[11px] tracking-[0.1em] uppercase text-stone mt-1.5">
              {subLabel}
            </p>
          </div>
        </div>
        {description && (
          <p className="text-[13px] text-olive mt-3 leading-relaxed whitespace-pre-line">
            {description}
          </p>
        )}
      </div>

      {/* ─── PDF Downloads ─── */}
      <div className="px-4 pb-3 space-y-2">
        {pdfs.map((p, idx) => <PdfRow key={idx} p={p} />)}
      </div>

      {/* ─── Hintbook ─── */}
      {hintbook && (
        <div className="px-4 pb-3">
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
    </div>
  );
}
