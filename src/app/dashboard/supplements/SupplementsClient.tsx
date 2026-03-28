'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Loader2, PlayCircle, CheckCircle } from 'lucide-react';
import LearningVideoPlayer from '@/components/LearningVideoPlayer';

interface Video {
  id: string;
  problem_number: number;
  bunny_video_id: string;
  title: string;
  is_matched: boolean;
  order_index: number;
}

interface LearningSet {
  id: string;
  title: string;
  description: string | null;
  subject_slug: string | null;
  pdf_url: string | null;
  learning_set_videos: Video[];
}

interface Assignment {
  id: string;
  label: string | null;
  published_at: string;
  learning_sets: LearningSet;
}

interface ProgressMap {
  [bunnyVideoId: string]: { watch_percent: number; completed: boolean };
}

const SUBJECT_LABELS: Record<string, string> = {
  gs1: '공통수학1',
  gs2: '공통수학2',
  ds2: '대수',
  ms1: '미적분1',
};

export default function SupplementsClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/student/assignments')
      .then(res => res.json())
      .then(data => {
        // 보충자료 = curriculum_id 없는 개별 배정
        const supplements = (data.assignments || []).filter(
          (a: Assignment & { curriculum_id?: string }) => !a.curriculum_id && a.learning_sets
        );
        setAssignments(supplements);
        setProgress(data.progress || {});
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
          <p className="text-sm text-white/30 mt-2">선생님이 개별 보충자료를 배정하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(assignment => {
            const set = assignment.learning_sets;
            if (!set) return null;
            const isExpanded = expandedId === assignment.id;
            const videos = set.learning_set_videos || [];
            const completedCount = videos.filter(v => progress[v.bunny_video_id]?.completed).length;
            const allDone = videos.length > 0 && completedCount === videos.length;

            return (
              <div key={assignment.id} className="brand-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : assignment.id)}
                  className="w-full p-5 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brand-mint/10 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-brand-mint" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm">{set.title}</h3>
                        {allDone && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> 완료
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {set.subject_slug && (
                          <span className="text-[10px] font-bold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">
                            {SUBJECT_LABELS[set.subject_slug] || set.subject_slug}
                          </span>
                        )}
                        {videos.length > 0 && (
                          <span className="text-[10px] text-white/30">
                            영상 {completedCount}/{videos.length}
                          </span>
                        )}
                        <span className="text-[10px] text-white/20">
                          {new Date(assignment.published_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-5 space-y-4">
                    {/* PDF 다운로드 */}
                    {set.pdf_url && (
                      <a
                        href={set.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                      >
                        <FileText className="w-5 h-5 text-red-400" />
                        <span className="text-sm font-bold text-white">문제지 PDF</span>
                        <Download className="w-4 h-4 text-white/30 ml-auto" />
                      </a>
                    )}

                    {/* 해설 영상 */}
                    {videos.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-white/40 flex items-center gap-1">
                          <PlayCircle className="w-3.5 h-3.5" /> 해설 영상
                        </p>
                        {videos.map(video => {
                          const p = progress[video.bunny_video_id];
                          return (
                            <LearningVideoPlayer
                              key={video.id}
                              bunnyVideoId={video.bunny_video_id}
                              title={video.title}
                              initialProgress={p?.watch_percent || 0}
                              initialCompleted={p?.completed || false}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
