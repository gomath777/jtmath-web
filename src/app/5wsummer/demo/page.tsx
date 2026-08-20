import type { Metadata } from 'next';
import { SummerDemoClient } from './SummerDemoClient';
import { SummerSubjectDashboard, type SummerDashboardDay } from '../_components/SummerSubjectDashboard';
import { contentForDay, type DayContent } from '@/lib/summer-5week/content';
import { releaseStateFor, summerCalendar, type ReleaseState } from '@/lib/summer-5week/schedule';
import { SUMMER_SUBJECT_INFO } from '@/lib/summer-5week/subjects';

export const metadata: Metadata = {
  title: '5주 특강 데모 | 고T수학',
};

const DEMO_SUBJECT = 'gs2';
const DEMO_NOW = new Date('2026-07-12T10:00:00+09:00');

function visibleDemoContent(release: ReleaseState, day: ReturnType<typeof summerCalendar>[number]): DayContent {
  if (release.kind === 'locked') {
    return {
      kind: 'label',
      title: '공개 예정',
      body: '공개 시간이 지나면 자료 링크와 과제가 열립니다.',
    };
  }
  return contentForDay(DEMO_SUBJECT, day);
}

function buildDemoDays(): readonly SummerDashboardDay[] {
  return summerCalendar(DEMO_SUBJECT).map((day) => {
    const release = releaseStateFor(day.date, DEMO_NOW, false, DEMO_SUBJECT);
    const dayContent = contentForDay(DEMO_SUBJECT, day);
    return {
      ...day,
      release,
      previewTitle: dayContent.title,
      content: visibleDemoContent(release, day),
    };
  });
}

export default function SummerDemoPage() {
  const info = SUMMER_SUBJECT_INFO[DEMO_SUBJECT];

  return (
    <SummerDemoClient>
      <SummerSubjectDashboard
        subjectLabel={info.label}
        shortLabel={info.shortLabel}
        days={buildDemoDays()}
        master={false}
        showSubjectChooser={false}
      />
    </SummerDemoClient>
  );
}
