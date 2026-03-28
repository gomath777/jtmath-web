'use client';

import { useState, useEffect, useMemo } from 'react';
import { BookOpen, CheckCircle, ChevronLeft, ChevronRight, Lock, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';

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

interface CurriculumInfo {
  title: string;
  subject_slug: string;
}

interface CurriculumItemInfo {
  label: string;
  week_number: number;
  session_number: number;
}

interface Assignment {
  id: string;
  label: string | null;
  week_number: number | null;
  session_number: number | null;
  published_at: string;
  created_at: string;
  curriculum_id: string | null;
  curriculum_item_id: string | null;
  learning_sets: LearningSet;
  curriculum: CurriculumInfo | null;
  curriculum_item: CurriculumItemInfo | null;
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

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export default function LearningClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/student/assignments');
      const data = await res.json();
      setAssignments(data.assignments || []);
      setProgress(data.progress || {});

      // 오늘 날짜에 배정이 있으면 자동 선택
      const today = formatDate(new Date());
      const todayAssignments = (data.assignments || []).filter(
        (a: Assignment) => formatDate(new Date(a.published_at)) === today
      );
      if (todayAssignments.length > 0) {
        setSelectedDate(today);
      }
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
    }
  };

  // 날짜별 배정 그룹핑
  const assignmentsByDate = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    assignments.forEach(a => {
      const dateKey = formatDate(new Date(a.published_at));
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(a);
    });
    return map;
  }, [assignments]);

  // 달력 데이터 생성
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: Array<{ date: Date; inMonth: boolean }> = [];

    // 이전 달 패딩
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), inMonth: false });
    }
    // 이번 달
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), inMonth: true });
    }
    // 다음 달 패딩
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), inMonth: false });
      }
    }
    return days;
  }, [currentMonth]);

  const today = formatDate(new Date());

  // 선택한 날짜의 배정 (차시번호 순 정렬)
  const selectedAssignments = selectedDate
    ? (assignmentsByDate[selectedDate] || []).sort((a, b) => (a.session_number || 0) - (b.session_number || 0))
    : [];

  const getSessionProgress = (assignment: Assignment) => {
    const videos = assignment.learning_sets?.learning_set_videos || [];
    if (videos.length === 0) return { total: 0, completed: 0 };
    const completed = videos.filter(v => progress[v.bunny_video_id]?.completed).length;
    return { total: videos.length, completed };
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CalendarIcon className="w-6 h-6 text-brand-blue" />
        <h1 className="text-2xl font-black text-white">내 학습</h1>
      </div>

      {/* 달력 */}
      <div className="brand-card p-5 mb-6">
        {/* 달력 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-white">
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((day, i) => (
            <div key={day} className={`text-center text-xs font-bold py-2 ${i === 0 ? 'text-red-400/60' : i === 6 ? 'text-blue-400/60' : 'text-white/30'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, inMonth }, idx) => {
            const dateKey = formatDate(date);
            const dayAssignments = assignmentsByDate[dateKey] || [];
            const hasAssignment = dayAssignments.length > 0;
            const isToday = dateKey === today;
            const isSelected = dateKey === selectedDate;
            const isPast = dateKey < today;
            const dayOfWeek = date.getDay();

            return (
              <button
                key={idx}
                onClick={() => hasAssignment ? setSelectedDate(isSelected ? null : dateKey) : undefined}
                disabled={!hasAssignment}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all
                  ${!inMonth ? 'opacity-20' : ''}
                  ${isSelected ? 'bg-brand-blue ring-2 ring-brand-blue/50' : ''}
                  ${isToday && !isSelected ? 'ring-1 ring-white/20' : ''}
                  ${hasAssignment && !isSelected ? 'bg-white/[0.06] hover:bg-white/[0.10] cursor-pointer' : ''}
                  ${!hasAssignment ? 'cursor-default' : ''}
                `}
              >
                <span className={`
                  font-bold text-sm
                  ${isSelected ? 'text-white' : ''}
                  ${!isSelected && isToday ? 'text-brand-blue' : ''}
                  ${!isSelected && !isToday && dayOfWeek === 0 ? 'text-red-400/70' : ''}
                  ${!isSelected && !isToday && dayOfWeek === 6 ? 'text-blue-400/70' : ''}
                  ${!isSelected && !isToday && dayOfWeek !== 0 && dayOfWeek !== 6 ? 'text-white/60' : ''}
                  ${!inMonth ? 'text-white/20' : ''}
                `}>
                  {date.getDate()}
                </span>
                {hasAssignment && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayAssignments.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-blue'}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택한 날짜의 과제 */}
      {selectedDate && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white/50 px-1">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </h3>

          {selectedAssignments.length === 0 ? (
            <div className="brand-card p-8 text-center">
              <Lock className="w-8 h-8 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm">이 날짜에 배정된 학습이 없습니다</p>
            </div>
          ) : (
            selectedAssignments.map((assignment) => {
              const set = assignment.learning_sets;
              const isCurriculum = !!assignment.curriculum_item_id;
              const sp = getSessionProgress(assignment);

              // 커리큘럼 기반: 커리큘럼 제목 사용, 보충자료: learning_set 제목 사용
              const subjectSlug = assignment.curriculum?.subject_slug || set?.subject_slug;
              const displayTitle = isCurriculum
                ? (assignment.curriculum?.title || assignment.label || '학습')
                : (set?.title || assignment.label || '학습');
              const weekSession = assignment.week_number
                ? `${assignment.week_number}주차 ${assignment.session_number ? `${assignment.session_number}차시` : ''}`
                : null;

              return (
                <div key={assignment.id} className="brand-card overflow-hidden">
                  {/* 차시 헤더 */}
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isCurriculum ? 'bg-brand-blue/10' : 'bg-amber-500/10'
                      }`}>
                        {isCurriculum ? (
                          <CalendarIcon className="w-6 h-6 text-brand-blue" />
                        ) : (
                          <BookOpen className="w-6 h-6 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {weekSession && (
                            <span className="text-[10px] font-bold bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded-full">
                              {weekSession}
                            </span>
                          )}
                          {subjectSlug && (
                            <span className="text-[10px] font-bold bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                              {SUBJECT_LABELS[subjectSlug] || subjectSlug}
                            </span>
                          )}
                          {sp.total > 0 && sp.completed === sp.total && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> 완료
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-lg mt-1">{displayTitle}</h3>
                        {assignment.label && isCurriculum && assignment.label !== displayTitle && (
                          <p className="text-xs text-white/40 mt-1">{assignment.label}</p>
                        )}
                      </div>
                    </div>

                    {/* 진행률 바 (보충자료에만, 커리큘럼은 세션 페이지에서 확인) */}
                    {!isCurriculum && sp.total > 0 && (
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${sp.completed === sp.total ? 'bg-green-400' : 'bg-brand-blue'}`}
                            style={{ width: `${Math.round((sp.completed / sp.total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/40 font-bold shrink-0">
                          {sp.completed}/{sp.total}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/[0.06] px-5 py-3">
                    {isCurriculum ? (
                      <Link
                        href={`/dashboard/learning/session/${assignment.curriculum_item_id}`}
                        className="w-full text-center text-sm font-bold text-brand-blue hover:text-blue-400 transition-colors py-1 block"
                      >
                        학습 시작하기 →
                      </Link>
                    ) : set ? (
                      <span className="w-full text-center text-sm text-white/30 py-1 block">
                        보충자료
                      </span>
                    ) : (
                      <span className="w-full text-center text-sm text-white/30 py-1 block">
                        콘텐츠 준비 중
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 배정이 아예 없을 때 */}
      {assignments.length === 0 && !selectedDate && (
        <div className="brand-card p-12 text-center">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <h2 className="text-lg font-bold text-white/60">배정된 학습이 없습니다</h2>
          <p className="text-sm text-white/30 mt-2">선생님이 학습을 배정하면 달력에 표시됩니다</p>
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
