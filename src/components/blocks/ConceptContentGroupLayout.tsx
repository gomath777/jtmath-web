'use client';

import { BookOpen, CheckCircle2, FileText, Play } from 'lucide-react';
import React, { useState, type ReactNode } from 'react';

import LearningVideoPlayer from '@/components/LearningVideoPlayer';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';
import { formatVideoLabel } from '@/lib/video-label';

import { PdfResourceActions } from './PdfResourceActions';
import type { ContentGroupContent } from './ContentGroupBlock.types';
import { formatVideoDuration, getContentGroupPdfs, getContentGroupVideos, getPdfDisplayName, getPdfSourceUrl } from './ContentGroupBlock.utils';
import type { ProgressMap } from './types';

type TimelineStepProps = Readonly<{
  readonly number: number;
  readonly title: string;
  readonly description: string;
  readonly isLast?: boolean;
  readonly children?: ReactNode;
}>;

function TimelineStep({ number, title, description, isLast = false, children }: TimelineStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0" style={{ width: 32 }}>
        <div className="w-8 h-8 rounded-full border-2 border-terracotta bg-ivory flex items-center justify-center shrink-0">
          <span className="text-[13px] font-semibold text-terracotta">{number}</span>
        </div>
        {!isLast && <div className="w-px flex-1 bg-border-cream mt-1.5 mb-0" style={{ minHeight: 24 }} />}
      </div>

      <div className={`flex-1 min-w-0 ${isLast ? 'pb-2' : 'pb-7'}`}>
        <h3 className="text-[16px] font-semibold text-ink tracking-tight leading-tight mt-0.5">{title}</h3>
        <p className="text-[13px] text-stone mt-0.5 mb-4 leading-snug">{description}</p>
        {children}
      </div>
    </div>
  );
}

type ConceptContentGroupLayoutProps = Readonly<{
  readonly data: ContentGroupContent;
  readonly progress: ProgressMap;
  readonly progressEndpoint?: string;
}>;

export function ConceptContentGroupLayout({ data, progress, progressEndpoint }: ConceptContentGroupLayoutProps) {
  const pdfs = getContentGroupPdfs(data);
  const videos = getContentGroupVideos(data);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const completedCount = videos.filter((video) => progress[video.bunny_video_id]?.completed).length;
  const allVideosWatched = videos.length > 0 && completedCount === videos.length;

  return (
    <div className="pt-1">
      {pdfs.length > 0 && (
        <TimelineStep number={1} title="학습지 받기" description="영상을 보기 전 학습지를 다운로드해서 준비하세요">
          <div className="space-y-2">
            {pdfs.map((pdf, index) => {
              const name = getPdfDisplayName(pdf, 'document.pdf');
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-sand border border-border-cream">
                    <div className="w-9 h-9 rounded-lg bg-crimson/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5 text-crimson" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate tracking-tight">{name}</p>
                      {pdf.file_size && <p className="text-[11px] text-stone mt-0.5">{pdf.file_size}</p>}
                    </div>
                  </div>
                  <PdfResourceActions name={name} sourceUrl={getPdfSourceUrl(pdf)} />
                </div>
              );
            })}
          </div>
        </TimelineStep>
      )}

      {videos.length > 0 && (
        <TimelineStep
          number={pdfs.length > 0 ? 2 : 1}
          title="강의 시청"
          description="학습지를 보면서 영상을 차례대로 시청하세요"
        >
          <div className="rounded-xl border border-border-cream overflow-hidden bg-sand divide-y divide-border-cream">
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
                        libraryId={CONCEPT_LIBRARY_ID}
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
        </TimelineStep>
      )}

      <TimelineStep
        number={(pdfs.length > 0 ? 1 : 0) + (videos.length > 0 ? 1 : 0) + 1}
        title="개념서 복습"
        description="영상 시청 후, 개념서를 풀며 배운 내용을 정리하세요"
        isLast
      >
        <div className={`rounded-xl border border-border-cream p-5 text-center mb-4 transition-colors ${allVideosWatched ? 'bg-sand' : 'bg-sand/50'}`}>
          <BookOpen className={`w-7 h-7 mx-auto mb-2 ${allVideosWatched ? 'text-terracotta' : 'text-stone'}`} />
          {data.page_range ? (
            <p className={`text-[15px] font-semibold tracking-tight ${allVideosWatched ? 'text-ink' : 'text-stone'}`}>개념서 {data.page_range}</p>
          ) : (
            <p className="text-[14px] text-stone">개념서 풀이</p>
          )}
          <p className="text-[12px] text-terracotta font-medium mt-2">풀이하기</p>
          {videos.length > 0 && (
            <p className="text-[11px] text-stone mt-2">
              {allVideosWatched ? '강의를 모두 시청했습니다 ✓' : `강의를 모두 시청한 후 진행하세요 (${completedCount}/${videos.length})`}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border-cream bg-ivory overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border-cream">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-stone">풀이 후</span>
          </div>
          <div className="divide-y divide-border-cream">
            {['개념서 답안을 메쓰플랫 앱에 제출', "카톡으로 '제출완료' 보내기", '선생님이 보내주는 오답관리로 마무리'].map((text, index) => (
              <div key={index} className="flex items-start gap-3 px-4 py-3">
                <span className="w-5 h-5 rounded-full bg-terracotta/10 text-terracotta text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
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
