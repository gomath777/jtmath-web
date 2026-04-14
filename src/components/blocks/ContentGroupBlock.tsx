'use client';

import { useState } from 'react';
import { Download, FileText, ChevronDown, CheckCircle, Play, Film } from 'lucide-react';
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
  const icon = data.icon || '📃';
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
    <div className="rounded-2xl overflow-hidden bg-white/[0.04]">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          {data.step && (
            <span className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-xs font-black text-white/50 shrink-0">
              {data.step}
            </span>
          )}
          <div>
            <h3 className="text-base font-black text-white">{label}</h3>
            {!description && (
              <p className="text-[11px] text-white/30 mt-0.5">{subLabel}</p>
            )}
          </div>
        </div>
        {description && (
          <p className="text-xs text-white/40 mt-2 leading-relaxed whitespace-pre-line">{description}</p>
        )}
      </div>

      {/* PDF Downloads */}
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
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] transition-all group"
            >
              <FileText className="w-5 h-5 text-white/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{name}</p>
                {p.file_size && <p className="text-[11px] text-white/30 mt-0.5">{p.file_size}</p>}
              </div>
              <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-white/40 bg-white/[0.08] px-3 py-2 rounded-lg group-hover:bg-brand-blue/20 group-hover:text-brand-blue transition-all">
                <Download className="w-3.5 h-3.5" />
                PDF
              </div>
            </a>
          );
        })}
      </div>

      {/* Hintbook */}
      {hintbook && (
        <div className="px-4 pb-3">
          <a
            href={hintbook.url || hintbook.cdn_url || ''}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition-all"
          >
            <span className="text-base leading-none">🧠</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-400">힌트북</p>
              <p className="text-[11px] text-white/30">각 문항 힌트만 보고 재도전</p>
            </div>
            <Download className="w-3.5 h-3.5 text-white/20 shrink-0" />
          </a>
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="mx-4 mb-4 rounded-xl bg-white/[0.03] overflow-hidden">
          <button
            onClick={() => { setVideosOpen(!videosOpen); if (videosOpen) setActiveVideo(null); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
          >
            <Film className={`w-4 h-4 shrink-0 ${allDone ? 'text-green-400' : 'text-white/30'}`} />
            <p className="text-xs text-white/40 flex-1 text-left">
              <span className="font-bold">해설강의</span>{' '}
              <span className="text-white/25">{videos.length}개</span>
              {completedCount > 0 && (
                <span className={`ml-2 ${allDone ? 'text-green-400' : 'text-brand-blue'}`}>
                  {completedCount}/{videos.length}
                </span>
              )}
            </p>
            <ChevronDown className={`w-3.5 h-3.5 text-white/20 shrink-0 transition-transform duration-200 ${videosOpen ? 'rotate-180' : ''}`} />
          </button>

          {videosOpen && (
            <div className="border-t border-white/[0.06]">
              {videos.map((video, idx) => {
                const p = progress[video.bunny_video_id];
                const isActive = activeVideo === idx;
                const isDone = p?.completed;

                return (
                  <div key={idx}>
                    <button
                      onClick={() => setActiveVideo(isActive ? null : idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-brand-blue/10' : 'hover:bg-white/[0.04]'
                      } ${idx > 0 ? 'border-t border-white/[0.04]' : ''}`}
                    >
                      {isDone ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      ) : (
                        <Play className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-brand-blue' : 'text-white/20'}`} />
                      )}
                      <span className={`text-xs flex-1 truncate ${isDone ? 'text-white/35' : 'text-white/55'} ${isActive ? 'font-bold text-brand-blue' : ''}`}>
                        {video.raw_text
                          ? `${idx + 1}번 ${video.raw_text}`
                          : video.title
                            ? `${idx + 1}번 [${video.title}](${SUBJECT_LABELS[subjectSlug] || subjectSlug})`
                            : `${idx + 1}번 해설강의`}
                      </span>
                      {p && !isDone && (
                        <span className="text-[10px] text-white/20 shrink-0">{p.watch_percent}%</span>
                      )}
                    </button>

                    {isActive && (
                      <div className="px-4 pb-3">
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
