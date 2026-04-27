'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Video, ChevronRight, BookOpen, CheckCircle2, Calendar } from 'lucide-react';
import { SUBJECT_LABELS } from '@/components/blocks/types';

interface PdfItem {
  url: string;
  original_name?: string;
  file_size?: string;
}

interface ConceptVideo {
  bunny_video_id: string;
  title: string;
  lecture_number: number | null;
  order_index: number;
  duration_seconds: number | null;
  progress: { watch_percent: number; completed: boolean } | null;
}

interface ConceptSet {
  id: string;
  title: string;
  description: string | null;
  subject_slug: string;
  chapter_order: number | null;
  published_at: string | null;
  pdfs: PdfItem[];
  videos: ConceptVideo[];
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

interface SeasonPlanProps {
  sets: ConceptSet[];
  basePath: string;
  slug: string;
}

function SeasonPlan({ sets, basePath, slug }: SeasonPlanProps) {
  // published_at별로 그룹핑 (chapter_order 오름차순)
  const byWeek = new Map<string, ConceptSet[]>();
  for (const s of sets) {
    if (!s.published_at) continue;
    const key = s.published_at;
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(s);
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
    <div className="mb-6 px-5 py-5 bg-ivory border border-border-cream rounded-2xl">
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
                {/* 마커 */}
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

                <div className="flex items-baseline gap-2.5 mb-2">
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

interface Props {
  slug: string;
  basePath?: string;
  initialSubjectSlug?: string | null;
}

export default function ConceptLecturesSection(props: Props) {
  const { slug, basePath = '/s', initialSubjectSlug = null } = props;
  const [sets, setSets] = useState<ConceptSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(initialSubjectSlug);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/public/student/concept-lectures');
        const d = await res.json();
        setSets(d.sets || []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (initialSubjectSlug) setSelectedSubject(initialSubjectSlug);
  }, [initialSubjectSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-stone" />
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <div className="bg-ivory border border-border-cream rounded-2xl px-8 py-16 text-center">
        <BookOpen className="w-10 h-10 mx-auto mb-3 text-stone" />
        <p className="font-serif font-medium text-[17px] text-ink tracking-tight">
          배정된 개념강의가 없습니다
        </p>
        <p className="text-[13px] text-olive mt-2">
          선생님이 배정하면 여기에 표시됩니다
        </p>
      </div>
    );
  }

  // 과목별 그룹화
  const groups = new Map<string, ConceptSet[]>();
  for (const s of sets) {
    const key = s.subject_slug || '기타';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const subjectSlugs = Array.from(groups.keys());
  const activeSubject = (selectedSubject && subjectSlugs.includes(selectedSubject))
    ? selectedSubject
    : subjectSlugs[0];
  const activeSets = groups.get(activeSubject) || [];
  const showSubjectTabs = subjectSlugs.length > 1;

  return (
    <div className="space-y-5">
      {/* ─── 시즌 학습 일정 ─── */}
      <SeasonPlan sets={activeSets} basePath={basePath} slug={slug} />

      {/* ─── 과목 서브탭 ─── */}
      {showSubjectTabs && (
        <div className="flex gap-2 flex-wrap">
          {subjectSlugs.map(slug => {
            const label = SUBJECT_LABELS[slug] || slug;
            const setsInSubject = groups.get(slug) || [];
            const done = setsInSubject.reduce(
              (n, s) => n + (s.videos.length > 0 && s.videos.every(v => v.progress?.completed) ? 1 : 0), 0,
            );
            const isActive = slug === activeSubject;
            return (
              <button
                key={slug}
                onClick={() => setSelectedSubject(slug)}
                className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-terracotta text-ivory shadow-ring-terracotta'
                    : 'bg-ivory text-charcoal border border-border-warm hover:bg-sand'
                }`}
              >
                {label}
                <span className={`ml-1.5 text-[11px] ${isActive ? 'opacity-75' : 'text-stone'}`}>
                  {done}/{setsInSubject.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── 차시 카드 리스트 (각 카드 → 독립 페이지로 이동) ─── */}
      <div className="space-y-3">
        {activeSets.map(set => {
          const completedCount = set.videos.filter(v => v.progress?.completed).length;
          const totalVideos = set.videos.length;
          const allDone = totalVideos > 0 && completedCount === totalVideos;
          return (
            <Link
              key={set.id}
              href={`${basePath}/${slug}/concept/${set.id}`}
              className="group flex items-center gap-4 px-5 py-4 bg-ivory border border-border-cream rounded-2xl hover:border-terracotta/40 hover:shadow-ring-warm transition-all"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                allDone ? 'bg-terracotta/15' : 'bg-terracotta/10'
              }`}>
                <Video className="w-5 h-5 text-terracotta" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-medium text-[16px] text-ink truncate tracking-tight">
                  {set.title}
                </p>
                <p className="text-[12px] text-olive mt-0.5">
                  PDF {set.pdfs.length}개 · 영상 {totalVideos}개
                  {totalVideos > 0 && ` · 완료 ${completedCount}/${totalVideos}`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-stone shrink-0 group-hover:text-terracotta transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
