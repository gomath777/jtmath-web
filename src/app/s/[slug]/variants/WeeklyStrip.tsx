'use client';

import type { CurriculumSummary } from './types';
import type { WindowKey } from './VariantB';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKstDateParts(msFromEpoch: number): { y: number; m: number; d: number; dow: number } {
  const shifted = new Date(msFromEpoch + KST_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
    dow: shifted.getUTCDay(),
  };
}

function getCurrentKstWeek(): Date[] {
  const now = getKstDateParts(Date.now());
  const sundayMs = Date.UTC(now.y, now.m, now.d - now.dow);
  return Array.from({ length: 7 }, (_, i) => new Date(sundayMs + i * 86400000));
}

function ymdOfKstDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface WindowSession {
  id: string;
  week: number;
  session: number;
}

interface Props {
  curricula: CurriculumSummary[];
  selectedWindow: WindowKey;
  onSelectWindow: (w: WindowKey) => void;
}

/**
 * Variant B 전용 — 일~토 7칸 타임라인.
 *
 * 학생 멘탈 모델:
 *   - 일·수 밤에 배포만, 월·화 / 목·금이 공부하는 날, 토는 쉼
 *
 * 클릭: 일·월·화 → mon-tue 윈도우 / 수·목·금 → thu-fri / 토는 선택 변경 없음
 *
 * 학습 완료 시각화(완료 점)는 제거. 완료 추적은 매쓰플랫 앱에서.
 */
export default function WeeklyStrip({ curricula, selectedWindow, onSelectWindow }: Props) {
  const weekDays = getCurrentKstWeek();
  const kstTodayYmd = new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);

  const sessionsByDate = new Map<string, WindowSession[]>();
  for (const c of curricula) {
    for (const s of c.sessions) {
      if (!s.publishDate) continue;
      if (!sessionsByDate.has(s.publishDate)) sessionsByDate.set(s.publishDate, []);
      sessionsByDate.get(s.publishDate)!.push({
        id: s.id,
        week: s.week_number,
        session: s.session_number,
      });
    }
  }

  const window1Sessions = [0, 1, 2].flatMap(i => sessionsByDate.get(ymdOfKstDate(weekDays[i])) || []);
  const window2Sessions = [3, 4, 5].flatMap(i => sessionsByDate.get(ymdOfKstDate(weekDays[i])) || []);
  const window1 = window1Sessions[0] || null;
  const window2 = window2Sessions[0] || null;

  const cells = weekDays.map(d => {
    const ymd = ymdOfKstDate(d);
    const dow = d.getUTCDay();
    const inWindow1 = dow === 1 || dow === 2;
    const inWindow2 = dow === 4 || dow === 5;
    const isSelectedByWindow =
      (selectedWindow === 'mon-tue' && inWindow1) ||
      (selectedWindow === 'thu-fri' && inWindow2);
    const hasActiveSession =
      (inWindow1 && !!window1) || (inWindow2 && !!window2);

    const clickTarget: WindowKey | null =
      dow >= 0 && dow <= 2 ? 'mon-tue' : dow >= 3 && dow <= 5 ? 'thu-fri' : null;

    return {
      ymd,
      dayOfMonth: d.getUTCDate(),
      weekdayLabel: WEEKDAY[dow],
      isToday: ymd === kstTodayYmd,
      hasActiveSession,
      isSelectedByWindow,
      clickTarget,
    };
  });

  const first = weekDays[0];
  const last = weekDays[6];
  const range = `${first.getUTCMonth() + 1}/${first.getUTCDate()} ~ ${last.getUTCMonth() + 1}/${last.getUTCDate()}`;

  return (
    <section className="mb-7">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-terracotta shrink-0 translate-y-[-4px]" />
        <h2 className="font-serif font-medium text-[16px] text-ink tracking-tight">
          이번 주
        </h2>
        <span className="text-[11px] tracking-[0.1em] uppercase text-stone ml-auto">
          {range}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map(cell => {
          // 배경 우선순위:
          //   1. 오늘 + 선택된 윈도우: terracotta 진하게
          //   2. 오늘만: terracotta 테두리
          //   3. 선택 윈도우 + 세션 있음: sand + terracotta 테두리
          //   4. 선택 윈도우 + 세션 없음: sand/60
          //   5. 세션 있음 (비선택): sand/40
          //   6. 나머지(일·수·토): parchment
          let bgClass: string;
          if (cell.isToday && cell.isSelectedByWindow) {
            bgClass = 'bg-terracotta/20 border-2 border-terracotta/70';
          } else if (cell.isToday) {
            bgClass = 'bg-terracotta/10 border border-terracotta/40';
          } else if (cell.isSelectedByWindow && cell.hasActiveSession) {
            bgClass = 'bg-sand border-2 border-terracotta/50';
          } else if (cell.isSelectedByWindow) {
            bgClass = 'bg-sand/60 border border-terracotta/30';
          } else if (cell.hasActiveSession) {
            bgClass = 'bg-sand/40 border border-border-cream';
          } else {
            bgClass = 'bg-parchment border border-border-cream';
          }

          const dayNumberClass = cell.isToday
            ? 'text-terracotta'
            : cell.isSelectedByWindow || cell.hasActiveSession
              ? 'text-ink'
              : 'text-silver';

          const inner = (
            <div
              className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all min-h-[64px] ${bgClass}`}
            >
              <span
                className={`text-[10px] tracking-[0.08em] uppercase font-medium ${
                  cell.isToday ? 'text-terracotta' : 'text-stone'
                }`}
              >
                {cell.weekdayLabel}
              </span>
              <span
                className={`font-serif font-medium text-[15px] mt-0.5 ${dayNumberClass}`}
              >
                {cell.dayOfMonth}
              </span>
            </div>
          );

          if (cell.clickTarget) {
            return (
              <button
                key={cell.ymd}
                type="button"
                onClick={() => onSelectWindow(cell.clickTarget!)}
                className="block text-left w-full"
                aria-pressed={cell.isSelectedByWindow}
                aria-label={`${cell.weekdayLabel} ${cell.dayOfMonth}일 — ${cell.clickTarget === 'mon-tue' ? '1차시' : '2차시'} 선택`}
              >
                {inner}
              </button>
            );
          }
          return <div key={cell.ymd}>{inner}</div>;
        })}
      </div>

      {(window1 || window2) && (
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-2">
          <div />
          <div className="col-span-2 text-center">
            {window1 && (
              <span
                className={`inline-block text-[10px] tracking-[0.08em] uppercase font-medium ${
                  selectedWindow === 'mon-tue' ? 'text-terracotta' : 'text-stone'
                }`}
              >
                {window1.week}주 {window1.session}차시
              </span>
            )}
          </div>
          <div />
          <div className="col-span-2 text-center">
            {window2 && (
              <span
                className={`inline-block text-[10px] tracking-[0.08em] uppercase font-medium ${
                  selectedWindow === 'thu-fri' ? 'text-terracotta' : 'text-stone'
                }`}
              >
                {window2.week}주 {window2.session}차시
              </span>
            )}
          </div>
          <div />
        </div>
      )}

      <p className="mt-3 text-[11px] text-stone text-center break-keep">
        일·수 밤 배포 · 월·화 / 목·금 공부하는 날
      </p>
    </section>
  );
}
