'use client';

import SectionHeader from './SectionHeader';
import HeroCard from './HeroCard';
import MiniCard from './MiniCard';
import NextReleaseFooter from './NextReleaseFooter';
import type { VariantProps } from './types';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

function todayLabel(): string {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY[d.getDay()]})`;
}

interface VariantAProps extends VariantProps {
  /** 섹션 헤더 타이틀 (기본 "오늘 할 일") — Variant B가 "1차시" / "2차시" 로 override */
  sectionTitle?: string;
  /** 섹션 헤더 부제 (선택적) */
  sectionSubtitle?: string;
}

/**
 * Variant A — 포커스 강화 (Hero + Mini × 2).
 * Variant B에서 윈도우 선택에 따라 sectionTitle/sectionSubtitle 재정의해 호출됨.
 */
export default function VariantA({
  tasks,
  nextReleaseAt,
  slug,
  basePath,
  onOpenConcept,
  sectionTitle,
  sectionSubtitle,
}: VariantAProps) {
  const title = sectionTitle || '오늘 할 일';
  const subtitleOrToday = sectionSubtitle || todayLabel();

  if (tasks.length === 0) {
    return (
      <section className="mb-8">
        <SectionHeader title={title} countLabel={subtitleOrToday} />
        <NextReleaseFooter nextReleaseAt={nextReleaseAt} />
      </section>
    );
  }

  const hero = tasks[0];
  const mini = tasks.slice(1, 3);

  return (
    <section className="mb-8">
      <SectionHeader
        title={title}
        countLabel={`${subtitleOrToday} · ${tasks.length}개`}
      />
      <div className="space-y-3">
        <HeroCard task={hero} slug={slug} basePath={basePath} onOpenConcept={onOpenConcept} />
        {mini.length > 0 && (
          <div className={`grid gap-3 ${mini.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {mini.map(t => (
              <MiniCard
                key={`${t.kind}-${t.id}`}
                task={t}
                slug={slug}
                basePath={basePath}
                onOpenConcept={onOpenConcept}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
