'use client';

import { useState } from 'react';
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
  /** Optional: if set, card link uses `/lesson/{slug}` instead of `${basePath}/${slug}/session/${id}`. */
  lessonSlug?: string | null;
}

interface CalendarConceptItem {
  id: string;
  title: string;
  subject_slug: string;
  subject_label: string;
  publishDate: string | null;
}

interface CalendarPhase {
  label: string;
  startYmd: string;
  endYmd: string | null; // null = 오픈엔드 (기말 시험일 미정)
}

interface SessionCalendarViewProps {
  mode: 'master' | 'student';
  sessions: CalendarSessionEntry[];
  conceptItems?: CalendarConceptItem[];
  /** 기말 마무리 단계 배너 (시작일~종료일 연속 표시). null/미지정이면 표시 안 함. */
  phase?: CalendarPhase | null;
  slug: string;
  basePath?: string;
  previewBase?: string; // admin only: /api/admin/preview?slug=...&to=...
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
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type AnyItem =
  | (CalendarSessionEntry & { kind: 'session' })
  | (CalendarConceptItem & { kind: 'concept' });

// 마스터 뷰: 전전전주 일요일부터 6주 (과거 3주 · 이번주 · 다음 2주) — 위로 지나간 주, 아래로 이번주+2주
// 학생 뷰: 지난주 일요일부터 4주 (지난주 ~ 다음 2주)
function getKstWeeks(mode: 'master' | 'student' = 'student'): Date[][] {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowMs = Date.now() + KST_OFFSET_MS;
  const dayOfWeek = new Date(nowMs).getUTCDay();
  const weeksBack = mode === 'master' ? 21 : 7;
  const totalWeeks = mode === 'master' ? 6 : 4;
  const startSundayMs = nowMs - (dayOfWeek + weeksBack) * 86400000;

  const weeks: Date[][] = [];
  for (let w = 0; w < totalWeeks; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(startSundayMs + (w * 7 + d) * 86400000));
    }
    weeks.push(week);
  }
  return weeks;
}

// 배정된 항목 전체 기간(min~max)을 일요일 정렬 주 단위로 반환 (관리자 '전체 펼치기'용)
function getWeeksForRange(startYmd: string, endYmd: string): Date[][] {
  const dayMs = 86400000;
  const startMs = new Date(startYmd + 'T00:00:00Z').getTime();
  const endMs = new Date(endYmd + 'T00:00:00Z').getTime();
  const startDow = new Date(startMs).getUTCDay();
  const firstSundayMs = startMs - startDow * dayMs;
  const weeks: Date[][] = [];
  for (let w = 0; firstSundayMs + w * 7 * dayMs <= endMs; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) week.push(new Date(firstSundayMs + (w * 7 + d) * dayMs));
    weeks.push(week);
  }
  return weeks;
}

// "5/25~7/9" 형태의 짧은 기간 라벨
function weeksRangeLabel(startYmd: string, endYmd: string): string {
  const fmt = (ymd: string) => {
    const [, m, d] = ymd.split('-');
    return `${Number(m)}/${Number(d)}`;
  };
  return `${fmt(startYmd)}~${fmt(endYmd)}`;
}

function mdLabel(ymd: string): string {
  const [, m, d] = ymd.split('-');
  return `${Number(m)}/${Number(d)}`;
}

