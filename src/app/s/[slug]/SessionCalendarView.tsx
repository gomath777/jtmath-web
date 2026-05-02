'use client';

import Link from 'next/link';

interface CalendarSessionEntry {
  id: string;
  subject_slug: string;
  subject_label: string;
  week_number: number;
  session_number: number;
  label: string | null;
  publishDate: string | null;
  is_released: boolean;
}

interface CalendarConceptItem {
  id: string;
  title: string;
  subject_slug: string;
  subject_label: string;
  publishDate: string | null;
}

interface SessionCalendarViewProps {
  mode: 'master' | 'student';
  sessions: CalendarSessionEntry[];
  conceptItems?: CalendarConceptItem[];
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

const LOCKED_STYLE = { bg: 'bg-gray-50', text: 'text-gray-400' };

type AnyItem =
  | (CalendarSessionEntry & { kind: 'session' })
  | (CalendarConceptItem & { kind: 'concept' });

function addDay(ymd: string, days: number): string {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayKstYmd(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatPublishLabel(ymd: string): string {
  const [, m, d] = ymd.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)} 공개`;
}

// 4 study weeks: last week, this week, next week, week+2 (Mon-based)
function getStudyWeeks() {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowMs = Date.now() + KST_OFFSET_MS;
  const dayOfWeek = new Date(nowMs).getUTCDay();
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonMs = nowMs - daysFromMon * 86400000;

  return [-1, 0, 1, 2].map(w => {
    const monMs = thisMonMs + w * 7 * 86400000;
    const monYmd = new Date(monMs).toISOString().slice(0, 10);
    const label = w === -1 ? '지난주' : w === 0 ? '이번주' : w === 1 ? '다음주' : '2주후';
    return { label, monYmd };
  });
}

interface WindowBlockProps {
  items: AnyItem[];
  mode: 'master' | 'student';
  slug: string;
  basePath: string;
  todayYmd: string;
  windowYmds: string[];
}

function WindowBlock({ items, mode, slug, basePath, todayYmd, windowYmds }: WindowBlockProps) {
  const isCurrentWindow = windowYmds.includes(todayYmd);

  return (
    <div className={`min-h-[56px] rounded-xl border p-1.5 ${
      isCurrentWindow
        ? 'border-terracotta/50 bg-terracotta/5'
        : 'border-border-cream bg-ivory'
    }`}>
      {items.length === 0 ? (
        <div className="h-full flex items-center justify-center text-[10px] text-stone/25">—</div>
      ) : (
        <div className="space-y-0.5">
          {items.map(item => {
            if (item.kind === 'session') {
              const s = item;
              const color = (mode === 'student' && !s.is_released)
                ? LOCKED_STYLE
                : (SUBJECT_COLOR[s.subject_slug] || { bg: 'bg-sand', text: 'text-charcoal' });
              const studentLocked = mode === 'student' && !s.is_released;
              const isFuture = !!s.publishDate && s.publishDate > todayYmd;

              const inner = (
                <>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px]">{s.is_released ? '✅' : '🔒'}</span>
                    <span className="font-medium truncate text-[9px] sm:text-[10px]">{s.subject_label}</span>
                  </div>
                  <div className="font-mono text-[8px] opacity-60">W{s.week_number}-S{s.session_number}</div>
                  {s.label && <div className="truncate opacity-80 text-[9px]">{s.label}</div>}
                  {studentLocked && isFuture && s.publishDate && (
                    <div className="text-[8px] mt-0.5 opacity-70">{formatPublishLabel(s.publishDate.slice(0, 10))}</div>
                  )}
                </>
              );

              const base = `block rounded-lg px-1 py-0.5 leading-tight ${color.bg} ${color.text}`;
              if (studentLocked) {
                return <div key={s.id} className={`${base} cursor-not-allowed`}>{inner}</div>;
              }
              return (
                <Link key={s.id} href={`${basePath}/${slug}/session/${s.id}`} className={`${base} hover:opacity-80 transition-opacity`}>
                  {inner}
                </Link>
              );
            } else {
              const c = item;
              const studentLocked = mode === 'student' && !!c.publishDate && c.publishDate.slice(0, 10) > todayYmd;
              const colorClass = studentLocked
                ? `${LOCKED_STYLE.bg} ${LOCKED_STYLE.text}`
                : 'bg-green-50 text-green-700';

              const inner = (
                <>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px]">{studentLocked ? '🔒' : '📚'}</span>
                    <span className="font-medium truncate text-[9px] sm:text-[10px]">{c.subject_label || '개념강의'}</span>
                  </div>
                  <div className="truncate opacity-80 text-[9px]">{c.title}</div>
                  {studentLocked && c.publishDate && (
                    <div className="text-[8px] mt-0.5 opacity-70">{formatPublishLabel(c.publishDate.slice(0, 10))}</div>
                  )}
                </>
              );

              const base = `block rounded-lg px-1 py-0.5 leading-tight ${colorClass}`;
              if (studentLocked) {
                return <div key={c.id} className={`${base} cursor-not-allowed`}>{inner}</div>;
              }
              return (
                <Link key={c.id} href={`${basePath}/${slug}/concept/${c.id}`} className={`${base} hover:opacity-80 transition-opacity`}>
                  {inner}
                </Link>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

export default function SessionCalendarView({
  mode,
  sessions,
  conceptItems = [],
  slug,
  basePath = '/s',
}: SessionCalendarViewProps) {
  const studyWeeks = getStudyWeeks();
  const todayYmd = todayKstYmd();

  const sessionsByDate = new Map<string, CalendarSessionEntry[]>();
  for (const s of sessions) {
    if (!s.publishDate) continue;
    const ymd = s.publishDate.slice(0, 10);
    if (!sessionsByDate.has(ymd)) sessionsByDate.set(ymd, []);
    sessionsByDate.get(ymd)!.push(s);
  }

  const conceptsByDate = new Map<string, CalendarConceptItem[]>();
  for (const c of conceptItems) {
    if (!c.publishDate) continue;
    const ymd = c.publishDate.slice(0, 10);
    if (!conceptsByDate.has(ymd)) conceptsByDate.set(ymd, []);
    conceptsByDate.get(ymd)!.push(c);
  }

  function getWindowItems(ymds: string[]): AnyItem[] {
    const items: AnyItem[] = [];
    for (const ymd of ymds) {
      for (const s of sessionsByDate.get(ymd) || []) items.push({ ...s, kind: 'session' });
      for (const c of conceptsByDate.get(ymd) || []) items.push({ ...c, kind: 'concept' });
    }
    return items;
  }

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="grid grid-cols-[3rem_1fr_1fr] gap-2">
        <div />
        <div className="text-center text-[11px] font-semibold text-stone tracking-wide">월 · 화</div>
        <div className="text-center text-[11px] font-semibold text-stone tracking-wide">목 · 금</div>
      </div>

      {studyWeeks.map(({ label, monYmd }) => {
        const tueYmd = addDay(monYmd, 1);
        const thuYmd = addDay(monYmd, 3);
        const friYmd = addDay(monYmd, 4);

        return (
          <div key={monYmd} className="grid grid-cols-[3rem_1fr_1fr] gap-2 items-stretch">
            <div className="text-[10px] text-stone/50 flex items-center justify-end pr-1">
              {label}
            </div>
            <WindowBlock
              items={getWindowItems([monYmd, tueYmd])}
              mode={mode}
              slug={slug}
              basePath={basePath}
              todayYmd={todayYmd}
              windowYmds={[monYmd, tueYmd]}
            />
            <WindowBlock
              items={getWindowItems([thuYmd, friYmd])}
              mode={mode}
              slug={slug}
              basePath={basePath}
              todayYmd={todayYmd}
              windowYmds={[thuYmd, friYmd]}
            />
          </div>
        );
      })}

      <div className="mt-2 flex items-center gap-3 text-[11px] text-stone">
        <span>✅ 공개됨</span>
        <span>🔒 {mode === 'master' ? '미릴리즈' : '예정'}</span>
        <span>📚 개념강의</span>
      </div>
    </div>
  );
}
