#!/usr/bin/env npx tsx

import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { contentForDay } from '../../src/lib/summer-5week/content';
import { releaseStateFor, summerCalendar } from '../../src/lib/summer-5week/schedule';
import { SUMMER_SUBJECTS } from '../../src/lib/summer-5week/subjects';

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
    : ['all-subjects', 'release-windows', 'pending-assets', 'ready-subjects-no-pending', 'early-release', 'missing-resource-url', 'fake-pending-link'];
}

function assertOk(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function mustDay(date: string) {
  const day = summerCalendar().find((candidate) => candidate.date === date);
  if (!day) throw new Error(`missing day ${date}`);
  return day;
}

function runCase(name: string): string {
  switch (name) {
    case 'all-subjects': {
      const days = summerCalendar();
      const learningDays = days.filter((day) => day.role === 'learning').length;
      assertOk(SUMMER_SUBJECTS.length === 5, 'expected five subjects');
      assertOk(days.length === 34, 'expected 2026-07-13 through 2026-08-15');
      assertOk(learningDays === 17, 'expected 17 learning days');
      return `all-subjects: ok subjects=5 days=${days.length} learning=${learningDays}`;
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
      const gs2 = contentForDay('gs2', mustDay('2026-07-13'));
      const gh = contentForDay('gh', mustDay('2026-07-13'));
      assertOk(gs2.kind === 'learning' && gs2.pending && gs2.resources.length === 0, 'gs2 should be pending without links');
      assertOk(gh.kind === 'learning' && gh.pending && gh.resources.length === 0, 'gh should be pending without links');
      return 'pending-assets: ok gs2=준비중 gh=준비중';
    }
    case 'ready-subjects-no-pending': {
      const learningDays = summerCalendar().filter((day) => day.role === 'learning');
      for (const subject of ['gs1', 'ds', 'mj1'] as const) {
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
      const content = contentForDay('mj1', mustDay('2026-07-13'));
      assertOk(content.kind === 'learning' && content.resources.every((resource) => resource.href.startsWith('https://')), 'resource URLs must be absolute');
      return 'missing-resource-url: ok';
    }
    case 'fake-pending-link': {
      const content = contentForDay('gs2', mustDay('2026-07-20'));
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
