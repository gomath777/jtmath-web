'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle2 } from 'lucide-react';

interface ConceptVideo {
  bunny_video_id: string;
  progress: { watch_percent: number; completed: boolean } | null;
}

interface ConceptSet {
  id: string;
  title: string;
  subject_slug: string;
  chapter_order: number | null;
  published_at: string | null;
  videos: ConceptVideo[];
}

interface Props {
  slug: string;
  basePath?: string;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function ymdKst(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function formatRange(startIso: string): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => {
    const k = new Date(d.getTime() + KST_OFFSET_MS);
    return `${k.getUTCMonth() + 1}/${k.getUTCDate()}`;
  };
  return `${fmt(start)} ~ ${fmt(end)}`;
}

export default function SeasonPlan({ slug, basePath = '/s' }: Props) {
  const [sets, setSets] = useState<ConceptSet[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/public/student/concept-lectures');
        const d = await r.json();
        setSets(d.sets || []);
      } catch {
        /* ignore */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  if (!loaded || sets.length === 0) return null;

  // published_at별 그룹핑
  const byWeek = new Map<string, ConceptSet[]>();
  for (const s of sets) {
    if (!s.published_at) continue;
    if (!byWeek.has(s.published_at)) byWeek.set(s.published_at, []);
    byWeek.get(s.published_at)!.push(s);
  }
  if (byWeek.size === 0) return null;

  const weeks = Array.from(byWeek.entries())
    .map(([start, ws]) => ({
      start,
      sets: ws.slice().sort((a, b) => (a.chapter_order ?? 0) - (b.chapter_order ?? 0)),
    }))
    .sort((a, b) => a.start.localeCompare(b.start));

  const today = ymdKst(new Date());

  return (
    <div className="mt-6 px-5 py-5 bg-ivory border border-border-cream rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-terracotta" />
        <p className="text-[12px] tracking-[0.1em] uppercase text-stone font-medium">
          시즌 학습 일정
        </p>
      </div>

      <div className="relative">
        {/* 좌측 세로 연결선 */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-terracotta/15" aria-hidden />

        <div className="space-y-5">
          {weeks.map((w, idx) => {
            const startYmd = ymdKst(new Date(w.start));
            const endYmd = ymdKst(new Date(new Date(w.start).getTime() + 6 * 24 * 60 * 60 * 1000));
            const isCurrent = today >= startYmd && today <= endYmd;
            const isPast = today > endYmd;
            const completedCount = w.sets.filter(s =>
              s.videos.length > 0 && s.videos.every(v => v.progress?.completed),
            ).length;
            const allDone = w.sets.length > 0 && completedCount === w.sets.length;

            return (
              <div key={w.start} className="relative pl-7">
                <span
                  className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                    allDone
                      ? 'bg-terracotta border-terracotta'
                      : isCurrent
                        ? 'bg-ivory border-terracotta'
                        : 'bg-ivory border-terracotta/30'
                  }`}
                  aria-hidden
                />

                <div className="flex items-baseline gap-2.5 mb-2 flex-wrap">
                  <span
                    className={`font-serif font-medium text-[15px] tracking-tight ${
                      isCurrent ? 'text-ink' : isPast ? 'text-stone' : 'text-charcoal'
                    }`}
                  >
                    {idx + 1}주차
                  </span>
                  <span className="text-[11px] text-stone tabular-nums">{formatRange(w.start)}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-terracotta px-1.5 py-0.5 rounded-md bg-terracotta/10">
                      이번 주
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {w.sets.map(s => {
                    const videosCompleted = s.videos.length > 0 && s.videos.every(v => v.progress?.completed);
                    return (
                      <Link
                        key={s.id}
                        href={`${basePath}/${slug}/concept/${s.id}`}
                        className="group flex items-center gap-2 py-1 text-[13px] hover:text-terracotta transition-colors"
                      >
                        {videosCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-terracotta shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-stone/40 shrink-0" />
                        )}
                        <span className={`truncate ${videosCompleted ? 'text-stone line-through' : 'text-charcoal'}`}>
                          {s.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
