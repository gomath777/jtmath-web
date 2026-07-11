#!/usr/bin/env npx tsx

import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { contentForDay } from '../../src/lib/summer-5week/content';
import { releaseStateFor, summerCalendar } from '../../src/lib/summer-5week/schedule';
import { SUMMER_SUBJECTS, type SummerSubject } from '../../src/lib/summer-5week/subjects';

const EVIDENCE_PATH = '.omo/evidence/summer-5week-assigned-subjects/task-5-schedule.txt';

function requestedCases(): readonly string[] {
  const cases: string[] = [];
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--case') {
      const value = args[index + 1];
      if (value) cases.push(value);
    }
  }
  return cases.length > 0
    ? cases
    : [
        'all-subjects',
        'subject-specific-midterm',
        'ds-midterm-boundary',
        'mj1-midterm-boundary',
        'release-windows',
        'pending-assets',
        'gh-first-lesson-ready',
        'ready-subjects-no-pending',
        'early-release',
        'missing-resource-url',
        'fake-pending-link',
      ];
}

function assertOk(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function mustDay(subject: SummerSubject, date: string) {
  const day = summerCalendar(subject).find((candidate) => candidate.date === date);
  if (!day) throw new Error(`missing day ${date}`);
  return day;
}

function runCase(name: string): string {
  switch (name) {
    case 'all-subjects': {
      const days = summerCalendar();
      const learningDays = days.filter((day) => day.role === 'learning').length;
      assertOk(SUMMER_SUBJECTS.length === 5, 'expected five subjects');
      assertOk(days.length === 34, 'expected mj1 2026-07-13 through 2026-08-15');
      assertOk(learningDays === 17, 'expected mj1 17 learning days');
      assertOk(summerCalendar('ds').filter((day) => day.role === 'learning').length === 16, 'expected default subjects to have 16 learning days');
      return `all-subjects: ok subjects=5 mj1Days=${days.length} mj1Learning=${learningDays}`;
    }
    case 'subject-specific-midterm': {
      assertOk(mustDay('mj1', '2026-07-29').role === 'review', 'mj1 should review on 7/29');
      assertOk(mustDay('mj1', '2026-07-30').role === 'mock', 'mj1 should mock on 7/30');
      assertOk(mustDay('ds', '2026-07-27').role === 'review', 'default subjects should review on 7/27');
      assertOk(mustDay('ds', '2026-07-28').role === 'review', 'default subjects should review on 7/28');
      assertOk(mustDay('ds', '2026-07-29').role === 'mock', 'default subjects should mock on 7/29');
      assertOk(mustDay('ds', '2026-07-30').learningNumber === 9, 'default subjects should resume learning on 7/30');
      return 'subject-specific-midterm: ok mj1 exception only';
    }
    case 'ds-midterm-boundary': {
      const day8 = contentForDay('ds', mustDay('ds', '2026-07-24'));
      const day9 = contentForDay('ds', mustDay('ds', '2026-07-30'));
      assertOk(day8.kind === 'learning' && day8.title === '삼각함수 그래프 정리', 'ds day 8 should stay in trig graph range');
      assertOk(day9.kind === 'learning' && day9.title === '사인법칙과 코사인법칙', 'ds final range should start with sine/cosine law');
      return 'ds-midterm-boundary: ok graph-before-midterm sine-law-after';
    }
    case 'mj1-midterm-boundary': {
      const day10 = contentForDay('mj1', mustDay('mj1', '2026-07-28'));
      const day11 = contentForDay('mj1', mustDay('mj1', '2026-07-31'));
      assertOk(day10.kind === 'learning' && day10.title === '함수의 그래프 정리', 'mj1 day 10 should stay in graph range');
      assertOk(day11.kind === 'learning' && day11.title === '방정식 부등식 활용, 속도와 가속도', 'mj1 final range should start with equations and inequalities');
      return 'mj1-midterm-boundary: ok graph-before-midterm equations-after';
    }
    case 'release-windows': {
      const monday = releaseStateFor('2026-07-13', new Date('2026-07-12T00:00:00+09:00'), false);
      const tuesday = releaseStateFor('2026-07-14', new Date('2026-07-12T00:00:00+09:00'), false);
      const thursdayEarly = releaseStateFor('2026-07-16', new Date('2026-07-15T20:59:00+09:00'), false);
      const thursdayOpen = releaseStateFor('2026-07-16', new Date('2026-07-15T21:00:00+09:00'), false);
      assertOk(monday.kind === 'open' && tuesday.kind === 'open', 'Sunday should open Mon/Tue');
      assertOk(thursdayEarly.kind === 'locked' && thursdayOpen.kind === 'open', 'Wednesday night should open Thu/Fri');
      return 'release-windows: ok sunday-and-wednesday';
    }
    case 'pending-assets': {
      const gs2 = contentForDay('gs2', mustDay('gs2', '2026-07-13'));
      assertOk(gs2.kind === 'learning' && gs2.pending && gs2.resources.length === 0, 'gs2 should be pending without links');
      return 'pending-assets: ok gs2=준비중';
    }
    case 'gh-first-lesson-ready': {
      const gh = contentForDay('gh', mustDay('gh', '2026-07-13'));
      assertOk(gh.kind === 'learning' && !gh.pending, 'gh first lesson should be ready');
      assertOk(gh.kind === 'learning' && gh.title === '포물선의 방정식', 'gh first lesson title should match');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.kind === 'pdf'), 'gh first lesson should have note');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.kind === 'video'), 'gh first lesson should have video');
      return 'gh-first-lesson-ready: ok note-and-video';
    }
    case 'ready-subjects-no-pending': {
      for (const subject of ['gs1', 'ds', 'mj1'] as const) {
        const learningDays = summerCalendar(subject).filter((day) => day.role === 'learning');
        for (const day of learningDays) {
          const content = contentForDay(subject, day);
          assertOk(content.kind === 'learning' && !content.pending, `${subject} ${day.date} should not be pending`);
        }
      }
      return 'ready-subjects-no-pending: ok gs1/ds/mj1';
    }
    case 'early-release': {
      const state = releaseStateFor('2026-07-16', new Date('2026-07-13T09:00:00+09:00'), false);
      assertOk(state.kind === 'locked', 'Thursday should be locked before Wednesday night');
      return 'early-release: ok locked';
    }
    case 'missing-resource-url': {
      const content = contentForDay('mj1', mustDay('mj1', '2026-07-13'));
      assertOk(content.kind === 'learning' && content.resources.every((resource) => resource.href.startsWith('https://')), 'resource URLs must be absolute');
      return 'missing-resource-url: ok';
    }
    case 'fake-pending-link': {
      const content = contentForDay('gs2', mustDay('gs2', '2026-07-20'));
      assertOk(content.kind === 'learning' && content.pending && content.resources.length === 0, 'pending content must not include links');
      return 'fake-pending-link: ok';
    }
    default:
      throw new Error(`unknown case: ${name}`);
  }
}

async function main(): Promise<void> {
  const lines = requestedCases().map(runCase);
  await mkdir(dirname(EVIDENCE_PATH), { recursive: true });
  await writeFile(EVIDENCE_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log(lines.join('\n'));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
