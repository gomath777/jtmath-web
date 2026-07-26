import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays, CheckCircle2, Clock3, FileText, Play, TriangleAlert } from 'lucide-react';
import { contentForDay } from '@/lib/summer-5week/content';
import { nowForSummerRelease, releaseStateFor, summerCalendar, type CalendarRole } from '@/lib/summer-5week/schedule';
import { allSubjects, SUMMER_SUBJECT_INFO, type SummerSubject } from '@/lib/summer-5week/subjects';
import { createClient } from '@/utils/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com')
  .split(',')
  .map((email) => email.trim());

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토'] as const;

type ResourceSummary = {
  readonly pdfCount: number;
  readonly videoCount: number;
};

type AdminCalendarDay = {
  readonly date: string;
  readonly weekday: string;
  readonly week: number;
  readonly role: CalendarRole;
  readonly learningNumber: number | null;
  readonly title: string;
  readonly released: boolean;
  readonly opensAt: string | null;
  readonly pending: boolean;
  readonly resources: ResourceSummary;
};

type SubjectCalendar = {
  readonly subject: SummerSubject;
  readonly label: string;
  readonly shortLabel: string;
  readonly days: readonly AdminCalendarDay[];
};

export const dynamic = 'force-dynamic';

function formatMd(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function formatOpenAt(value: string): string {
  if (!value.includes('T')) return `${formatMd(value)} 공개`;
  const [date, timePart] = value.split('T');
  return `${formatMd(date)} ${timePart.slice(0, 5)} 공개`;
}

function roleLabel(role: CalendarRole, title: string): string {
  if (role === 'learning') return title;
  if (role === 'review') return '오답 총정리';
  if (role === 'mock') return title;
  if (role === 'rest') return '휴식';
  return '보충 / 질문';
}

function roleClass(day: AdminCalendarDay): string {
  if (day.role === 'mock') return 'border-red-300 bg-red-50 text-red-900';
  if (day.role === 'review') return 'border-yellow-300 bg-yellow-50 text-yellow-950';
  if (day.role === 'supplement') return 'border-slate-200 bg-slate-100 text-slate-600';
  if (day.role === 'rest') return 'border-slate-100 bg-white/50 text-slate-400';
  if (day.pending) return 'border-orange-300 bg-orange-50 text-orange-950';
  if (!day.released) return 'border-slate-200 bg-white text-slate-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-950';
}

function statusLabel(day: AdminCalendarDay): string {
  if (day.role !== 'learning') return roleLabel(day.role, day.title);
  if (day.pending) return '자료 준비중';
  return day.released ? '공개중' : '공개 예정';
}

function buildSubjectCalendar(subject: SummerSubject, now: Date): SubjectCalendar {
  const info = SUMMER_SUBJECT_INFO[subject];
  const days = summerCalendar(subject)
    .filter((day) => day.dayOfWeek !== 0)
    .map((day): AdminCalendarDay => {
      const content = contentForDay(subject, day);
      const release = releaseStateFor(day.date, now, false, subject);
      const resources = content.kind === 'learning' ? content.resources : [];
      return {
        date: day.date,
        weekday: day.weekday,
        week: day.week,
        role: day.role,
        learningNumber: day.learningNumber,
        title: content.title,
        released: release.kind === 'open',
        opensAt: release.kind === 'locked' ? release.opensAt : null,
        pending: content.kind === 'learning' ? content.pending : false,
        resources: {
          pdfCount: resources.filter((resource) => resource.kind === 'pdf').length,
          videoCount: resources.filter((resource) => resource.kind === 'video').length,
        },
      };
    });

  return { subject, label: info.label, shortLabel: info.shortLabel, days };
}

function subjectStats(days: readonly AdminCalendarDay[]) {
  const learningDays = days.filter((day) => day.role === 'learning');
  const readyDays = learningDays.filter((day) => !day.pending && day.resources.pdfCount + day.resources.videoCount > 0);
  const pendingDays = learningDays.filter((day) => day.pending);
  const unreleasedReadyDays = learningDays.filter((day) => !day.pending && !day.released);
  return {
    learningCount: learningDays.length,
    readyCount: readyDays.length,
    pendingCount: pendingDays.length,
    unreleasedReadyCount: unreleasedReadyDays.length,
  };
}

function DayCell({ day }: { readonly day: AdminCalendarDay }) {
  return (
    <div className={`min-h-[104px] rounded-xl border p-3 ${roleClass(day)}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-500">
          {formatMd(day.date)} {day.learningNumber ? `${day.learningNumber}일차` : day.weekday}
        </p>
        {day.pending ? <TriangleAlert className="h-4 w-4 text-orange-500" /> : null}
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] font-bold leading-5">{day.title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
        <span className="rounded-md bg-white/70 px-2 py-1">{statusLabel(day)}</span>
        {day.role === 'learning' ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1">
              <FileText className="h-3 w-3" />
              {day.resources.pdfCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1">
              <Play className="h-3 w-3" fill="currentColor" />
              {day.resources.videoCount}
            </span>
          </>
        ) : null}
      </div>
      {day.opensAt ? <p className="mt-2 text-[11px] text-slate-500">{formatOpenAt(day.opensAt)}</p> : null}
    </div>
  );
}

function SubjectBlock({ calendar }: { readonly calendar: SubjectCalendar }) {
  const stats = subjectStats(calendar.days);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400">5주 특강</p>
          <h2 className="text-xl font-black text-slate-950">{calendar.shortLabel} 학습 달력</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">준비 {stats.readyCount}/{stats.learningCount}</span>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">준비중 {stats.pendingCount}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">미공개 {stats.unreleasedReadyCount}</span>
        </div>
      </div>
      <div className="grid min-w-[980px] grid-cols-6 gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-black text-slate-600">
            {label}
          </div>
        ))}
        {calendar.days.map((day) => (
          <DayCell key={`${calendar.subject}-${day.date}`} day={day} />
        ))}
      </div>
    </section>
  );
}

export default async function AdminSummerCalendarsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  const now = nowForSummerRelease();
  const calendars = allSubjects().map((subject) => buildSubjectCalendar(subject, now));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin" className="text-xs font-semibold text-slate-500 hover:text-slate-900">어드민 홈</Link>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black tracking-tight">
              <CalendarDays className="h-8 w-8 text-red-600" />
              5주 특강 전체 달력
            </h1>
            <p className="mt-2 text-sm text-slate-500">모든 과목의 날짜별 진도, 자료 준비 상태, 학생 공개 상태를 한 화면에서 확인합니다.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <p className="flex items-center gap-2 font-bold text-slate-900">
              <Clock3 className="h-4 w-4 text-slate-500" />
              기준 시각
            </p>
            <p className="mt-1 text-xs text-slate-500">{now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-5">
          {calendars.map((calendar) => {
            const stats = subjectStats(calendar.days);
            return (
              <a key={calendar.subject} href={`#${calendar.subject}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-200 hover:shadow-md">
                <p className="text-xs font-semibold text-slate-400">{calendar.label}</p>
                <p className="mt-1 text-lg font-black text-slate-950">{calendar.shortLabel}</p>
                <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  준비 {stats.readyCount}/{stats.learningCount}
                </p>
              </a>
            );
          })}
        </section>

        <div className="space-y-6">
          {calendars.map((calendar) => (
            <div key={calendar.subject} id={calendar.subject} className="overflow-x-auto pb-2">
              <SubjectBlock calendar={calendar} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
