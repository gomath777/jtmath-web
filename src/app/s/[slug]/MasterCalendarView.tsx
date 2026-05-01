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

interface MasterConceptItem {
  id: string;
  title: string;
  subject_slug: string;
  subject_label: string;
  publishDate: string | null;
}

interface MasterCalendarViewProps {
  masterSessions: MasterSessionEntry[];
  masterConceptItems?: MasterConceptItem[];
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

// 일월화수목금토 (Sun-first)
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function getKstWeeks(): Date[][] {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowMs = Date.now() + KST_OFFSET_MS;
  const dayOfWeek = new Date(nowMs).getUTCDay(); // 0=Sun...6=Sat
  // Start from Sunday of last week
  const lastSundayMs = nowMs - (dayOfWeek + 7) * 86400000;

  const weeks: Date[][] = [];
  for (let w = 0; w < 4; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(lastSundayMs + (w * 7 + d) * 86400000));
    }
    weeks.push(week);
  }
  return weeks;
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayKstYmd(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function MasterCalendarView({
  masterSessions,
  masterConceptItems = [],
  slug,
  basePath = '/s',
}: MasterCalendarViewProps) {
  const weeks = getKstWeeks();
  const todayYmd = todayKstYmd();

  const sessionsByDate = new Map<string, MasterSessionEntry[]>();
  for (const s of masterSessions) {
    if (!s.publishDate) continue;
    const ymd = s.publishDate.slice(0, 10);
    if (!sessionsByDate.has(ymd)) sessionsByDate.set(ymd, []);
    sessionsByDate.get(ymd)!.push(s);
  }

  const conceptsByDate = new Map<string, MasterConceptItem[]>();
  for (const c of masterConceptItems) {
    if (!c.publishDate) continue;
    const ymd = c.publishDate.slice(0, 10);
    if (!conceptsByDate.has(ymd)) conceptsByDate.set(ymd, []);
    conceptsByDate.get(ymd)!.push(c);
  }

  return (
    <div>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map((label, i) => (
          <div
            key={label}
            className={`text-center text-[11px] font-medium tracking-wide py-1 ${
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-stone'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 4주 그리드 */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              const ymd = toYmd(day);
              const isToday = ymd === todayYmd;
              const sessions = sessionsByDate.get(ymd) || [];
              const concepts = conceptsByDate.get(ymd) || [];
              const dayNum = day.getUTCDate();
              const isSun = di === 0;
              const isSat = di === 6;

              return (
                <div
                  key={di}
                  className={`min-h-[80px] rounded-xl border p-1.5 ${
                    isToday
                      ? 'border-terracotta/50 bg-terracotta/5'
                      : isSun || isSat
                      ? 'border-border-cream bg-sand/30'
                      : 'border-border-cream bg-ivory'
                  }`}
                >
                  <div className={`text-[11px] font-medium mb-1 ${
                    isToday ? 'text-terracotta' : isSun ? 'text-rose-400' : isSat ? 'text-blue-400' : 'text-charcoal'
                  }`}>
                    {dayNum}
                    {dayNum === 1 && (
                      <span className="ml-0.5 text-stone font-normal text-[10px]">
                        {day.getUTCMonth() + 1}월
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {/* 학습 세션 */}
                    {sessions.map(s => {
                      const color = SUBJECT_COLOR[s.subject_slug] || { bg: 'bg-sand', text: 'text-charcoal' };
                      return (
                        <Link
                          key={s.id}
                          href={`${basePath}/${slug}/session/${s.id}`}
                          className={`block rounded-lg px-1.5 py-1 text-[10px] leading-tight ${color.bg} ${color.text} hover:opacity-80 transition-opacity`}
                        >
                          <div className="flex items-center gap-0.5 mb-0.5">
                            <span className="text-[9px]">{s.is_released ? '✅' : '🔒'}</span>
                            <span className="font-medium truncate">{s.subject_label}</span>
                          </div>
                          <div className="font-mono text-[9px] opacity-60">W{s.week_number}-S{s.session_number}</div>
                          {s.label && <div className="truncate opacity-80 mt-0.5">{s.label}</div>}
                        </Link>
                      );
                    })}

                    {/* 개념강의 */}
                    {concepts.map(c => (
                      <Link
                        key={c.id}
                        href={`${basePath}/${slug}/concept/${c.id}`}
                        className="block rounded-lg px-1.5 py-1 text-[10px] leading-tight bg-green-50 text-green-700 hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-0.5 mb-0.5">
                          <span className="text-[9px]">📚</span>
                          <span className="font-medium truncate">{c.subject_label || '개념강의'}</span>
                        </div>
                        <div className="truncate opacity-80">{c.title}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-stone">
        <span>✅ 릴리즈됨</span>
        <span>🔒 미릴리즈</span>
        <span>📚 개념강의</span>
        <span className="ml-auto text-[10px] opacity-60">지난주 ~ 다음 2주</span>
      </div>
    </div>
  );
}
