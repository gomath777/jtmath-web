'use client';

import BlockRenderer from '@/components/blocks/BlockRenderer';
import type { SessionBlock, ProgressMap } from '@/components/blocks/types';

interface LessonContentProps {
  heading: string;
  subjectLabel: string;
  subjectSlug: string;
  blocks: SessionBlock[];
  progress: ProgressMap;
  progressEndpoint?: string;
  assignedDate: string | null;
  isAuthenticated: boolean;
}

function formatDate(date: string): string {
  const [, m, d] = date.split('-');
  return `${parseInt(m)}월 ${parseInt(d)}일`;
}

export default function LessonContent({
  heading,
  subjectLabel,
  subjectSlug,
  blocks,
  progress,
  progressEndpoint,
  assignedDate,
  isAuthenticated,
}: LessonContentProps) {
  return (
    <article>
      <header className="mb-8 pb-6 border-b border-border-cream">
        {subjectLabel && (
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2">
            {subjectLabel}
          </p>
        )}
        <h1 className="font-serif text-[28px] sm:text-[32px] text-ink tracking-tight leading-tight">
          {heading}
        </h1>
        {isAuthenticated && assignedDate && (
          <p className="mt-3 text-[12px] text-stone">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sand border border-border-cream">
              📅 {formatDate(assignedDate)} 배정
            </span>
          </p>
        )}
      </header>

      {blocks.length === 0 ? (
        <p className="text-center text-stone py-12 text-[14px]">
          아직 콘텐츠가 없습니다.
        </p>
      ) : (
        <div className="space-y-6">
          {blocks.map(block => (
            <BlockRenderer
              key={block.id}
              block={block}
              progress={progress}
              subjectSlug={subjectSlug}
              progressEndpoint={progressEndpoint}
            />
          ))}
        </div>
      )}
    </article>
  );
}
