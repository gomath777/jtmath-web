'use client';

import { CheckCircle2, Circle, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatYmdKo } from '@/lib/concept-assign/date-resolver';

export interface SeasonItem {
  setId: string;
  setLabel: string;        // 예: "공수1 8차시"
  subjectSlug?: string;
  chapterOrder?: number | null;
  status: 'unchanged' | 'added' | 'removed' | 'moved';
  previousPublishYmd?: string;
  hasProgress?: boolean;
  // 시청 진도 (학생 일정 조회 모드)
  videos?: Array<{
    id: string;
    title: string;
    duration_seconds: number | null;
    watch_percent: number;
    completed: boolean;
  }>;
}

export interface SeasonWeek {
  publishYmd: string;
  items: SeasonItem[];
}

const STATUS_STYLE: Record<SeasonItem['status'], { dot: string; row: string; label: string; icon: string }> = {
  unchanged: { dot: 'bg-stone-300', row: 'text-stone-700', label: '', icon: 'text-stone-400' },
  added:     { dot: 'bg-emerald-500', row: 'text-emerald-800 font-semibold', label: '추가', icon: 'text-emerald-500' },
  removed:   { dot: 'bg-rose-500', row: 'text-rose-700 line-through', label: '삭제', icon: 'text-rose-500' },
  moved:     { dot: 'bg-amber-500', row: 'text-amber-800 font-semibold', label: '이동', icon: 'text-amber-500' },
};

export default function AdminStudentSeasonView({
  studentName,
  weeks,
  todayYmd,
  emptyMsg,
}: {
  studentName?: string;
  weeks: SeasonWeek[];
  todayYmd?: string;
  emptyMsg?: string;
}) {
  if (!weeks.length) {
    return (
      <div className="text-center py-10 text-sm text-slate-400">
        {emptyMsg || '시즌 일정이 없습니다.'}
      </div>
    );
  }

  return (
    <div className="relative">
      {studentName && (
        <h3 className="text-sm font-bold text-slate-700 mb-3">📅 {studentName} 시즌 일정</h3>
      )}
      <div className="relative pl-6 border-l-2 border-stone-200 space-y-5">
        {weeks.map((w, idx) => {
          const isCurrent = todayYmd && weekContainsToday(w.publishYmd, todayYmd);
          return (
            <div key={`${w.publishYmd}-${idx}`} className="relative">
              <div
                className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 ${
                  isCurrent ? 'bg-red-500 border-red-200' : 'bg-white border-stone-300'
                }`}
              />
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xs font-bold text-slate-500">{idx + 1}주차</span>
                <span className="text-xs text-slate-400">
                  {formatYmdKo(w.publishYmd)}
                  {' ~ '}
                  {formatYmdKo(addDaysYmd(w.publishYmd, 6))}
                </span>
                {isCurrent && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded">
                    이번 주
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {w.items.map((it, i) => {
                  const st = STATUS_STYLE[it.status];
                  const completed = it.videos && it.videos.length > 0 && it.videos.every(v => v.completed);
                  return (
                    <li key={`${it.setId}-${i}`} className="flex items-center gap-2 text-sm">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                      {it.videos && it.videos.length > 0 ? (
                        completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                        )
                      ) : null}
                      <span className={`${st.row} truncate`}>{it.setLabel}</span>
                      {st.label && (
                        <span className={`text-[10px] font-bold ${st.icon} shrink-0`}>{st.label}</span>
                      )}
                      {it.status === 'moved' && it.previousPublishYmd && (
                        <span className="text-[10px] text-slate-400 inline-flex items-center gap-0.5 shrink-0">
                          <ArrowRight className="w-3 h-3" />
                          이전: {formatYmdKo(it.previousPublishYmd)}
                        </span>
                      )}
                      {it.hasProgress && it.status !== 'unchanged' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      {it.videos && it.videos.length > 0 && (
                        <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                          {it.videos.filter(v => v.completed).length}/{it.videos.length}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

function weekContainsToday(weekStartYmd: string, todayYmd: string): boolean {
  const startMs = Date.parse(weekStartYmd);
  const todayMs = Date.parse(todayYmd);
  const diff = (todayMs - startMs) / 86400000;
  return diff >= 0 && diff <= 6;
}
