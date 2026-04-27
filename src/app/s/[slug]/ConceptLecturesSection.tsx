'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Video, ChevronRight, BookOpen } from 'lucide-react';
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
  pdfs: PdfItem[];
  videos: ConceptVideo[];
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
