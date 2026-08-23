'use client';

import { CheckCircle2, FileText, Lightbulb, Play } from 'lucide-react';
import React, { useState } from 'react';

import LearningVideoPlayer from '@/components/LearningVideoPlayer';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import { formatVideoLabel } from '@/lib/video-label';

import { PdfResourceActions } from './PdfResourceActions';
import type { ContentGroupContent } from './ContentGroupBlock.types';
import {
  formatVideoDuration,
  getContentGroupPdfs,
  getContentGroupSubLabel,
  getContentGroupVideos,
  getPdfDisplayName,
  getPdfSourceUrl,
} from './ContentGroupBlock.utils';
import type { ProgressMap } from './types';

type GichulContentGroupLayoutProps = Readonly<{
  readonly data: ContentGroupContent;
  readonly progress: ProgressMap;
  readonly progressEndpoint?: string;
}>;

export function GichulContentGroupLayout({ data, progress, progressEndpoint }: GichulContentGroupLayoutProps) {
  const label = data.label || '';
  const pdfs = getContentGroupPdfs(data);
  const videos = getContentGroupVideos(data);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [lectureOpen, setLectureOpen] = useState(false);

  return (
    <div className="bg-ivory border border-border-cream rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border-cream">
        <div className="flex items-baseline gap-3">
          {data.step != null && (
            <span className="font-serif font-medium text-terracotta text-[26px] leading-none tracking-tight shrink-0">
              {typeof data.step === 'number' ? String(data.step).padStart(2, '0') : data.step}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-serif font-medium text-[19px] text-ink tracking-tight leading-tight">{label}</h3>
            <p className="text-[11px] tracking-[0.1em] uppercase text-stone mt-1">{getContentGroupSubLabel(label)}</p>
          </div>
        </div>
        {data.description && <p className="text-[13px] text-olive mt-2.5 leading-relaxed whitespace-pre-line">{data.description}</p>}
      </div>

      {pdfs.length > 0 && (
        <div className="px-4 pt-4 pb-1 space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-stone px-1 mb-2">문제지</p>
          {pdfs.map((pdf, index) => {
            const name = getPdfDisplayName(pdf, 'document.pdf');
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-sand border border-border-cream">
                  <FileText className="w-5 h-5 text-charcoal shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-ink truncate tracking-tight">{name}</p>
                    {pdf.file_size && <p className="text-[11px] text-stone mt-0.5">{pdf.file_size}</p>}
                  </div>
                </div>
                <PdfResourceActions name={name} sourceUrl={getPdfSourceUrl(pdf)} />
              </div>
            );
          })}
        </div>
      )}

      {data.hintbook && (
        <div className="px-4 pt-3 pb-1">
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-terracotta/[0.06] border border-terracotta/20">
              <Lightbulb className="w-4 h-4 text-terracotta shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] tracking-wider uppercase font-medium text-terracotta">힌트북</p>
                <p className="text-[12px] font-medium text-olive truncate">{getPdfDisplayName(data.hintbook, 'hintbook.pdf')}</p>
                <p className="text-[12px] text-olive">각 문항 힌트만 보고 재도전</p>
              </div>
            </div>
            <PdfResourceActions name={getPdfDisplayName(data.hintbook, 'hintbook.pdf')} sourceUrl={getPdfSourceUrl(data.hintbook)} />
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="px-4 pt-3 pb-4">
          <button
            onClick={() => setLectureOpen((isOpen) => !isOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border-cream bg-sand hover:bg-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Play className="w-3.5 h-3.5 text-stone" />
              <span className="text-[13px] font-medium text-charcoal">해설강의</span>
              <span className="text-[11px] text-stone">{videos.length}개</span>
            </div>
            <svg className={`w-4 h-4 text-stone transition-transform ${lectureOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {lectureOpen && (
            <div className="mt-2 rounded-xl border border-border-cream overflow-hidden bg-sand divide-y divide-border-cream">
              {videos.map((video, index) => {
                const savedProgress = progress[video.bunny_video_id];
                const isActive = activeVideo === index;
                const isDone = savedProgress?.completed;
                const videoLabel = formatVideoLabel(video);

                return (
                  <div key={index}>
                    <button
                      onClick={() => setActiveVideo(isActive ? null : index)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-white' : 'hover:bg-white/60'}`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-terracotta shrink-0" />
                      ) : (
                        <Play className={`w-4 h-4 shrink-0 ${isActive ? 'text-terracotta' : 'text-stone'}`} />
                      )}
                      <span
                        className={`text-[13px] flex-1 leading-snug ${isDone ? 'text-stone line-through' : 'text-charcoal'} ${isActive ? 'font-medium text-ink no-underline' : ''}`}
                        style={isDone && !isActive ? {} : { textDecoration: 'none' }}
                      >
                        {videoLabel}
                      </span>
                      {video.duration_seconds ? (
                        <span className="text-[12px] text-stone shrink-0">{formatVideoDuration(video.duration_seconds)}</span>
                      ) : savedProgress && !isDone ? (
                        <span className="text-[11px] text-stone shrink-0">{savedProgress.watch_percent}%</span>
                      ) : null}
                    </button>
                    {isActive && (
                      <div className="px-4 pb-4 pt-2 bg-white">
                        <LearningVideoPlayer
                          bunnyVideoId={video.bunny_video_id}
                          libraryId={EXAM_LIBRARY_ID}
                          initialProgress={savedProgress?.watch_percent || 0}
                          initialCompleted={savedProgress?.completed || false}
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
