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

function isShimhwaSession(blocks: SessionBlock[]): boolean {
  return blocks.some(b => {
    const c = b.content as Record<string, unknown>;
    return c?.side_a !== undefined || c?.is_bonus === true;
  });
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
        <Loader2 className="w-6 h-6 animate-spin text-stone" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-olive hover:text-ink text-[13px] mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {backLabel}
        </Link>
        <div className="bg-ivory border border-border-cream rounded-2xl px-8 py-16 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-crimson" />
          <p className="font-serif text-[17px] text-ink tracking-tight">
            {error || '페이지를 불러올 수 없습니다'}
          </p>
        </div>
      </div>
    );
  }

  const { item, curriculum, blocks, progress } = data;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[13px] text-olive hover:text-ink mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> {backLabel}
      </Link>

      {/* ─── Editorial header ─── */}
      <header className="mb-10 pb-8 border-b border-border-warm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] tracking-[0.12em] uppercase font-medium text-terracotta bg-terracotta/10 px-2 py-1 rounded-full">
            {item.week_number}주차 · {item.session_number}차시
          </span>
          {curriculum.subject_slug && (
            <span className="text-[10px] tracking-[0.12em] uppercase font-medium text-olive bg-sand px-2 py-1 rounded-full">
              {SUBJECT_LABELS[curriculum.subject_slug] || curriculum.subject_slug}
            </span>
          )}
        </div>
        <h1 className="font-serif font-medium text-[38px] text-ink tracking-tightest leading-[1.08]">
          {item.label || curriculum.title}
        </h1>
        {item.label && (
          <p className="text-[14px] text-olive mt-2">{curriculum.title}</p>
        )}
      </header>

      {/* ─── Blocks ─── */}
      {blocks.length === 0 ? (
        <div className="bg-ivory border border-border-cream rounded-2xl px-8 py-16 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-stone" />
          <p className="text-[14px] text-olive">
            아직 학습 콘텐츠가 준비되지 않았습니다
          </p>
        </div>
      ) : isShimhwaSession(blocks) ? (
        /* ── 심화유형 타임라인 레이아웃 ── */
        <div className="relative">
          {/* 세로 연결선 */}
          <div className="absolute left-[10px] top-10 bottom-10 w-px bg-gradient-to-b from-terracotta/30 via-terracotta/20 to-transparent" />
          <div className="space-y-5">
            {blocks.map((block, idx) => {
              const c = block.content as Record<string, unknown>;
              const isOptional = c?.is_optional === true;
              const isBonus = c?.is_bonus === true;
              const step = c?.step as number | undefined;

              return (
                <div key={block.id} className="relative pl-9">
                  {/* 스텝 원형 인디케이터 */}
                  <div className={`absolute left-0 top-[21px] w-[21px] h-[21px] rounded-full border-2 flex items-center justify-center z-10 bg-ivory
                    ${isOptional ? 'border-stone/30' : isBonus ? 'border-terracotta/25' : 'border-terracotta/60'}`}
                  >
                    {isBonus ? (
                      <span className="text-[8px] font-bold text-terracotta/40">+</span>
                    ) : step != null ? (
                      <span className="text-[10px] font-semibold text-terracotta/80">{step}</span>
                    ) : null}
                  </div>
                  <BlockRenderer
                    block={block}
                    progress={progress}
                    subjectSlug={curriculum.subject_slug}
                    progressEndpoint={progressEndpoint}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {blocks.map(block => (
            <BlockRenderer
              key={block.id}
              block={block}
              progress={progress}
              subjectSlug={curriculum.subject_slug}
              progressEndpoint={progressEndpoint}
            />
          ))}
        </div>
      )}
    </div>
  );
}
