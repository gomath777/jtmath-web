'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface Season {
  id: string;
  title: string;
  subject_slug: string | null;
  start_date: string;
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

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  gichul:  { label: '교육청 기출',         color: 'bg-amber-100 text-amber-900 border-amber-200' },
  shimhwa: { label: '심화유형 + 누적복습', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  review:  { label: '복습 / 점검',         color: 'bg-blue-100 text-blue-900 border-blue-200' },
  concept: { label: '개념강의',            color: 'bg-violet-100 text-violet-900 border-violet-200' },
  bonus:   { label: '보충자료',            color: 'bg-rose-100 text-rose-900 border-rose-200' },
};

const CATEGORY_ORDER = ['concept', 'gichul', 'shimhwa', 'review', 'bonus'];

export default function LessonsClient({
  seasons,
  items,
  countMap,
}: {
  seasons: Season[];
  items: LessonItem[];
  countMap: Record<string, number>;
}) {
  const [seasonId, setSeasonId] = useState<string>(seasons[0]?.id || '');

  const itemsInSeason = useMemo(
    () => items.filter(i => i.curriculum_id === seasonId),
    [items, seasonId],
  );

  const weeks = useMemo(() => {
    const byWeek = new Map<number, LessonItem[]>();
    itemsInSeason.forEach(i => {
      const w = i.week_number ?? 0;
      if (!byWeek.has(w)) byWeek.set(w, []);
      byWeek.get(w)!.push(i);
    });
    return Array.from(byWeek.entries()).sort((a, b) => a[0] - b[0]);
  }, [itemsInSeason]);

  const activeSeason = seasons.find(s => s.id === seasonId);

  return (
    <div className="min-h-screen bg-parchment py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-[12px] text-stone hover:text-terracotta">← 어드민</Link>
            <h1 className="font-serif text-[24px] text-ink mt-1">학습 페이지 카탈로그</h1>
            <p className="text-[12px] text-stone mt-0.5">시즌별로 진도 한눈에 보기 + 페이지 클릭 → 학생 배정</p>
          </div>
          <Link
            href="/admin/seasons"
            className="px-3 py-2 rounded-lg border border-border-cream text-[13px] text-stone hover:bg-sand"
          >
            시즌 관리
          </Link>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {seasons.length === 0 ? (
            <p className="text-stone text-[13px]">
              시즌이 없습니다. <Link href="/admin/seasons" className="text-terracotta hover:underline">시즌 관리</Link>에서 먼저 만드세요.
            </p>
          ) : (
            seasons.map(s => (
              <button
                key={s.id}
                onClick={() => setSeasonId(s.id)}
                className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all border ${
                  seasonId === s.id
                    ? 'bg-terracotta text-ivory border-terracotta'
                    : 'bg-ivory text-charcoal border-border-cream hover:bg-sand'
                }`}
              >
                <span className="text-[11px] opacity-80 mr-1">[{SUBJECT_LABEL[s.subject_slug || ''] || s.subject_slug || '-'}]</span>
                {s.title}
              </button>
            ))
          )}
        </div>

        {activeSeason && (
          <div className="space-y-4">
            {weeks.length === 0 ? (
              <div className="bg-ivory border border-border-cream rounded-2xl px-8 py-16 text-center">
                <p className="font-serif text-[17px] text-ink tracking-tight">아직 페이지가 없습니다</p>
                <p className="text-[13px] text-stone mt-2">
                  CLI <code className="bg-sand px-2 py-0.5 rounded">npm run admin:session</code> 로 페이지 생성 후 다시 확인하세요.
                </p>
              </div>
            ) : (
              weeks.map(([w, list]) => {
                const unitName = list.find(i => i.unit_name)?.unit_name;
                const byCat = new Map<string, LessonItem[]>();
                list.forEach(i => {
                  const c = i.category || 'unknown';
                  if (!byCat.has(c)) byCat.set(c, []);
                  byCat.get(c)!.push(i);
                });
                const cats = Array.from(byCat.entries())
                  .sort(([a], [b]) => {
                    const ai = CATEGORY_ORDER.indexOf(a);
                    const bi = CATEGORY_ORDER.indexOf(b);
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                  });

                return (
                  <section key={w} className="bg-ivory border border-border-cream rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 bg-sand border-b border-border-cream flex items-baseline gap-3">
                      <span className="text-[12px] tracking-wider uppercase text-stone font-medium">{w}주차</span>
                      <h2 className="font-serif text-[17px] text-ink tracking-tight">{unitName || '(단원명 미설정)'}</h2>
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
                              {group.map(i => (
                                <Link
                                  key={i.id}
                                  href={`/admin/lessons/${i.id}`}
                                  className="block px-3 py-2 rounded-lg bg-parchment border border-border-cream hover:bg-white hover:shadow-ring-warm transition-all"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] tracking-wider uppercase text-stone w-12 shrink-0">
                                      {i.session_number ? `${i.session_number}차시` : '-'}
                                    </span>
                                    {i.variant_label && (
                                      <span className="text-[10px] uppercase bg-terracotta/15 text-terracotta px-1.5 py-0.5 rounded-full font-medium">
                                        {i.variant_label}
                                      </span>
                                    )}
                                    <span className="flex-1 text-[13px] text-ink truncate">
                                      {i.title || i.label || '(라벨 미설정)'}
                                    </span>
                                    <span className="text-[10px] text-stone shrink-0">
                                      {countMap[i.id] || 0}명
                                    </span>
                                  </div>
                                  {i.publish_date && (
                                    <p className="text-[10px] text-stone mt-0.5 ml-14">📅 {i.publish_date}</p>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