// 기말 마무리 단계 배너 (한 주 행 위에 풀폭으로 표시). 여러 주에 걸치면 주마다 띠가 쌓여
// "쭉 이어진다"는 인상을 준다. 첫 주엔 라벨 전체, 이후 주엔 연속 띠.
function PhaseBanner({
  label,
  isFirst,
  isLast,
  endYmd,
}: {
  label: string;
  isFirst: boolean;
  isLast: boolean;
  endYmd: string | null;
}) {
  const endText = endYmd ? `${mdLabel(endYmd)} 기말까지` : '기말까지';
  return (
    <div className="rounded-lg bg-amber-100 text-amber-800 px-2 py-1 text-[10px] sm:text-[11px] font-medium flex items-center gap-1 leading-tight">
      <span className="text-[10px]">📝</span>
      {isFirst ? (
        <span className="truncate">{label} — {endText}</span>
      ) : (
        <span className="opacity-70 truncate">
          기말 마무리 단계 진행 중{isLast ? ` · ${endText}` : ' …'}
        </span>
      )}
    </div>
  );
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayKstYmd(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatPublishLabel(ymd: string): string {
  const date = new Date(ymd + 'T00:00:00Z');
  const dow = date.getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
  let deployDate = date;
  if (dow === 1) deployDate = new Date(date.getTime() - 86400000);      // Mon → Sun
  else if (dow === 2) deployDate = new Date(date.getTime() - 2 * 86400000); // Tue → Sun
  else if (dow === 4) deployDate = new Date(date.getTime() - 86400000);  // Thu → Wed
  else if (dow === 5) deployDate = new Date(date.getTime() - 2 * 86400000); // Fri → Wed
  const m = deployDate.getUTCMonth() + 1;
  const d = deployDate.getUTCDate();
  return `${m}/${d} 밤 배포예정`;
}

function ItemCard({
  item,
  mode,
  slug,
  basePath,
  todayYmd,
  previewBase,
}: {
  item: AnyItem;
  mode: 'master' | 'student';
  slug: string;
  basePath: string;
  todayYmd: string;
  previewBase?: string;
}) {
  if (item.kind === 'session') {
    const s = item;
    const subjectColor = SUBJECT_COLOR[s.subject_slug] || { bg: 'bg-sand', text: 'text-charcoal' };
    const studentLocked = mode === 'student' && !s.is_released;
    const color = studentLocked ? LOCKED_STYLE : subjectColor;
    const isFuture = !!s.publishDate && s.publishDate > todayYmd;

    const inner = (
      <>
        <div className="flex items-center gap-0.5 mb-0.5">
          <span className="text-[9px]">{s.is_released ? '✅' : '🔒'}</span>
          <span className="font-medium truncate text-[9px] sm:text-[10px]">{s.subject_label}</span>
        </div>
        {s.label && <div className="truncate opacity-80 mt-0.5 text-[9px] sm:text-[10px]">{s.label}</div>}
        {studentLocked && isFuture && s.publishDate && (
          <div className="text-[8px] sm:text-[9px] mt-0.5 opacity-70">{formatPublishLabel(s.publishDate.slice(0, 10))}</div>
        )}
      </>
    );

    const base = `block rounded-lg px-1 sm:px-1.5 py-0.5 sm:py-1 leading-tight ${color.bg} ${color.text}`;
    if (studentLocked) {
      return <div className={`${base} cursor-not-allowed`} aria-disabled>{inner}</div>;
    }
    const sessionTarget = s.lessonSlug
      ? `/lesson/${s.lessonSlug}`
      : `${basePath}/${slug}/session/${s.id}`;
    const sessionHref = previewBase
      ? `${previewBase}?slug=${slug}&to=${encodeURIComponent(sessionTarget)}`
      : sessionTarget;
    return (
      <Link href={sessionHref} className={`${base} hover:opacity-80 transition-opacity`}>
        {inner}
      </Link>
    );
  }

  const c = item;
  const d = new Date(todayYmd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const tomorrowYmd = d.toISOString().slice(0, 10);
  const studentLocked = mode === 'student' && !!c.publishDate && c.publishDate.slice(0, 10) > tomorrowYmd;
  // 총정리/모의 중간·기말고사 차시는 별도 색(앰버) + 📝 아이콘으로 일반 개념강의와 구분
  const isReview = /총정리|모의/.test(c.title || '');
  const colorClass = studentLocked
    ? `${LOCKED_STYLE.bg} ${LOCKED_STYLE.text}`
    : isReview
    ? 'bg-amber-100 text-amber-800'
    : 'bg-green-50 text-green-700';

  const inner = (
    <>
      <div className="flex items-center gap-0.5 mb-0.5">
        <span className="text-[9px]">{studentLocked ? '🔒' : isReview ? '📝' : '📚'}</span>
        <span className="font-medium truncate text-[9px] sm:text-[10px]">{c.subject_label || '개념강의'}</span>
      </div>
      <div className="truncate opacity-80 text-[9px] sm:text-[10px]">{c.title}</div>
      {studentLocked && c.publishDate && (
        <div className="text-[8px] sm:text-[9px] mt-0.5 opacity-70">{formatPublishLabel(c.publishDate.slice(0, 10))}</div>
      )}
    </>
  );

  const base = `block rounded-lg px-1 sm:px-1.5 py-0.5 sm:py-1 leading-tight ${colorClass}`;
  if (studentLocked) {
    return <div className={`${base} cursor-not-allowed`} aria-disabled>{inner}</div>;
  }
  const conceptTarget = `${basePath}/${slug}/concept/${c.id}`;
  const conceptHref = previewBase
    ? `${previewBase}?slug=${slug}&to=${encodeURIComponent(conceptTarget)}`
    : conceptTarget;
  return (
    <Link href={conceptHref} className={`${base} hover:opacity-80 transition-opacity`}>
      {inner}
    </Link>
  );
}

interface CommonProps {
  mode: 'master' | 'student';
  slug: string;
  basePath: string;
  todayYmd: string;
  previewBase?: string;
}

function dayHeader(day: Date) {
  const dayNum = day.getUTCDate();
  return { dayNum, isFirstOfMonth: dayNum === 1, month: day.getUTCMonth() + 1 };
}

// 단독 셀: 자체 콘텐츠 + 자체 테두리. 일/수/토 + 단독 모드에서 월·화·목·금
function DayCell({
  day,
  ymd,
  items,
  isSun,
  isSat,
  hideContent,
  ...common
}: CommonProps & {
  day: Date;
  ymd: string;
  items: AnyItem[];
  isSun?: boolean;
  isSat?: boolean;
  hideContent?: boolean; // 월·화·목·금처럼 콘텐츠를 오버레이로 그릴 때 true
}) {
  const isToday = ymd === common.todayYmd;
  const { dayNum, isFirstOfMonth, month } = dayHeader(day);

  return (
    <div className={`h-full rounded-xl border p-1 sm:p-1.5 ${
      isToday
        ? 'border-terracotta/50 bg-terracotta/5'
        : (isSun || isSat)
        ? 'border-border-cream bg-sand/30'
        : 'border-border-cream bg-ivory'
    }`}>
      <div className={`text-[11px] font-medium mb-1 ${
        isToday ? 'text-terracotta' : isSun ? 'text-rose-400' : isSat ? 'text-blue-400' : 'text-charcoal'
      }`}>
        {dayNum}
        {isFirstOfMonth && (
          <span className="ml-0.5 text-stone font-normal text-[10px]">{month}월</span>
        )}
      </div>
      {!hideContent && (
        <div className="space-y-0.5">
          {items.map((item, idx) => (
            <ItemCard key={idx} item={item} {...common} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SessionCalendarView({
  mode,
  sessions,
  conceptItems = [],
  phase = null,
  slug,
  basePath = '/s',
  previewBase,
}: SessionCalendarViewProps) {
  const [expandedAll, setExpandedAll] = useState(false);
  const todayYmd = todayKstYmd();

  // 배정된 모든 항목의 날짜 (전체 펼치기 범위 계산용)
  const allYmds: string[] = [];
  for (const s of sessions) if (s.publishDate) allYmds.push(s.publishDate.slice(0, 10));
  for (const c of conceptItems) if (c.publishDate) allYmds.push(c.publishDate.slice(0, 10));
  allYmds.sort();
  const canExpand = mode === 'master' && allYmds.length > 0;
  const showAll = canExpand && expandedAll;

  const weeks = showAll
    ? getWeeksForRange(allYmds[0], allYmds[allYmds.length - 1])
    : getKstWeeks(mode);

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

  function getItems(ymds: string[]): AnyItem[] {
    const items: AnyItem[] = [];
    for (const ymd of ymds) {
      for (const s of sessionsByDate.get(ymd) || []) items.push({ ...s, kind: 'session' });
      for (const c of conceptsByDate.get(ymd) || []) items.push({ ...c, kind: 'concept' });
    }
    return items;
  }

  const common = { mode, slug, basePath, todayYmd, previewBase };

  return (
    <div>
      {canExpand && (
        <div className="mb-2 flex items-center justify-end">
          <button
            onClick={() => setExpandedAll(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-sand text-charcoal hover:bg-terracotta hover:text-ivory transition-colors"
            aria-expanded={showAll}
          >
            {showAll
              ? '기본 보기로 접기'
              : `전체 일정 펼치기 (${weeksRangeLabel(allYmds[0], allYmds[allYmds.length - 1])})`}
          </button>
        </div>
      )}

      {/* 헤더: 일·월·화·수·목·금·토 7개 개별 라벨 */}
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

      <div className="space-y-1">
        {weeks.map((week, wi) => {
          const [sun, mon, tue, wed, thu, fri, sat] = week;
          const sunYmd = toYmd(sun);
          const monYmd = toYmd(mon);
          const tueYmd = toYmd(tue);
          const wedYmd = toYmd(wed);
          const thuYmd = toYmd(thu);
          const friYmd = toYmd(fri);
          const satYmd = toYmd(sat);

          const sunItems    = getItems([sunYmd]);
          const monTueItems = getItems([monYmd, tueYmd]);
          const wedItems    = getItems([wedYmd]);
          const thuFriItems = getItems([thuYmd, friYmd]);
          const satItems    = getItems([satYmd]);

          // 행 높이: 콘텐츠가 가장 많은 칸에 맞춰 통일 (오버레이 항목이 셀 밖으로 튀어나오는 것 방지)
          // ITEM_H는 잠금 상태(M/D 공개 라벨 4줄) + 데스크톱 텍스트 렌더링 기준
          const ITEM_H = 54;
          const HEAD_H = 32;
          const PAD = 10;
          const maxCount = Math.max(
            sunItems.length, monTueItems.length, wedItems.length, thuFriItems.length, satItems.length,
          );
          const rowHeight = Math.max(80, HEAD_H + maxCount * ITEM_H + PAD);

          // 마무리 단계 배너: 이 주 구간 [sunYmd, satYmd]가 phase 구간과 겹치는지
          const phaseSeg = phase && phase.startYmd <= satYmd && (phase.endYmd == null || phase.endYmd >= sunYmd)
            ? {
                isFirst: phase.startYmd >= sunYmd && phase.startYmd <= satYmd,
                isLast: phase.endYmd != null && phase.endYmd >= sunYmd && phase.endYmd <= satYmd,
              }
            : null;

          const weekGrid = (
            <div key={wi} className="grid grid-cols-7 gap-1 relative" style={{ height: rowHeight }}>
              {/* 배경: 7개 개별 셀 (월·화·목·금은 날짜만) */}
              <DayCell day={sun} ymd={sunYmd} items={sunItems} isSun {...common} />
              <DayCell day={mon} ymd={monYmd} items={[]} hideContent {...common} />
              <DayCell day={tue} ymd={tueYmd} items={[]} hideContent {...common} />
              <DayCell day={wed} ymd={wedYmd} items={wedItems} {...common} />
              <DayCell day={thu} ymd={thuYmd} items={[]} hideContent {...common} />
              <DayCell day={fri} ymd={friYmd} items={[]} hideContent {...common} />
              <DayCell day={sat} ymd={satYmd} items={satItems} isSat {...common} />

              {/* 오버레이: 월·화 / 목·금 콘텐츠가 두 칸을 가로지르게 */}
              <div className="absolute inset-0 grid grid-cols-7 gap-1 pointer-events-none z-10">
                <div />
                <div className="col-span-2 px-1.5 sm:px-2 pt-6 sm:pt-7 pb-1 space-y-0.5 overflow-hidden">
                  {monTueItems.map((item, idx) => (
                    <div key={idx} className="pointer-events-auto">
                      <ItemCard item={item} {...common} />
                    </div>
                  ))}
                </div>
                <div />
                <div className="col-span-2 px-1.5 sm:px-2 pt-6 sm:pt-7 pb-1 space-y-0.5 overflow-hidden">
                  {thuFriItems.map((item, idx) => (
                    <div key={idx} className="pointer-events-auto">
                      <ItemCard item={item} {...common} />
                    </div>
                  ))}
                </div>
                <div />
              </div>

              {/* 기말 마무리 단계 배너: 새 행이 아니라 월~금(2~6열) 셀 위에 겹쳐서 표시 */}
              {phaseSeg && (
                <div className="absolute inset-0 grid grid-cols-7 gap-1 pointer-events-none z-20">
                  <div />
                  <div className="col-span-5 pt-6 sm:pt-7">
                    <PhaseBanner
                      label={phase!.label}
                      isFirst={phaseSeg.isFirst}
                      isLast={phaseSeg.isLast}
                      endYmd={phase!.endYmd}
                    />
                  </div>
                  <div />
                </div>
              )}
            </div>
          );

          return weekGrid;
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-stone">
        <span>✅ 공개됨</span>
        <span>🔒 {mode === 'master' ? '미릴리즈' : '예정'}</span>
        <span>📚 개념강의</span>
        <span>📝 총정리·모의고사</span>
        {phase && <span className="text-amber-700">📝 기말 마무리 단계</span>}
        <span className="ml-auto text-[10px] opacity-60">
          {showAll
            ? `전체 일정 (${weeksRangeLabel(allYmds[0], allYmds[allYmds.length - 1])}, ${weeks.length}주)`
            : mode === 'master' ? '전전전주 ~ 다음 2주 (6주)' : '지난주 ~ 다음 2주'}
        </span>
      </div>
    </div>
  );
}
