import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SummerSubjectDashboard, type SummerDashboardDay } from '../_components/SummerSubjectDashboard';
import { accessStateForDay, type SubjectDayAccess } from '@/lib/summer-5week/access';
import type { SummerSession } from '@/lib/summer-5week/auth';
import { contentForDay, type DayContent } from '@/lib/summer-5week/content';
import { nowForSummerRelease, summerCalendar, type ReleaseState } from '@/lib/summer-5week/schedule';
import { requireSummerSession } from '@/lib/summer-5week/server';
import { isSummerSubject, SUMMER_SUBJECT_INFO, type SummerSubject } from '@/lib/summer-5week/subjects';

type SummerSubjectPageProps = {
  readonly params: Promise<{
    readonly subject: string;
  }>;
};

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return [];
}

function assertNever(value: never): never {
  throw new Error(`Unhandled summer day access: ${String(value)}`);
}

export async function generateMetadata({ params }: SummerSubjectPageProps): Promise<Metadata> {
  const { subject } = await params;
  if (!isSummerSubject(subject)) return {};
  const info = SUMMER_SUBJECT_INFO[subject];
  return {
    title: `${info.shortLabel} 5주 특강 | 고T수학`,
  };
}

function visibleRelease(access: SubjectDayAccess): ReleaseState {
  return access.kind === 'cutoff' ? { kind: 'open' } : access;
}

function contentVisibleToStudent(subject: SummerSubject, day: ReturnType<typeof summerCalendar>[number], access: SubjectDayAccess): DayContent {
  switch (access.kind) {
    case 'locked':
      return {
        kind: 'label',
        title: '공개 예정',
        body: '공개 시간이 지나면 자료 링크와 과제가 열립니다.',
      };
    case 'cutoff':
      return {
        kind: 'label',
        title: '수강 종료 이후 자료입니다.',
        body: '수강 가능 기간 이후 일정의 자료 링크는 제공되지 않습니다.',
      };
    case 'open':
      return contentForDay(subject, day);
    default:
      return assertNever(access);
  }
}

function buildDashboardDays(subject: SummerSubject, session: SummerSession): readonly SummerDashboardDay[] {
  const now = nowForSummerRelease();
  return summerCalendar(subject).map((day) => {
    const access = accessStateForDay(subject, day, {
      accessThrough: session.accessThrough,
      master: session.master,
      now,
    });
    const release = visibleRelease(access);
    const dayContent = contentForDay(subject, day);
    return {
      ...day,
      release,
      previewTitle: dayContent.title,
      content: session.master ? dayContent : contentVisibleToStudent(subject, day, access),
    };
  });
}

export default async function SummerSubjectPage({ params }: SummerSubjectPageProps) {
  const { subject } = await params;
  if (!isSummerSubject(subject)) notFound();

  const session = await requireSummerSession();
  if (!session.subjects.includes(subject)) redirect('/5wsummer');

  const info = SUMMER_SUBJECT_INFO[subject];
  const days = buildDashboardDays(subject, session);

  return (
    <SummerSubjectDashboard
      subjectLabel={info.label}
      shortLabel={info.shortLabel}
      days={days}
      master={session.master}
      showSubjectChooser={session.master || session.subjects.length > 1}
    />
  );
}
