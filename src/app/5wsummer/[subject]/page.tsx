import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SummerSubjectDashboard, type SummerDashboardDay } from '../_components/SummerSubjectDashboard';
import { contentForDay, type DayContent } from '@/lib/summer-5week/content';
import { nowForSummerRelease, releaseStateFor, summerCalendar, type ReleaseState } from '@/lib/summer-5week/schedule';
import { requireSummerSession } from '@/lib/summer-5week/server';
import { isSummerSubject, SUMMER_SUBJECT_INFO, type SummerSubject } from '@/lib/summer-5week/subjects';

type SummerSubjectPageProps = {
  readonly params: {
    readonly subject: string;
  };
};

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: SummerSubjectPageProps): Promise<Metadata> {
  if (!isSummerSubject(params.subject)) return {};
  const info = SUMMER_SUBJECT_INFO[params.subject];
  return {
    title: `${info.shortLabel} 5주 특강 | 고T수학`,
  };
}

function contentVisibleToStudent(subject: SummerSubject, day: ReturnType<typeof summerCalendar>[number], release: ReleaseState): DayContent {
  if (release.kind === 'locked') {
    return {
      kind: 'label',
      title: '공개 예정',
      body: '공개 시간이 지나면 자료 링크와 과제가 열립니다.',
    };
  }
  return contentForDay(subject, day);
}

function buildDashboardDays(subject: SummerSubject, master: boolean): readonly SummerDashboardDay[] {
  const now = nowForSummerRelease();
  return summerCalendar(subject).map((day) => {
    const release = releaseStateFor(day.date, now, master, subject);
    const dayContent = contentForDay(subject, day);
    return {
      ...day,
      release,
      previewTitle: dayContent.title,
      content: master ? dayContent : contentVisibleToStudent(subject, day, release),
    };
  });
}

export default async function SummerSubjectPage({ params }: SummerSubjectPageProps) {
  if (!isSummerSubject(params.subject)) notFound();

  const subject = params.subject;
  const session = await requireSummerSession();
  if (!session.subjects.includes(subject)) redirect('/5wsummer');

  const info = SUMMER_SUBJECT_INFO[subject];
  const days = buildDashboardDays(subject, session.master);

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
