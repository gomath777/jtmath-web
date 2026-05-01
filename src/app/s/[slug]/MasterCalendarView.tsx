'use client';

import Link from 'next/link';

interface MasterSessionEntry {
  id: string;
  subject_slug: string;
  subject_label: string;
  week_number: number;
  session_number: number;
  label: string | null;
  publishDate: string | null;
  is_released: boolean;
}

interface MasterCalendarViewProps {
  profile: { name: string; school: string };
  masterSessions: MasterSessionEntry[];
  slug: string;
  basePath?: string;
}

const SUBJECT_COLOR: Record<string, { bg: string; text: string }> = {
  gs1: { bg: 'bg-blue-50', text: 'text-blue-700' },
  gs2: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  ds2: { bg: 'bg-violet-50', text: 'text-violet-700' },
  ds:  { bg: 'bg-violet-50', text: 'text-violet-700' },
  ms1: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  mj1: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  mj2: { bg: 'bg-teal-50', text: 'text-teal-700' },
  ht:  { bg: 'bg-amber-50', text: 'text-amber-700' },
  gi:  { bg: 'bg-rose-50', text: 'text-rose-700' },
  s2:  { bg: 'bg-orange-50', text: 'text-orange-700' },
};

function getKstDateRange(): { weeks: Date[][] } {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowKst = new Date(Date.now() + KST_OFFSET_MS);
  const dayOfWeek = nowKst.getUTCDay(); // 0=Sun ... 6=Sat
  // Days since Monday (Sun → 6 days since previous Monday)
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  // Monday of last week
  const lastMondayMs = Date.now() + KST_OFFSET_MS - (daysSinceMonday + 7) * 86400000;

  const weeks: Date[][] = [];
  for (let w = 0; w < 4; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const ms = lastMondayMs + (w * 7 + d) * 86400000;
      week.push(new Date(ms));
    }
    weeks.push(week);
  }
  return { weeks };
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayKstYmd(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const DOW_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export default function MasterCalendarView({
  profile,
  masterSessions,
  slug,
  basePath = '/s',
}: MasterCalendarViewProps) {
  const { weeks } = getKstDateRange();
  const todayYmd = todayKstYmd();

  // Index sessions by publishDate
  const byDate = new Map<string, MasterSessionEntry[]>();
  for (const s of masterSessions) {
    if (!s.publishDate) continue;
    const ymd = s.publishDate.slice(0, 10);
    if (!byDate.has(ymd)) byDate.set(ymd, []);
    byDate.get(ymd)!.push(s);
  }

  return (
    <div>
      {/* 관리자 배지 */}
      <div className="mb-6 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-[13px] text-amber-800">
        <span>🔧</span>
        <span>
          관리자 미리보기 —{' '}
          <strong>{profile.name}</strong>
          {profile.school && <span className="opacity-70"> ({profile.school})</span>}
        </span>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map(label => (
          <div
            key={label}
            className="text-center text-[11px] font-medium text-stone tracking-wide py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* 4주 캘린더 */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              const ymd = toYmd(day);
              const isToday = ymd === todayYmd;
              const sessions = byDate.get(ymd) || [];
              const dayNum = day.getUTCDate();
              const isWeekend = di >= 5; // 토(5), 일(6)

              return (
                <div
                  key={di}
                  className={`min-h-[80px] rounded-xl border p-1.5 ${
                    isToday
                      ? 'border-terracotta/50 bg-terracotta/5'
                      : isWeekend
                      ? 'border-border-cream bg-sand/30'
                      : 'border-border-cream bg-ivory'
                  }`}
                >
                  {/* 날짜 */}
                  <div className={`text-[11px] font-medium mb-1 ${
                    isToday ? 'text-terracotta' : isWeekend ? 'text-stone' : 'text-charcoal'
                  }`}>
                    {dayNum}
                    {day.getUTCDate() === 1 && (
                      <span className="ml-0.5 text-stone font-normal">
                        {day.getUTCMonth() + 1}월
                      </span>
                    )}
                  </div>

                  {/* 세션 카드들 */}
                  <div className="space-y-0.5">
                    {sessions.map(s => {
                      const color = SUBJECT_COLOR[s.subject_slug] || { bg: 'bg-sand', text: 'text-charcoal' };
                      return (
                        <Link
                          key={s.id}
                          href={`${basePath}/${slug}/session/${s.id}`}
                          className={`block rounded-lg px-1.5 py-1 text-[10px] leading-tight ${color.bg} ${color.text} hover:opacity-80 transition-opacity`}
                        >
                          <div className="flex items-center gap-0.5 mb-0.5">
                            <span className={`text-[9px] ${s.is_released ? 'opacity-60' : 'opacity-90'}`}>
                              {s.is_released ? '✅' : '🔒'}
                            </span>
                            <span className="font-medium truncate">
                              {s.subject_label}
                            </span>
                          </div>
                          <div className="font-mono text-[9px] opacity-60">
                            W{s.week_number}-S{s.session_number}
                          </div>
                          {s.label && (
                            <div className="truncate opacity-80 mt-0.5">
                              {s.label}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="mt-4 flex items-center gap-4 text-[11px] text-stone">
        <span>✅ 릴리즈됨</span>
        <span>🔒 미릴리즈</span>
        <span className="ml-auto text-[10px] opacity-60">
          지난주 ~ 다음 2주
        </span>
      </div>
    </div>
  );
}
