'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface Assignment {
  id: string;
  label: string | null;
  session_number: number | null;
  published_at: string;
  curriculum_item_id: string | null;
  curriculum_id: string | null;
  curriculum: { title: string; subject_slug: string } | null;
  curriculum_item: { label: string; week_number: number; session_number: number } | null;
  learning_sets: { title: string; subject_slug: string | null; pdf_url: string | null } | null;
}

const SUBJECT_LABELS: Record<string, string> = {
  gs1: '공통수학1',
  gs2: '공통수학2',
  ds2: '대수',
  ms1: '미적분1',
};

export default function SupplementsClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/assignments')
      .then(res => res.json())
      .then(data => {
        // "보충"이 label에 포함된 배정만 표시
        const supplements = (data.assignments || []).filter(
          (a: Assignment) => a.label?.includes('보충')
        );
        // session_number 순으로 정렬
        supplements.sort((a: Assignment, b: Assignment) =>
          (a.session_number || 0) - (b.session_number || 0)
        );
        setAssignments(supplements);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-brand-mint" />
        <h1 className="text-2xl font-black text-white">보충자료</h1>
      </div>

      {assignments.length === 0 ? (
        <div className="brand-card p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <h2 className="text-lg font-bold text-white/60">보충자료가 없습니다</h2>
          <p className="text-sm text-white/30 mt-2">선생님이 보충자료를 배정하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(assignment => {
            const subjectSlug = assignment.curriculum?.subject_slug || assignment.learning_sets?.subject_slug;
            const displayTitle = assignment.label || assignment.curriculum?.title || '보충자료';

            return (
              <div key={assignment.id} className="brand-card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-mint/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-brand-mint" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {subjectSlug && (
                          <span className="text-[10px] font-bold bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                            {SUBJECT_LABELS[subjectSlug] || subjectSlug}
                          </span>
                        )}
                        <span className="text-[10px] text-white/20">
                          {new Date(assignment.published_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 배정
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-lg mt-1">{displayTitle}</h3>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] px-5 py-3">
                  {assignment.curriculum_item_id ? (
                    <Link
                      href={`/dashboard/supplements/session/${assignment.curriculum_item_id}`}
                      className="w-full text-center text-sm font-bold text-brand-mint hover:text-emerald-400 transition-colors py-1 block"
                    >
                      학습 시작하기 →
                    </Link>
                  ) : (
                    <span className="w-full text-center text-sm text-white/30 py-1 block">콘텐츠 준비 중</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
