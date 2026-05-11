'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface Season {
  id: string;
  title: string;
  subject_slug: string | null;
  start_date: string;
  description: string | null;
}

interface LessonItem {
  id: string;
  week_number: number | null;
  session_number: number | null;
  label: string | null;
  title: string | null;
  unit_name: string | null;
  category: string | null;
  variant_label: string | null;
  publish_date: string | null;
  is_released: boolean | null;
  public_slug: string | null;
  sort_order: number | null;
  curriculum_id: string;
}

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

const SUBJECT_ORDER = ['gs1', 'gs2', 'ds2', 'mj1', 'mj2', 'ht', 'gi'];

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  gichul:  { label: '교육청 기출',         color: 'bg-amber-100 text-amber-900 border-amber-200' },
  shimhwa: { label: '심화유형 + 누적복습', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  review:  { label: '복습 / 점검',         color: 'bg-blue-100 text-blue-900 border-blue-200' },
  concept: { label: '개념강의',            color: 'bg-violet-100 text-violet-900 border-violet-200' },
  bonus:   { label: '보충자료',            color: 'bg-rose-100 text-rose-900 border-rose-200' },
};

const CATEGORY_ORDER_GICHUL = ['gichul', 'shimhwa', 'review', 'bonus'];
const CATEGORY_ORDER_CONCEPT = ['concept'];

type Mode = 'gichul' | 'concept';

function formatLessonLabel(i: LessonItem): string {
  if (i.title) return i.title;
  const parts: string[] = [];
  if (i.week_number && i.session_number) parts.push(`${i.week_number}주 ${i.session_number}차시`);
  if (i.unit_name) parts.push(i.unit_name);
  if (parts.length > 0) return parts.join(' · ');
  return i.label || '(라벨 미설정)';
}

