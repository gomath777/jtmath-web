'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Download, FileText, Loader2, BookOpen, AlertTriangle, Play, ChevronDown, CheckCircle, Film } from 'lucide-react';
import Link from 'next/link';
import LearningVideoPlayer from '@/components/LearningVideoPlayer';

interface SessionBlock {
  id: string;
  block_type: 'section_header' | 'pdf' | 'video_group' | 'text' | 'hintbook';
  order_index: number;
  content: Record<string, unknown>;
}

interface SessionData {
  item: {
    id: string;
    week_number: number;
    session_number: number;
    label: string;
    publish_date: string;
  };
  curriculum: {
    title: string;
    subject_slug: string;
  };
  blocks: SessionBlock[];
  progress: Record<string, { watch_percent: number; completed: boolean }>;
}

const SUBJECT_LABELS: Record<string, string> = {
  gs1: '공통수학1',
  gs2: '공통수학2',
  ds2: '대수',
  ms1: '미적분1',
};

const SECTION_COLORS: Record<string, string> = {
  green: 'bg-green-600',
  blue: 'bg-brand-blue',
  red: 'bg-red-600',
  purple: 'bg-purple-600',
  orange: 'bg-brand-orange',
  dark: 'bg-slate-700',
};

export default function SessionPageClient({ itemId }: { itemId: string }) {
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/student/session/${itemId}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('데이터를 불러올 수 없습니다'))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard/learning" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6">
          <ChevronLeft className="w-4 h-4" /> 달력으로 돌아가기
        </Link>
        <div className="brand-card p-12 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-brand-orange" />
          <p className="text-white/60">{error || '페이지를 불러올 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  const { item, curriculum, blocks, progress } = data;

  return (
    <div className="max-w-3xl mx-auto">
      {/* 상단 네비 */}
      <Link href="/dashboard/learning" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> 달력으로 돌아가기
      </Link>

      {/* 제목 영역 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded-full">
            {item.week_number}주차 {item.session_number}차시
          </span>
          {curriculum.subject_slug && (
            <span className="text-xs font-bold bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
              {SUBJECT_LABELS[curriculum.subject_slug] || curriculum.subject_slug}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-black text-white">
          {item.label || `${curriculum.title}`}
        </h1>
        {item.label && (
          <p className="text-sm text-white/40 mt-1">{curriculum.title}</p>
        )}
      </div>

      {/* 블록 렌더링 */}
      <div className="space-y-4">
        {blocks.length === 0 ? (
          <div className="brand-card p-12 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <p className="text-white/40">아직 학습 콘텐츠가 준비되지 않았습니다</p>
          </div>
        ) : (
          blocks.map(block => (
            <BlockRenderer key={block.id} block={block} progress={progress} />
          ))
        )}
      </div>
    </div>
  );
}

function BlockRenderer({
  block,
  progress,
}: {
  block: SessionBlock;
  progress: Record<string, { watch_percent: number; completed: boolean }>;
}) {
  const { block_type, content } = block;

  switch (block_type) {
    case 'section_header':
      return <SectionHeaderBlock content={content} />;
    case 'pdf':
      return <PdfBlock content={content} />;
    case 'hintbook':
      return <HintbookBlock content={content} />;
    case 'video_group':
      return <VideoGroupBlock content={content} progress={progress} />;
    case 'text':
      return <TextBlock content={content} />;
    default:
      return null;
  }
}

function SectionHeaderBlock({ content }: { content: Record<string, unknown> }) {
  const title = (content.title as string) || '';
  const color = (content.color as string) || 'green';
  const bgClass = SECTION_COLORS[color] || SECTION_COLORS.green;

  return (
    <div className={`${bgClass} rounded-xl px-5 py-3 mt-6 first:mt-0`}>
      <h2 className="text-sm font-black text-white tracking-wide">{title}</h2>
    </div>
  );
}

function PdfBlock({ content }: { content: Record<string, unknown> }) {
  const url = content.url as string;
  const originalName = (content.original_name as string) || 'document.pdf';

  return (
    <div className="brand-card p-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{originalName}</p>
          <p className="text-xs text-white/30">PDF 문제지</p>
        </div>
        <Download className="w-4 h-4 text-white/30 shrink-0" />
      </a>
    </div>
  );
}

function HintbookBlock({ content }: { content: Record<string, unknown> }) {
  const url = content.url as string;
  const originalName = (content.original_name as string) || 'hintbook.pdf';

  return (
    <div className="brand-card p-4 border-l-4 border-l-amber-500/50">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-lg">💡</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-400 mb-0.5">힌트북!</p>
          <p className="text-sm font-bold text-white truncate">{originalName}</p>
          <p className="text-xs text-white/30">각 문항 힌트만 보고 재도전 해보세요</p>
        </div>
        <Download className="w-4 h-4 text-white/30 shrink-0" />
      </a>
    </div>
  );
}

function VideoGroupBlock({
  content,
  progress,
}: {
  content: Record<string, unknown>;
  progress: Record<string, { watch_percent: number; completed: boolean }>;
}) {
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
      {/* 아코디언 헤더 */}
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
          {/* 간결한 진행률 */}
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

      {/* 펼쳐진 영상 목록 */}
      {isOpen && (
        <div className="border-t border-white/[0.06]">
          {videos.map((video, idx) => {
            const p = progress[video.bunny_video_id];
            const isActive = activeVideo === idx;
            const isDone = p?.completed;

            return (
              <div key={idx}>
                {/* 영상 제목 행 */}
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
                    {video.title || `${video.problem_number}번 해설`}
                  </span>
                  {p && !isDone && (
                    <span className="text-[10px] text-white/20 shrink-0">{p.watch_percent}%</span>
                  )}
                </button>

                {/* 선택된 영상 플레이어 (인라인) */}
                {isActive && (
                  <div className="px-4 pb-4">
                    <LearningVideoPlayer
                      bunnyVideoId={video.bunny_video_id}
                      initialProgress={p?.watch_percent || 0}
                      initialCompleted={p?.completed || false}
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

function TextBlock({ content }: { content: Record<string, unknown> }) {
  const body = (content.body as string) || '';

  return (
    <div className="brand-card p-4">
      <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}
