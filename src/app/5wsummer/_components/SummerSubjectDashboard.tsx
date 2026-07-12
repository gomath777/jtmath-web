'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, Download, Lock, Play, RotateCcw } from 'lucide-react';

type CalendarRole = 'learning' | 'supplement' | 'review' | 'mock' | 'rest';

type ReleaseState =
  | { readonly kind: 'open' }
  | { readonly kind: 'locked'; readonly opensAt: string };

type DayResource = {
  readonly kind: 'pdf' | 'video';
  readonly label: string;
  readonly href: string;
};

type DayContent =
  | {
      readonly kind: 'learning';
      readonly title: string;
      readonly resources: readonly DayResource[];
      readonly conceptBookTask: string;
      readonly typeBookTask: string;
      readonly pending: boolean;
    }
  | {
      readonly kind: 'label';
      readonly title: string;
      readonly body: string;
    };

export type SummerDashboardDay = {
  readonly date: string;
  readonly weekday: string;
  readonly week: number;
  readonly dayOfWeek: number;
  readonly role: CalendarRole;
  readonly title: string;
  readonly previewTitle: string;
  readonly learningNumber: number | null;
  readonly release: ReleaseState;
  readonly content: DayContent;
};

type SummerSubjectDashboardProps = {
  readonly subjectLabel: string;
  readonly shortLabel: string;
  readonly days: readonly SummerDashboardDay[];
  readonly master: boolean;
  readonly showSubjectChooser: boolean;
};

const roleClass: Record<CalendarRole, string> = {
  learning: 'border-border-cream bg-ivory hover:border-terracotta/40',
  supplement: 'border-border-cream bg-stone/10',
  review: 'border-yellow-500/30 bg-yellow-100/70',
  mock: 'border-red-500/45 bg-red-100/80',
  rest: 'border-border-cream bg-transparent',
};

const badgeClass: Record<Extract<CalendarRole, 'supplement' | 'review' | 'mock'>, string> = {
  supplement: 'bg-yellow-400/70 text-ink',
  review: 'bg-yellow-400/70 text-ink',
  mock: 'bg-red-500 text-white',
};

