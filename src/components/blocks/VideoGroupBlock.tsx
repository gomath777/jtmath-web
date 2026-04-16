'use client';

import { useState } from 'react';
import { ChevronDown, CheckCircle2, Play, Film } from 'lucide-react';
import LearningVideoPlayer from '@/components/LearningVideoPlayer';
import { SUBJECT_LABELS } from './types';
import type { ProgressMap } from './types';

interface VideoGroupBlockProps {
  content: Record<string, unknown>;
  progress: ProgressMap;
  subjectSlug: string;
  progressEndpoint?: string;
}

export default function VideoGroupBlock({
  content,
  progress,
  subjectSlug,
  progressEndpoint,
}: VideoGroupBlockProps) {
  const videos = (content.videos as Array<{
    bunny_video_id: string;
    title: string;
    problem_number: number;
    raw_text?: string;
  }>) || [];
  const [isOpen, setIsOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);

  if (videos.length === 0) return null;

  const completedCount = videos.filter(v => progress[v.bunny_video_id]?.completed).length;
  const allDone = completedCount === videos.length;

  return (
    <div className="bg-ivory border border-border-cream rounded-xl overflow-hidden">
      <button
        onClick={() => { setIsOpen(!isOpen); if (isOpen) setActiveVideo(null); }}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-sand/50 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-sand flex items-center justify-center shrink-0">
          <Film className={`w-4 h-4 ${allDone ? 'text-terracotta' : 'text-charcoal'}`} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[14px] font-medium text-ink tracking-tight">
            해설강의 <span className="text-stone font-normal text-[13px]">{videos.length}개</span>
          </p>
          <p className="text-[12px] text-olive mt-0.5">
            {allDone ? '모두 완료' : '필요한 문항만 골라보세요'}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-stone shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-border-cream">
          {videos.map((video, idx) => {
            const p = progress[video.bunny_video_id];
            const isActive = activeVideo === idx;
            const isDone = p?.completed;

            return (
              <div key={idx}>
                <button
                  onClick={() => setActiveVideo(isActive ? null : idx)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                    isActive ? 'bg-sand' : 'hover:bg-sand/40'
                  } ${idx > 0 ? 'border-t border-border-cream' : ''}`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-terracotta shrink-0" />
                  ) : (
                    <Play className={`w-4 h-4 shrink-0 ${isActive ? 'text-terracotta' : 'text-stone'}`} />
                  )}
                  <span
                    className={`text-[14px] flex-1 truncate ${
                      isDone ? 'text-stone' : 'text-charcoal'
                    } ${isActive ? 'font-medium text-ink' : ''}`}
                  >
                    {video.raw_text
                      ? `${idx + 1}번 ${video.raw_text}`
                      : video.title
                        ? `${idx + 1}번 [${video.title.replace(/\s*해설강의\([^)]*\)$/, '').trim()}](${SUBJECT_LABELS[subjectSlug] || subjectSlug})`
                        : `${idx + 1}번 해설강의`}
                  </span>
                  {p && !isDone && (
                    <span className="text-[11px] text-stone shrink-0">{p.watch_percent}%</span>
                  )}
                </button>

                {isActive && (
                  <div className="px-5 pb-4 pt-1 bg-sand">
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
  );
}
