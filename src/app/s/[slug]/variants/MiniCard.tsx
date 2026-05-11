'use client';

import Link from 'next/link';
import { BookOpen, Video, ChevronRight } from 'lucide-react';
import type { TodayTask } from './types';

interface Props {
  task: TodayTask;
  slug: string;
  basePath: string;
  onOpenConcept?: (setId: string, subjectSlug: string) => void;
}

/**
 * Hero 아래 보조 Mini 카드. NEW · "지난 주" 라벨(시간 기반)만.
 * 세션 URL은 `${basePath}/${slug}/session/${id}`.
 */
export default function MiniCard({ task, slug, basePath, onOpenConcept }: Props) {
  const sessionHref = task.kind === 'session'
    ? (task.lessonSlug ? `/lesson/${task.lessonSlug}` : `${basePath}/${slug}/session/${task.id}`)
    : null;
  const Icon = task.kind === 'concept' ? Video : BookOpen;

  const body = (
    <div className="group bg-ivory border border-border-cream rounded-2xl px-5 py-4 flex items-center gap-3.5 hover:bg-white hover:shadow-ring-warm transition-all h-full">
      <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-terracotta" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[10px] tracking-[0.08em] uppercase text-stone font-medium">
            {task.subject_label}
          </span>
          <span className="text-[9px] tracking-wider uppercase font-medium px-1 py-[1px] rounded-full bg-terracotta text-ivory">
            NEW
          </span>
          {task.isOverdue && (
            <span className="text-[9px] tracking-wider uppercase font-medium px-1 py-[1px] rounded-full bg-transparent text-olive border border-border-warm">
              지난 주
            </span>
          )}
        </div>
        <p className="font-serif font-medium text-[14px] text-ink truncate tracking-tight break-keep">
          {task.title}
        </p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-stone group-hover:text-terracotta shrink-0 transition-colors" />
    </div>
  );

  if (sessionHref) {
    return (
      <Link href={sessionHref} className="block h-full">
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        if (task.concept_set_id) {
          onOpenConcept?.(task.concept_set_id, task.subject_slug);
        }
      }}
      className="block w-full text-left h-full"
    >
      {body}
    </button>
  );
}
