'use client';

import { useEffect, useRef, useCallback } from 'react';
import { PlayCircle } from 'lucide-react';

interface BunnyVideoPlayerProps {
  libraryId: string;
  videoId: string;
  lessonId: string;
  startPositionSecs?: number;   // 저장된 시청 위치에서 시작
}

export default function BunnyVideoPlayer({
  libraryId,
  videoId,
  lessonId,
  startPositionSecs = 0,
}: BunnyVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPosRef = useRef<number>(startPositionSecs);
  const durationRef = useRef<number>(0);

  // Bunny Player로 progress를 서버에 저장 (10초마다 + 언마운트 시)
  const saveProgress = useCallback(async (positionSecs: number, durationSecs: number) => {
    if (!lessonId || positionSecs <= 0) return;
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, position_secs: Math.floor(positionSecs), duration_secs: Math.floor(durationSecs) }),
        keepalive: true, // 탭 닫을 때도 전송
      });
    } catch {}
  }, [lessonId]);

  useEffect(() => {
    // Bunny player postMessage 이벤트 수신
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      switch (data.event) {
        case 'onTimeUpdate':
          currentPosRef.current = data.currentTime ?? currentPosRef.current;
          break;
        case 'onDurationChange':
          durationRef.current = data.duration ?? durationRef.current;
          break;
        case 'onPause':
        case 'onSeeked':
          // 멈추거나 탐색할 때 즉시 저장
          saveProgress(currentPosRef.current, durationRef.current);
          break;
        case 'onEnded':
          saveProgress(durationRef.current, durationRef.current);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // 10초마다 자동 저장
    saveTimerRef.current = setInterval(() => {
      saveProgress(currentPosRef.current, durationRef.current);
    }, 10_000);

    // 페이지 떠날 때 저장
    const handleBeforeUnload = () => {
      saveProgress(currentPosRef.current, durationRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      saveProgress(currentPosRef.current, durationRef.current);
    };
  }, [saveProgress]);

  // start 파라미터 포함한 Bunny embed URL
  const src = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&preload=true${startPositionSecs > 30 ? `&t=${Math.floor(startPositionSecs)}` : ''}`;

  return (
    <div className="aspect-video bg-black rounded-2xl overflow-hidden relative ring-1 ring-white/[0.06]">
      {videoId ? (
        <>
          {startPositionSecs > 30 && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-brand-blue/90 backdrop-blur-sm rounded-lg text-xs font-mono text-white">
              ↩ {Math.floor(startPositionSecs / 60)}분 {Math.floor(startPositionSecs % 60)}초부터 이어보기
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={src}
            className="w-full h-full border-0 absolute inset-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
          />
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/20">
          <PlayCircle className="w-14 h-14" />
          <p className="text-sm font-mono">등록된 영상이 없습니다</p>
        </div>
      )}
    </div>
  );
}
