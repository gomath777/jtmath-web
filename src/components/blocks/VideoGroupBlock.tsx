'use client';

import { useState } from 'react';
import { ChevronDown, CheckCircle, Play, Film } from 'lucide-react';
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
    <div className="brand-card overflow-hidden">
      <button
        onClick={() => { setIsOpen(!isOpen); if (isOpen) setActiveVideo(null); }}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${allDone ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
          <Film className={`w-4 h-4 ${allDone ? 'text-green-400' : 'text-blue-400'}`} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-bold text-white/80">
            해설강의 <span className="text-white/40 font-normal">{videos.length}개</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden max-w-[120px]">
              <div
                className={`h-full rounded-full ${allDone ? 'bg-green-400' : 'bg-blue-400'}`}
                style={{ width: `${videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0}%` }}
              />
            </div>
            <span className={`text-[10px] font-bold ${allDone ? 'text-green-400' : 'text-white/30'}`}>
              {completedCount}/{videos.length}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border-t border-white/[0.06]">
          {videos.map((video, idx) => {
            const p = progress[video.bunny_video_id];
            const isActive = activeVideo === idx;
            const isDone = p?.completed;

            return (
              <div key={idx}>
                <button
                  onClick={() => setActiveVideo(isActive ? null : idx)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive ? 'bg-blue-500/5' : 'hover:bg-white/[0.03]'
                  } ${idx > 0 ? 'border-t border-white/[0.04]' : ''}`}
                >
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <Play className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-white/20'}`} />
                  )}
                  <span className={`text-sm flex-1 truncate ${isDone ? 'text-white/50' : 'text-white/80'} ${isActive ? 'font-bold text-blue-400' : ''}`}>
                    {video.title
                      ? `${idx + 1}번 해설강의 [${video.title.replace(/\s*해설강의\([^)]*\)$/, '').trim()}](${SUBJECT_LABELS[subjectSlug] || subjectSlug})`
                      : `${idx + 1}번 해설강의`}
                  </span>
                  {p && !isDone && (
                    <span className="text-[10px] text-white/20 shrink-0">{p.watch_percent}%</span>
                  )}
                </button>

                {isActive && (
                  <div className="px-4 pb-4">
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
