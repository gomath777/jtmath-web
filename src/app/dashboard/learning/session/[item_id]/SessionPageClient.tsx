'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, BookOpen, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import { SUBJECT_LABELS } from '@/components/blocks/types';
import type { SessionBlock, ProgressMap } from '@/components/blocks/types';

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
  progress: ProgressMap;
}

export default function SessionPageClient({
  itemId,
  backHref = '/dashboard/learning',
  backLabel = '달력으로 돌아가기',
  apiEndpoint,
  progressEndpoint,
}: {
  itemId: string;
  backHref?: string;
  backLabel?: string;
  apiEndpoint?: string;
  progressEndpoint?: string;
}) {
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = apiEndpoint || `/api/student/session/${itemId}`;
    fetch(url)
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('데이터를 불러올 수 없습니다'))
      .finally(() => setLoading(false));
  }, [itemId, apiEndpoint]);

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
        <Link href={backHref} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6">
          <ChevronLeft className="w-4 h-4" /> {backLabel}
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
      <Link href={backHref} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> {backLabel}
      </Link>

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

      <div className="space-y-4">
        {blocks.length === 0 ? (
          <div className="brand-card p-12 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <p className="text-white/40">아직 학습 콘텐츠가 준비되지 않았습니다</p>
          </div>
        ) : (
          blocks.map(block => (
            <BlockRenderer
              key={block.id}
              block={block}
              progress={progress}
              subjectSlug={curriculum.subject_slug}
              progressEndpoint={progressEndpoint}
            />
          ))
        )}
      </div>
    </div>
  );
}
