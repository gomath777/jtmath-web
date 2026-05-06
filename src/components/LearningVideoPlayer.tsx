'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';

interface LearningVideoPlayerProps {
  bunnyVideoId: string;
  libraryId?: string;       // 기본값: EXAM_LIBRARY_ID (기출해설). 개념강의는 CONCEPT_LIBRARY_ID 명시 전달
  title?: string;
  initialProgress?: number;
  initialCompleted?: boolean;
  onComplete?: () => void;
  onProgressUpdate?: (percent: number, completed: boolean) => void;
  progressEndpoint?: string;
}

const SAVE_INTERVAL = 10000; // 10초마다 저장

export default function LearningVideoPlayer({
  bunnyVideoId,
  libraryId,
  title,
  initialProgress = 0,
  initialCompleted = false,
  onComplete,
  onProgressUpdate,
  progressEndpoint = '/api/student/watch-progress',
}: LearningVideoPlayerProps) {
  const lib = libraryId || EXAM_LIBRARY_ID;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [completed, setCompleted] = useState(initialCompleted || initialProgress >= 80);
  const [currentPercent, setCurrentPercent] = useState(initialProgress);
  const lastSavedRef = useRef(initialProgress);
  const currentPercentRef = useRef(initialProgress);

  const saveProgress = useCallback(async (percent: number) => {
    if (percent <= 0 || Math.abs(percent - lastSavedRef.current) < 3) return;
    lastSavedRef.current = percent;

    try {
      const res = await fetch(progressEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bunny_video_id: bunnyVideoId, watch_percent: percent }),
        keepalive: true,
      });
      const data = await res.json();
      if (data.completed && !completed) {
        setCompleted(true);
        onComplete?.();
      }
      onProgressUpdate?.(data.watch_percent, data.completed);
    } catch {
      // 네트워크 에러 무시
    }
  }, [bunnyVideoId, completed, onComplete, onProgressUpdate, progressEndpoint]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.event === 'onTimeUpdate' && data.duration > 0) {
        const percent = Math.round(((data.currentTime || 0) / data.duration) * 100);
        setCurrentPercent(percent);
        currentPercentRef.current = percent;
      }
      if (data.event === 'onPause' || data.event === 'onSeeked') {
        saveProgress(currentPercentRef.current);
      }
      if (data.event === 'onEnded') {
        setCurrentPercent(100);
        currentPercentRef.current = 100;
        saveProgress(100);
      }
    };

    window.addEventListener('message', handleMessage);

    const timer = setInterval(() => {
      saveProgress(currentPercentRef.current);
    }, SAVE_INTERVAL);

    const handleBeforeUnload = () => {
      saveProgress(currentPercentRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(timer);
      saveProgress(currentPercentRef.current);
    };
  }, [saveProgress]);

  const embedUrl = `https://iframe.mediadelivery.net/embed/${lib}/${bunnyVideoId}?autoplay=false&preload=true&responsive=true`;

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-bold text-white/80 truncate">{title}</h3>
          {completed && (
            <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full shrink-0">
              <CheckCircle className="w-3 h-3" /> 완료
            </span>
          )}
        </div>
      )}
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
        <iframe
          ref={iframeRef}
          src={embedUrl}
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${completed ? 'bg-green-400' : 'bg-brand-blue'}`}
            style={{ width: `${currentPercent}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${completed ? 'text-green-400' : 'text-white/40'}`}>
          {currentPercent}%
        </span>
      </div>
    </div>
  );
}
