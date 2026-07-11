import type { SummerSubject } from './subjects';

export type CalendarRole = 'learning' | 'supplement' | 'review' | 'mock' | 'rest';

export type SummerDay = {
  readonly date: string;
  readonly weekday: string;
  readonly week: number;
  readonly dayOfWeek: number;
  readonly role: CalendarRole;
  readonly title: string;
  readonly learningNumber: number | null;
};

export type ReleaseState =
  | { readonly kind: 'open' }
  | { readonly kind: 'locked'; readonly opensAt: string };

const COURSE_START = '2026-07-13';
const COURSE_END = '2026-08-15';
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const DEFAULT_LEARNING_DATES = [
  '2026-07-13',
  '2026-07-14',
  '2026-07-16',
  '2026-07-17',
  '2026-07-20',
  '2026-07-21',
  '2026-07-23',
  '2026-07-24',
  '2026-07-30',
  '2026-07-31',
  '2026-08-03',
  '2026-08-04',
  '2026-08-06',
  '2026-08-07',
  '2026-08-10',
  '2026-08-11',
] as const;

const MJ1_LEARNING_DATES = [
  '2026-07-13',
  '2026-07-14',
  '2026-07-16',
  '2026-07-17',
  '2026-07-20',
  '2026-07-21',
  '2026-07-23',
  '2026-07-24',
  '2026-07-27',
  '2026-07-28',
  '2026-07-31',
  '2026-08-03',
  '2026-08-04',
  '2026-08-06',
  '2026-08-07',
  '2026-08-10',
  '2026-08-11',
] as const;

const DEFAULT_REVIEW_DATES = new Set(['2026-07-27', '2026-07-28', '2026-08-13', '2026-08-14']);
const DEFAULT_MOCK_DATES = new Set(['2026-07-29', '2026-08-15']);
const MJ1_REVIEW_DATES = new Set(['2026-07-29', '2026-08-13', '2026-08-14']);
const MJ1_MOCK_DATES = new Set(['2026-07-30', '2026-08-15']);
const DEFAULT_LEARNING_DATE_SET = new Set<string>(DEFAULT_LEARNING_DATES);
const MJ1_LEARNING_DATE_SET = new Set<string>(MJ1_LEARNING_DATES);

function learningDatesFor(subject: SummerSubject): readonly string[] {
  return subject === 'mj1' ? MJ1_LEARNING_DATES : DEFAULT_LEARNING_DATES;
}

function learningDateSetFor(subject: SummerSubject): ReadonlySet<string> {
  return subject === 'mj1' ? MJ1_LEARNING_DATE_SET : DEFAULT_LEARNING_DATE_SET;
}

function reviewDatesFor(subject: SummerSubject): ReadonlySet<string> {
  return subject === 'mj1' ? MJ1_REVIEW_DATES : DEFAULT_REVIEW_DATES;
}

function mockDatesFor(subject: SummerSubject): ReadonlySet<string> {
  return subject === 'mj1' ? MJ1_MOCK_DATES : DEFAULT_MOCK_DATES;
}

function dateUtcMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function addDays(date: string, days: number): string {
  return new Date(dateUtcMs(date) + days * 86_400_000).toISOString().slice(0, 10);
}

function kstMs(date: string, hour: number): number {
  return Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00+09:00`);
}

function dayOfWeek(date: string): number {
  return new Date(dateUtcMs(date)).getUTCDay();
}

function roleForDate(subject: SummerSubject, date: string): CalendarRole {
  if (learningDateSetFor(subject).has(date)) return 'learning';
  if (reviewDatesFor(subject).has(date)) return 'review';
  if (mockDatesFor(subject).has(date)) return 'mock';
  return dayOfWeek(date) === 0 ? 'rest' : 'supplement';
}

function titleForRole(role: CalendarRole): string {
  switch (role) {
    case 'learning':
      return '학습일';
    case 'supplement':
      return '보충 / 질문';
    case 'review':
      return '오답 총정리';
    case 'mock':
      return '모의시험';
    case 'rest':
      return '휴식';
    default:
      return '일정';
  }
}

export function summerCalendar(subject: SummerSubject = 'mj1'): readonly SummerDay[] {
  const days: SummerDay[] = [];
  let cursor = COURSE_START;
  const learningDates = learningDatesFor(subject);
  while (cursor <= COURSE_END) {
    const role = roleForDate(subject, cursor);
    const learningIndex = learningDates.findIndex((date) => date === cursor);
    const day = dayOfWeek(cursor);
    days.push({
      date: cursor,
      weekday: WEEKDAYS[day],
      week: Math.floor((dateUtcMs(cursor) - dateUtcMs(COURSE_START)) / (7 * 86_400_000)) + 1,
      dayOfWeek: day,
      role,
      title: titleForRole(role),
      learningNumber: learningIndex >= 0 ? learningIndex + 1 : null,
    });
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function releaseWindowFor(date: string): string {
  const day = dayOfWeek(date);
  if (day === 1 || day === 2) return addDays(date, day === 1 ? -1 : -2);
  if (day === 4 || day === 5) return `${addDays(date, day === 4 ? -1 : -2)}T21:00:00+09:00`;
  return `${date}T00:00:00+09:00`;
}

export function releaseStateFor(date: string, now: Date, master: boolean, subject: SummerSubject = 'mj1'): ReleaseState {
  if (master) return { kind: 'open' };
  const role = roleForDate(subject, date);
  if (role !== 'learning') return { kind: 'open' };

  const releaseWindow = releaseWindowFor(date);
  const releaseMs = releaseWindow.includes('T')
    ? Date.parse(releaseWindow)
    : kstMs(releaseWindow, 0);
  return now.getTime() >= releaseMs
    ? { kind: 'open' }
    : { kind: 'locked', opensAt: releaseWindow };
}

export function nowForSummerRelease(): Date {
  const configured = process.env.SUMMER_5WEEK_NOW;
  if (!configured) return new Date();
  const parsed = new Date(configured);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function subjectCanHavePendingResources(subject: SummerSubject): boolean {
  return subject === 'gs2' || subject === 'gh';
}
