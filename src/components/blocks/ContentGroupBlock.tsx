'use client';

import { useState } from 'react';
import { Download, FileText, ChevronDown, CheckCircle2, Play, Film, Lightbulb } from 'lucide-react';
import LearningVideoPlayer from '@/components/LearningVideoPlayer';
import { SUBJECT_LABELS } from './types';
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
  const label = data.label || '';
  const description = data.description;
  const pdf = data.pdf;
  const pdfs = data.pdfs || (pdf ? [pdf] : []);
  const hintbook = data.hintbook;
  const videos = data.videos || [];

  const [videosOpen, setVideosOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);

  const completedCount = videos.filter(v => progress[v.bunny_video_id]?.completed).length;
  const allDone = videos.length > 0 && completedCount === videos.length;
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
        {pdfs.map((p, idx) => {
          const url = p.url || p.cdn_url || '';
          const name = p.original_name || 'document.pdf';
          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-4 py-3.5 rounded-xl bg-sand hover:bg-white hover:shadow-ring-warm transition-all"
            >
              <FileText className="w-5 h-5 text-charcoal shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-ink truncate tracking-tight">
                  {name}
                </p>
                {p.file_size && (
                  <p className="text-[11px] text-stone mt-0.5">{p.file_size}</p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-1.5 text-[11px] tracking-wider uppercase font-medium text-charcoal bg-ivory px-3 py-1.5 rounded-md shadow-ring-warm group-hover:bg-terracotta group-hover:text-ivory group-hover:shadow-ring-terracotta transition-all">
                <Download className="w-3 h-3" />
                PDF
              </div>
            </a>
          );
        })}
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
              <p className="text-[11px] tracking-wider uppercase font-medium text-terracotta">
                힌트북
              </p>
              <p className="text-[12px] text-olive">
                각 문항 힌트만 보고 재도전
              </p>
            </div>
            <Download className="w-3.5 h-3.5 text-terracotta/60 shrink-0" />
          </a>
        </div>
      )}

      {/* ─── Videos ─── */}
      {videos.length > 0 && (
        <div className="mx-4 mb-5 rounded-xl bg-parchment overflow-hidden border border-border-cream">
          <button
            onClick={() => { setVideosOpen(!videosOpen); if (videosOpen) setActiveVideo(null); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sand/60 transition-colors"
          >
            <Film className={`w-4 h-4 shrink-0 ${allDone ? 'text-terracotta' : 'text-stone'}`} />
            <p className="text-[13px] text-olive flex-1 text-left">
              <span className="font-medium text-charcoal">해설강의</span>{' '}
              <span className="text-stone">{videos.length}개</span>
              {completedCount > 0 && (
                <span className={`ml-2 ${allDone ? 'text-terracotta' : 'text-charcoal'}`}>
                  · {completedCount}/{videos.length}
                </span>
              )}
            </p>
            <ChevronDown
              className={`w-3.5 h-3.5 text-stone shrink-0 transition-transform duration-200 ${videosOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {videosOpen && (
            <div className="border-t border-border-cream">
              {videos.map((video, idx) => {
                const p = progress[video.bunny_video_id];
                const isActive = activeVideo === idx;
                const isDone = p?.completed;

                return (
                  <div key={idx}>
                    <button
                      onClick={() => setActiveVideo(isActive ? null : idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-sand' : 'hover:bg-sand/60'
                      } ${idx > 0 ? 'border-t border-border-cream' : ''}`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-terracotta shrink-0" />
                      ) : (
                        <Play className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-terracotta' : 'text-stone'}`} />
                      )}
                      <span
                        className={`text-[13px] flex-1 truncate ${
                          isDone ? 'text-stone' : 'text-charcoal'
                        } ${isActive ? 'font-medium text-ink' : ''}`}
                      >
                        {video.raw_text
                          ? `${idx + 1}번 ${video.raw_text}`
                          : video.title
                            ? `${idx + 1}번 [${video.title}](${SUBJECT_LABELS[subjectSlug] || subjectSlug})`
                            : `${idx + 1}번 해설강의`}
                      </span>
                      {p && !isDone && (
                        <span className="text-[11px] text-stone shrink-0">{p.watch_percent}%</span>
                      )}
                    </button>

                    {isActive && (
                      <div className="px-4 pb-3 pt-1 bg-sand">
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
    </div>
  );
}