function formatMd(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function formatOpenAt(value: string) {
  if (!value.includes('T')) return `${formatMd(value)} 공개`;
  const [date, timePart] = value.split('T');
  const time = timePart.slice(0, 5);
  return `${formatMd(date)} ${time} 공개`;
}

function isOpen(day: SummerDashboardDay) {
  return day.release.kind === 'open';
}

function initialDate(days: readonly SummerDashboardDay[]) {
  const firstOpenLearning = days.find((day) => day.role === 'learning' && isOpen(day));
  return firstOpenLearning?.date ?? days.find((day) => day.dayOfWeek !== 0)?.date ?? days[0]?.date ?? '';
}

const compactLearningTitle: Record<string, string> = {
  '다항식의 연산': '다항식 연산',
  나머지정리: '나머지정리',
  인수분해: '인수분해',
  '좌표평면의 거리와 선분의 내분점': '좌표·내분점',
  '직선의 방정식과 점과 직선 사이의 거리': '직선·거리',
  '원의 방정식과 그래프': '원의 방정식',
  '원과 직선의 위치관계': '원·직선 관계',
  '평행이동과 대칭이동': '평행·대칭이동',
  '집합의 개념과 표현': '집합의 표현',
  '두 집합 사이의 포함관계': '집합 포함관계',
  '집합의 연산과 벤 다이어그램': '집합 연산',
  '중간범위 누적 정리': '중간범위 정리',
  '명제와 조건': '명제와 조건',
  '명제의 증명과 절대부등식': '명제·절대부등식',
  '함수의 뜻과 그래프': '함수와 그래프',
  '합성함수와 역함수': '합성·역함수',
  유리함수: '유리함수',
  무리함수: '무리함수',
  '유리함수와 무리함수 활용': '유리·무리 활용',
  지수: '지수',
  로그: '로그',
  '지수함수, 로그함수': '지수·로그함수',
  '지수함수, 로그함수 활용': '지수·로그 활용',
  '함수의 극한': '함수의 극한',
  '극한의 성질 및 중단원 마무리': '극한 성질',
  '함수의 연속': '함수의 연속',
  '연속함수의 성질': '연속함수 성질',
  '포물선의 방정식': '포물선',
};

function calendarSubtitle(day: SummerDashboardDay): string {
  if (day.role === 'learning') return compactLearningTitle[day.previewTitle] ?? day.previewTitle;
  return '';
}

function calendarMeta(day: SummerDashboardDay): string {
  if (day.learningNumber) return `${day.learningNumber}일차`;
  if (day.role === 'supplement') return '보충';
  if (day.role === 'review') return '오답';
  if (day.role === 'mock') return day.title.replace('모의', '모의 ');
  return day.title;
}

export function SummerSubjectDashboard({ subjectLabel, shortLabel, days, master, showSubjectChooser }: SummerSubjectDashboardProps) {
  const visibleDays = useMemo(() => days.filter((day) => day.dayOfWeek !== 0), [days]);
  const [selectedDate, setSelectedDate] = useState(() => initialDate(visibleDays));
  const selected = visibleDays.find((day) => day.date === selectedDate) ?? visibleDays[0];

  return (
    <main className="min-h-screen bg-parchment text-ink">
      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-9">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-cream pb-5">
          <div>
            {showSubjectChooser ? (
              <Link href="/5wsummer" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone transition hover:text-terracotta">
                <ArrowLeft className="h-3.5 w-3.5" />
                과목 선택
              </Link>
            ) : null}
            <p className="mt-4 text-[11px] font-medium uppercase tracking-normal text-stone">5주 특강 · {shortLabel}</p>
            <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-normal md:text-[36px]">
              {subjectLabel} 학습 달력
            </h1>
          </div>
          <div className="rounded-lg border border-border-cream bg-ivory px-4 py-3 text-right">
            <p className="text-[12px] font-semibold text-stone">7/13 개강</p>
            <p className="mt-1 text-[13px] font-medium text-olive">월화 · 목금 진도 공개</p>
          </div>
        </div>

        {master ? (
          <p className="mt-4 rounded-lg border border-olive/20 bg-olive/10 px-3 py-2 text-[12px] font-medium text-olive">
            관리자 확인 모드에서는 공개 예정 자료까지 미리 보입니다.
          </p>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <section className="min-w-0">
            <div className="overflow-x-auto rounded-lg border border-border-cream bg-ivory">
              <div className="grid min-w-[680px] grid-cols-6">
                {['월', '화', '수', '목', '금', '토'].map((weekday) => (
                  <div key={weekday} className="border-b border-border-cream bg-stone/10 py-2 text-center text-[13px] font-bold text-ink">
                    {weekday}
                  </div>
                ))}

                {visibleDays.map((day) => {
                  const selectedDay = selected?.date === day.date;
                  const locked = day.release.kind === 'locked';
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDate(day.date)}
                      className={[
                        'min-h-[112px] border-b border-r p-2.5 text-left transition last:border-r-0 focus:outline-none focus:ring-2 focus:ring-terracotta/30 md:min-h-[124px] md:p-3',
                        roleClass[day.role],
                        selectedDay ? 'ring-2 ring-inset ring-terracotta' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 whitespace-nowrap text-[11px] font-bold leading-none tracking-normal text-stone/70 md:text-[12px]">
                          <span>{formatMd(day.date)}</span>
                          <span className="ml-1 text-stone">{calendarMeta(day)}</span>
                        </p>
                        {locked ? <Lock className="h-3.5 w-3.5 text-stone" /> : null}
                      </div>
                      {calendarSubtitle(day) ? (
                        <p className="mt-3 max-h-[3em] overflow-hidden break-keep text-[13px] font-black leading-snug text-ink md:text-[14px]">
                          {calendarSubtitle(day)}
                        </p>
                      ) : null}
                      {day.role === 'review' || day.role === 'mock' || day.role === 'supplement' ? (
                        <span className={['mt-2 inline-flex rounded px-1.5 py-0.5 text-[11px] font-bold', badgeClass[day.role]].join(' ')}>
                          {day.title}
                        </span>
                      ) : null}
                      {day.role === 'learning' && locked ? (
                        <p className="mt-1.5 text-[10px] font-medium leading-snug text-stone md:text-[11px]">
                          {formatOpenAt(day.release.opensAt)}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {selected ? (
            <aside className="min-w-0 rounded-lg border border-border-cream bg-ivory p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-semibold text-stone">
                    {formatMd(selected.date)} {selected.weekday}요일
                  </p>
                  <h2 className="mt-1 font-serif text-[24px] leading-tight tracking-normal">
                    {selected.learningNumber ? `${selected.learningNumber}일차` : selected.title}
                  </h2>
                </div>
                {selected.release.kind === 'locked' ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-stone/10 px-2 py-1 text-[12px] font-semibold text-stone">
                    <Lock className="h-3.5 w-3.5" />
                    대기
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-olive/10 px-2 py-1 text-[12px] font-semibold text-olive">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    공개
                  </span>
                )}
              </div>

              <div className="mt-5 border-t border-border-cream pt-5">
                {selected.release.kind === 'locked' ? (
                  <div className="rounded-lg bg-stone/10 px-4 py-4">
                    {selected.role === 'learning' ? <p className="mb-2 break-keep text-[15px] font-bold leading-snug text-ink">{selected.previewTitle}</p> : null}
                    <p className="text-[14px] font-bold text-ink">아직 공개 전입니다.</p>
                    <p className="mt-1 break-keep text-[13px] leading-relaxed text-stone">
                      {formatOpenAt(selected.release.opensAt)} 이후 자료 링크가 열립니다.
                    </p>
                  </div>
                ) : selected.content.kind === 'label' ? (
                  <div className="rounded-lg bg-stone/10 px-4 py-4">
                    <p className="text-[15px] font-bold text-ink">{selected.content.title}</p>
                    <p className="mt-1 break-keep text-[13px] leading-relaxed text-stone">{selected.content.body}</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[15px] font-bold text-ink">{selected.content.title}</p>
                      <div className="mt-3 space-y-2">
                        {selected.content.resources.length > 0 ? (
                          selected.content.resources.map((resource) => (
                            <a
                              key={`${resource.kind}-${resource.href}`}
                              href={resource.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 rounded-lg border border-border-cream bg-parchment px-3 py-3 transition hover:border-terracotta/40 hover:shadow-ring-warm"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-terracotta/10 text-terracotta">
                                {resource.kind === 'pdf' ? <Download className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" fill="currentColor" />}
                              </span>
                              <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink">{resource.label}</span>
                            </a>
                          ))
                        ) : (
                          <p className="rounded-lg bg-stone/10 px-3 py-3 text-[13px] font-medium text-stone">
                            자료가 준비되는 대로 이 자리에 연결됩니다.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border-cream bg-parchment px-4 py-4">
                      <p className="flex items-center gap-2 text-[13px] font-bold text-ink">
                        <BookOpen className="h-4 w-4 text-olive" />
                        오늘 할 일
                      </p>
                      <ol className="mt-3 space-y-2 break-keep text-[13px] leading-relaxed text-stone">
                        <li>1. 개념노트 먼저 풀기</li>
                        <li>2. 영상 보며 노트 보완하기</li>
                        <li>3. 수업 안내 범위 풀기</li>
                      </ol>
                    </div>

                    <div className="rounded-lg border border-olive/20 bg-olive/10 px-4 py-4">
                      <p className="flex items-center gap-2 text-[13px] font-bold text-olive">
                        <RotateCcw className="h-4 w-4" />
                        완료 기준
                      </p>
                      <p className="mt-2 break-keep text-[13px] leading-relaxed text-olive">
                        개념노트, 영상, 복습 문제지까지 완료.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          ) : null}
        </div>
      </section>
    </main>
  );
}