export default function LessonsClient({
  seasons,
  items,
  countMap,
}: {
  seasons: Season[];
  items: LessonItem[];
  countMap: Record<string, number>;
}) {
  // 과목 목록 (시즌이 있는 과목만)
  const subjects = useMemo(() => {
    const set = new Set<string>();
    seasons.forEach(s => { if (s.subject_slug) set.add(s.subject_slug); });
    return SUBJECT_ORDER.filter(s => set.has(s));
  }, [seasons]);

  const [subject, setSubject] = useState<string>(subjects[0] || 'gs1');
  const [mode, setMode] = useState<Mode>('gichul');

  const subjectSeasons = useMemo(
    () => seasons.filter(s => s.subject_slug === subject),
    [seasons, subject],
  );

  // 활성 카테고리 필터
  const categoryOrder = mode === 'gichul' ? CATEGORY_ORDER_GICHUL : CATEGORY_ORDER_CONCEPT;

  return (
    <div className="min-h-screen bg-parchment py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-[12px] text-stone hover:text-terracotta">← 어드민</Link>
            <h1 className="font-serif text-[24px] text-ink mt-1">학습 페이지 카탈로그</h1>
            <p className="text-[12px] text-stone mt-0.5">과목 탭 → 시즌별 진도 한눈에 보기 + 페이지 클릭 → 학생 배정</p>
          </div>
          <Link
            href="/admin/seasons"
            className="px-3 py-2 rounded-lg border border-border-cream text-[13px] text-stone hover:bg-sand"
          >
            시즌 관리
          </Link>
        </header>

        {/* 모드 토글 */}
        <div className="mb-4 inline-flex rounded-xl border border-border-cream bg-ivory p-1">
          <button
            onClick={() => setMode('gichul')}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition ${
              mode === 'gichul' ? 'bg-terracotta text-ivory' : 'text-stone hover:text-ink'
            }`}
          >
            기출·심화
          </button>
          <button
            onClick={() => setMode('concept')}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition ${
              mode === 'concept' ? 'bg-terracotta text-ivory' : 'text-stone hover:text-ink'
            }`}
          >
            개념강의
          </button>
        </div>

        {/* 과목 탭 */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-border-cream pb-3">
          {subjects.length === 0 ? (
            <p className="text-stone text-[13px]">
              시즌이 없습니다. <Link href="/admin/seasons" className="text-terracotta hover:underline">시즌 관리</Link>에서 먼저 만드세요.
            </p>
          ) : (
            subjects.map(s => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`px-5 py-2 rounded-t-xl text-[14px] font-medium transition border-b-2 -mb-[1px] ${
                  subject === s
                    ? 'border-terracotta text-terracotta'
                    : 'border-transparent text-stone hover:text-ink'
                }`}
              >
                {SUBJECT_LABEL[s] || s}
              </button>
            ))
          )}
        </div>

        {/* 시즌 섹션들 */}
        {subjectSeasons.length === 0 ? (
          <div className="bg-ivory border border-border-cream rounded-2xl px-8 py-16 text-center">
            <p className="font-serif text-[17px] text-ink tracking-tight">이 과목에 시즌이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-8">
            {subjectSeasons.map(season => {
              const seasonItems = items.filter(i => i.curriculum_id === season.id && (
                mode === 'gichul'
                  ? (i.category !== 'concept')
                  : (i.category === 'concept')
              ));

              const byWeek = new Map<number, LessonItem[]>();
              seasonItems.forEach(i => {
                const w = i.week_number ?? 0;
                if (!byWeek.has(w)) byWeek.set(w, []);
                byWeek.get(w)!.push(i);
              });
              const weeks = Array.from(byWeek.entries()).sort((a, b) => a[0] - b[0]);

              return (
                <section key={season.id}>
                  <div className="mb-3 flex items-baseline gap-3">
                    <h2 className="font-serif text-[20px] text-ink tracking-tight">{season.title}</h2>
                    <span className="text-[12px] text-stone">{season.start_date} · {seasonItems.length}개 페이지</span>
                  </div>

                  {weeks.length === 0 ? (
                    <div className="bg-ivory border border-border-cream rounded-2xl px-6 py-8 text-center">
                      <p className="text-[13px] text-stone">
                        아직 페이지가 없습니다. CLI <code className="bg-sand px-1.5 py-0.5 rounded">npm run admin:session</code> 또는 자연어로 추가하세요.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {weeks.map(([w, list]) => {
                        const unitNames = Array.from(new Set(list.map(i => i.unit_name).filter(Boolean))) as string[];
                        const unitHeader = unitNames.length === 1
                          ? unitNames[0]
                          : unitNames.length > 1
                            ? unitNames.join(' / ')
                            : '(단원명 미설정)';

                        const byCat = new Map<string, LessonItem[]>();
                        list.forEach(i => {
                          const c = i.category || 'unknown';
                          if (!byCat.has(c)) byCat.set(c, []);
                          byCat.get(c)!.push(i);
                        });
                        const cats = Array.from(byCat.entries())
                          .sort(([a], [b]) => {
                            const ai = categoryOrder.indexOf(a);
                            const bi = categoryOrder.indexOf(b);
                            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                          });

                        return (
                          <div key={w} className="bg-ivory border border-border-cream rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 bg-sand border-b border-border-cream flex items-baseline gap-3">
                              <span className="text-[12px] tracking-wider uppercase text-stone font-medium">{w}주차</span>
                              <h3 className="font-serif text-[16px] text-ink tracking-tight">{unitHeader}</h3>
                            </div>
                            <div className={`grid gap-0 ${cats.length >= 2 ? 'sm:grid-cols-2' : 'grid-cols-1'} divide-y sm:divide-y-0 sm:divide-x divide-border-cream`}>
                              {cats.map(([cat, group]) => {
                                const meta = CATEGORY_META[cat] || { label: cat, color: 'bg-stone/10 text-stone border-stone/20' };
                                return (
                                  <div key={cat} className="p-4">
                                    <div className="mb-3">
                                      <span className={`inline-block text-[11px] tracking-wider uppercase font-medium px-2 py-1 rounded-full border ${meta.color}`}>
                                        {meta.label}
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {group.map(i => {
                                        const display = formatLessonLabel(i);
                                        return (
                                          <div
                                            key={i.id}
                                            className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-parchment border border-border-cream hover:bg-white hover:shadow-ring-warm transition-all"
                                          >
                                            <Link
                                              href={`/admin/lessons/${i.id}`}
                                              className="flex-1 flex items-center gap-2 min-w-0"
                                              title="학생 배정"
                                            >
                                              <span className="text-[10px] tracking-wider uppercase text-stone w-12 shrink-0">
                                                {i.session_number ? `${i.session_number}차시` : '-'}
                                              </span>
                                              {i.variant_label && (
                                                <span className="text-[10px] uppercase bg-terracotta/15 text-terracotta px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                                  {i.variant_label}
                                                </span>
                                              )}
                                              <span className="flex-1 text-[13px] text-ink truncate">
                                                {display}
                                              </span>
                                              <span className="text-[10px] text-stone shrink-0">
                                                {countMap[i.id] || 0}명
                                              </span>
                                            </Link>
                                            {i.public_slug && (
                                              <a
                                                href={`/lesson/${i.public_slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="shrink-0 text-stone hover:text-terracotta px-1.5 py-1 rounded transition-colors"
                                                title="학습 페이지 미리보기 (새 탭)"
                                                aria-label="학습 페이지 미리보기"
                                              >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                                  <polyline points="15 3 21 3 21 9"/>
                                                  <line x1="10" y1="14" x2="21" y2="3"/>
                                                </svg>
                                              </a>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
