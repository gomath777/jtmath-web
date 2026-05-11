'use client';

import Link from 'next/link';
import { BookOpen, Video, ArrowRight } from 'lucide-react';
import type { TodayTask } from './types';

interface Props {
  task: TodayTask;
  slug: string;
  basePath: string;
  onOpenConcept?: (setId: string, subjectSlug: string) => void;
}

/**
 * 풀블리드 Hero 카드.
 * 학습 완료 / 영상 진도 추적을 대시보드에서 제거한 뒤: NEW 뱃지와 "지난 주" 라벨(시간 기반)만.
 * 세션 URL은 lessonSlug 있으면 `/lesson/{slug}`, 없으면 legacy redirect.
 */
export default function HeroCard({ task, slug, basePath, onOpenConcept }: Props) {
  const sessionHref = task.kind === 'session'
    ? (task.lessonSlug ? `/lesson/${task.lessonSlug}` : `${basePath}/${slug}/session/${task.id}`)
    : null;
  const Icon = task.kind === 'concept' ? Video : BookOpen;

  const body = (
    <div className="group bg-ivory border border-border-cream rounded-2xl px-6 py-6 sm:py-7 shadow-whisper hover:shadow-ring-warm transition-all">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-terracotta/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-terracotta" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] tracking-[0.08em] uppercase text-stone font-medium">
              {task.subject_label} · {task.kind === 'concept' ? '개념강의' : '학습 페이지'}
            </span>
            <span className="text-[10px] tracking-wider uppercase font-medium px-1.5 py-0.5 rounded-full bg-terracotta text-ivory">
              NEW
            </span>
            {task.isOverdue && (
              <span className="text-[10px] tracking-wider uppercase font-medium px-1.5 py-0.5 rounded-full bg-transparent text-olive border border-border-warm">
                지난 주
              </span>
            )}
          </div>
          <p className="font-serif font-medium text-[20px] sm:text-[22px] text-ink tracking-tight leading-snug break-keep">
            {task.title}
          </p>
          <p className="text-[12px] text-olive mt-1.5 break-keep">
            {task.meta}
          </p>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-terracotta text-ivory text-[13px] font-medium rounded-xl shadow-ring-terracotta group-hover:bg-terracotta-light transition-colors">
          바로 시작
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );

  if (sessionHref) {
    return (
      <Link href={sessionHref} className="block">
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
      className="block w-full text-left"
    >
      {body}
    </button>
  );
}
