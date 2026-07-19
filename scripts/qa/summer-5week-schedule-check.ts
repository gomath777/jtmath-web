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
        'gs2-midterm-boundary',
        'gs2-final-range-titles',
        'mj1-midterm-boundary',
        'mock-labels',
        'release-windows',
        'pending-assets',
        'gs1-first-week-ready',
        'gs2-first-lesson-ready',
        'gs2-second-lesson-ready',
        'gs2-fourth-lesson-ready',
        'gs2-fifth-lesson-ready',
        'gh-first-lesson-ready',
        'gh-second-lesson-ready',
        'gh-third-lesson-ready',
        'gh-fourth-lesson-ready',
        'gh-fifth-lesson-ready',
        'gh-sixth-lesson-ready',
        'gh-planned-midterm-titles',
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
      assertOk(summerCalendar('gs2').filter((day) => day.role === 'learning').length === 16, 'expected gs2 to keep 16 learning days');
      return `all-subjects: ok subjects=5 mj1Days=${days.length} mj1Learning=${learningDays}`;
    }
    case 'subject-specific-midterm': {
      assertOk(mustDay('mj1', '2026-07-29').role === 'review', 'mj1 should review on 7/29');
      assertOk(mustDay('mj1', '2026-07-30').role === 'mock', 'mj1 should mock on 7/30');
      assertOk(mustDay('gs2', '2026-07-27').learningNumber === 9, 'gs2 should use 7/27 as day 9 learning');
      assertOk(mustDay('gs2', '2026-07-28').role === 'review', 'gs2 should review on 7/28 only');
      assertOk(mustDay('gs2', '2026-07-29').role === 'mock', 'gs2 should mock on 7/29');
      assertOk(mustDay('gs2', '2026-08-10').learningNumber === 16, 'gs2 should finish 16 learning days on 8/10');
      assertOk(mustDay('gs2', '2026-08-11').role === 'supplement', 'gs2 8/11 should become supplement after keeping 16 days');
      assertOk(mustDay('ds', '2026-07-27').role === 'review', 'default subjects should review on 7/27');
      assertOk(mustDay('ds', '2026-07-28').role === 'review', 'default subjects should review on 7/28');
      assertOk(mustDay('ds', '2026-07-29').role === 'mock', 'default subjects should mock on 7/29');
      assertOk(mustDay('ds', '2026-07-30').learningNumber === 9, 'default subjects should resume learning on 7/30');
      return 'subject-specific-midterm: ok gs2-and-mj1-exceptions';
    }
    case 'gs2-midterm-boundary': {
      const day3 = contentForDay('gs2', mustDay('gs2', '2026-07-16'));
      const day5 = contentForDay('gs2', mustDay('gs2', '2026-07-20'));
      const day9 = contentForDay('gs2', mustDay('gs2', '2026-07-27'));
      assertOk(day3.kind === 'learning' && day3.title === '원의 방정식과 그래프', 'gs2 day 3 should show circle equation title');
      assertOk(day5.kind === 'learning' && day5.title === '평행이동과 대칭이동', 'gs2 day 5 should combine transformations');
      assertOk(day9.kind === 'learning' && day9.title === '중간범위 누적 정리', 'gs2 day 9 should close midterm range before review');
      return 'gs2-midterm-boundary: ok one-review-midterm-plan';
    }
    case 'gs2-final-range-titles': {
      const expected = [
        ['2026-07-30', '명제와 조건'],
        ['2026-07-31', '명제의 증명과 절대부등식'],
        ['2026-08-03', '함수의 뜻과 그래프'],
        ['2026-08-04', '합성함수와 역함수'],
        ['2026-08-06', '유리함수'],
        ['2026-08-07', '무리함수'],
        ['2026-08-10', '유리함수와 무리함수 활용'],
      ] as const;
      for (const [date, title] of expected) {
        const content = contentForDay('gs2', mustDay('gs2', date));
        assertOk(content.kind === 'learning' && content.title === title, `gs2 ${date} should show ${title}`);
        assertOk(content.kind === 'learning' && content.pending, `gs2 ${date} should remain pending until assets are uploaded`);
      }
      return 'gs2-final-range-titles: ok proposition-function-rational-irrational';
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
    case 'mock-labels': {
      const defaultMidterm = mustDay('ds', '2026-07-29');
      const mj1Midterm = mustDay('mj1', '2026-07-30');
      const defaultFinal = mustDay('ds', '2026-08-15');
      assertOk(defaultMidterm.role === 'mock' && defaultMidterm.title === '모의중간', 'default subjects should label July mock as midterm');
      assertOk(mj1Midterm.role === 'mock' && mj1Midterm.title === '모의중간', 'mj1 should label July mock as midterm');
      assertOk(defaultFinal.role === 'mock' && defaultFinal.title === '모의기말', 'August mock should label as final');
      return 'mock-labels: ok midterm-and-final';
    }
    case 'release-windows': {
      const monday = releaseStateFor('2026-07-13', new Date('2026-07-12T00:00:00+09:00'), false);
      const tuesday = releaseStateFor('2026-07-14', new Date('2026-07-12T00:00:00+09:00'), false);
      const ghTuesday = releaseStateFor('2026-07-14', new Date('2026-07-12T00:00:00+09:00'), false, 'gh');
      const ghTuesdayOpen = releaseStateFor('2026-07-14', new Date('2026-07-13T21:00:00+09:00'), false, 'gh');
      const thursdayEarly = releaseStateFor('2026-07-16', new Date('2026-07-15T20:59:00+09:00'), false);
      const thursdayOpen = releaseStateFor('2026-07-16', new Date('2026-07-15T21:00:00+09:00'), false);
      assertOk(monday.kind === 'open' && tuesday.kind === 'open', 'Sunday should open Mon/Tue');
      assertOk(ghTuesday.kind === 'locked' && ghTuesday.opensAt === '2026-07-13T21:00:00+09:00', 'gh Tuesday should stay locked until Monday night');
      assertOk(ghTuesdayOpen.kind === 'open', 'gh Tuesday should open Monday night');
      assertOk(thursdayEarly.kind === 'locked' && thursdayOpen.kind === 'open', 'Wednesday night should open Thu/Fri');
      return 'release-windows: ok sunday-and-wednesday';
    }
    case 'pending-assets': {
      const gs2 = contentForDay('gs2', mustDay('gs2', '2026-07-21'));
      assertOk(gs2.kind === 'learning' && gs2.pending && gs2.resources.length === 0, 'gs2 later lessons should be pending without links');
      assertOk(gs2.kind === 'learning' && gs2.title === '집합의 개념과 표현', 'gs2 pending lessons should keep planned unit title');
      return 'pending-assets: ok gs2-day6=planned-title';
    }
    case 'gs1-first-week-ready': {
      const expected = [
        ['2026-07-13', '다항식의 연산', '다항식의 사칙연산', '1강 다항식의 연산'],
        ['2026-07-14', '나머지정리', '항등식과 나머지정리', '2강 나머지정리'],
        ['2026-07-16', '인수분해', '다항식의 인수분해', '3강 인수분해'],
        ['2026-07-17', '복소수', '복소수의 뜻과 성질', '4강 복소수'],
      ] as const;
      for (const [date, title, note, video] of expected) {
        const content = contentForDay('gs1', mustDay('gs1', date));
        assertOk(content.kind === 'learning' && !content.pending, `gs1 ${date} should be ready`);
        assertOk(content.kind === 'learning' && content.title === title, `gs1 ${date} should show ${title}`);
        assertOk(content.kind === 'learning' && content.resources.some((resource) => resource.label === note), `gs1 ${date} should have note`);
        assertOk(content.kind === 'learning' && content.resources.some((resource) => resource.label === video), `gs1 ${date} should have video`);
      }
      return 'gs1-first-week-ready: ok four-days-notes-and-videos';
    }
    case 'gs2-first-lesson-ready': {
      const gs2 = contentForDay('gs2', mustDay('gs2', '2026-07-13'));
      assertOk(gs2.kind === 'learning' && !gs2.pending, 'gs2 first lesson should be ready');
      assertOk(gs2.kind === 'learning' && gs2.title === '선분의 내분점', 'gs2 first lesson title should match');
      assertOk(gs2.kind === 'learning' && gs2.resources.some((resource) => resource.kind === 'pdf'), 'gs2 first lesson should have note');
      assertOk(gs2.kind === 'learning' && gs2.resources.filter((resource) => resource.kind === 'video').length === 1, 'gs2 first lesson should have one video');
      assertOk(gs2.kind === 'learning' && gs2.resources.some((resource) => resource.label === '1강 선분의 내분점'), 'gs2 first lesson should use renumbered first video');
      return 'gs2-first-lesson-ready: ok note-and-one-video';
    }
    case 'gs2-second-lesson-ready': {
      const gs2 = contentForDay('gs2', mustDay('gs2', '2026-07-14'));
      assertOk(gs2.kind === 'learning' && !gs2.pending, 'gs2 second lesson should be ready');
      assertOk(gs2.kind === 'learning' && gs2.title === '직선의 방정식과 점과 직선 사이의 거리', 'gs2 second lesson title should match');
      assertOk(gs2.kind === 'learning' && gs2.resources.filter((resource) => resource.kind === 'pdf').length === 2, 'gs2 second lesson should have two notes');
      assertOk(gs2.kind === 'learning' && gs2.resources.filter((resource) => resource.kind === 'video').length === 3, 'gs2 second lesson should have three videos');
      assertOk(gs2.kind === 'learning' && gs2.resources.some((resource) => resource.label === '2강 직선의 방정식'), 'gs2 second lesson should start at lecture 2');
      assertOk(gs2.kind === 'learning' && gs2.resources.some((resource) => resource.label === '4강 점과 직선 사이의 거리'), 'gs2 second lesson should end at lecture 4');
      return 'gs2-second-lesson-ready: ok two-notes-and-renumbered-three-videos';
    }
    case 'gs2-fourth-lesson-ready': {
      const gs2 = contentForDay('gs2', mustDay('gs2', '2026-07-17'));
      assertOk(gs2.kind === 'learning' && !gs2.pending, 'gs2 fourth lesson should be ready');
      assertOk(gs2.kind === 'learning' && gs2.title === '원과 직선의 위치관계', 'gs2 fourth lesson title should match');
      assertOk(gs2.kind === 'learning' && gs2.resources.some((resource) => resource.label === '원과 직선의 위치관계 개념노트'), 'gs2 fourth lesson should have active v2 note');
      assertOk(gs2.kind === 'learning' && gs2.resources.some((resource) => resource.label === '6강 원과 직선의 위치관계'), 'gs2 fourth lesson should have lecture 6 video');
      return 'gs2-fourth-lesson-ready: ok note-and-video';
    }
    case 'gs2-fifth-lesson-ready': {
      const gs2 = contentForDay('gs2', mustDay('gs2', '2026-07-20'));
      assertOk(gs2.kind === 'learning' && !gs2.pending, 'gs2 fifth lesson should be ready');
      assertOk(gs2.kind === 'learning' && gs2.title === '평행이동과 대칭이동', 'gs2 fifth lesson title should match');
      assertOk(gs2.kind === 'learning' && gs2.resources.some((resource) => resource.label === '평행이동 개념노트'), 'gs2 fifth lesson should have translation note');
      assertOk(gs2.kind === 'learning' && gs2.resources.some((resource) => resource.label === '대칭이동 개념노트'), 'gs2 fifth lesson should have reflection note');
      assertOk(gs2.kind === 'learning' && gs2.resources.some((resource) => resource.label === '7강 평행이동'), 'gs2 fifth lesson should have lecture 7 video');
      assertOk(gs2.kind === 'learning' && gs2.resources.some((resource) => resource.label === '8강 대칭이동'), 'gs2 fifth lesson should have lecture 8 video');
      return 'gs2-fifth-lesson-ready: ok two-notes-and-two-videos';
    }
    case 'gh-first-lesson-ready': {
      const gh = contentForDay('gh', mustDay('gh', '2026-07-13'));
      assertOk(gh.kind === 'learning' && !gh.pending, 'gh first lesson should be ready');
      assertOk(gh.kind === 'learning' && gh.title === '포물선의 방정식', 'gh first lesson title should match');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.kind === 'pdf'), 'gh first lesson should have note');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.kind === 'video'), 'gh first lesson should have video');
      return 'gh-first-lesson-ready: ok note-and-video';
    }
    case 'gh-second-lesson-ready': {
      const gh = contentForDay('gh', mustDay('gh', '2026-07-14'));
      assertOk(gh.kind === 'learning' && !gh.pending, 'gh second lesson should be ready');
      assertOk(gh.kind === 'learning' && gh.title === '타원의 방정식', 'gh second lesson title should match');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '타원 개념노트'), 'gh second lesson should use ellipse v2 note');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '2강 타원의 방정식'), 'gh second lesson should have lecture 2 video');
      return 'gh-second-lesson-ready: ok note-and-video';
    }
    case 'gh-third-lesson-ready': {
      const gh = contentForDay('gh', mustDay('gh', '2026-07-16'));
      assertOk(gh.kind === 'learning' && !gh.pending, 'gh third lesson should be ready');
      assertOk(gh.kind === 'learning' && gh.title === '쌍곡선과 이차곡선', 'gh third lesson title should match');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '쌍곡선과 이차곡선 개념노트'), 'gh third lesson should have hyperbola note');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '3강 쌍곡선과 이차곡선'), 'gh third lesson should have lecture 3 video');
      return 'gh-third-lesson-ready: ok note-and-video';
    }
    case 'gh-fourth-lesson-ready': {
      const gh = contentForDay('gh', mustDay('gh', '2026-07-17'));
      assertOk(gh.kind === 'learning' && !gh.pending, 'gh fourth lesson should be ready');
      assertOk(gh.kind === 'learning' && gh.title === '포물선의 접선과 타원의 접선', 'gh fourth lesson title should match');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '포물선의 접선의 방정식 개념노트'), 'gh fourth lesson should have parabola tangent v2 note');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '타원의 접선의 방정식 개념노트'), 'gh fourth lesson should have ellipse tangent v2 note');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '4강 포물선의 접선의 방정식'), 'gh fourth lesson should have lecture 4 video');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '5강 타원의 접선의 방정식'), 'gh fourth lesson should have lecture 5 video');
      return 'gh-fourth-lesson-ready: ok two-notes-and-two-videos';
    }
    case 'gh-fifth-lesson-ready': {
      const gh = contentForDay('gh', mustDay('gh', '2026-07-20'));
      assertOk(gh.kind === 'learning' && !gh.pending, 'gh fifth lesson should be ready');
      assertOk(gh.kind === 'learning' && gh.title === '쌍곡선의 접선의 방정식', 'gh fifth lesson title should match');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '쌍곡선의 접선의 방정식 개념노트'), 'gh fifth lesson should have hyperbola tangent v2 note');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '6강 쌍곡선의 접선의 방정식'), 'gh fifth lesson should have lecture 6 video');
      return 'gh-fifth-lesson-ready: ok note-and-video';
    }
    case 'gh-sixth-lesson-ready': {
      const gh = contentForDay('gh', mustDay('gh', '2026-07-21'));
      assertOk(gh.kind === 'learning' && !gh.pending, 'gh sixth lesson should be ready');
      assertOk(gh.kind === 'learning' && gh.title === '직선과 평면의 위치 관계', 'gh sixth lesson title should match');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '직선과 평면의 위치 관계 개념노트'), 'gh sixth lesson should have line-plane position note');
      assertOk(gh.kind === 'learning' && gh.resources.some((resource) => resource.label === '7강 직선과 평면의 위치관계'), 'gh sixth lesson should have lecture 7 video');
      return 'gh-sixth-lesson-ready: ok note-and-video';
    }
    case 'gh-planned-midterm-titles': {
      const expected = [
        ['2026-07-23', '삼수선 정리'],
        ['2026-07-24', '정사영'],
      ] as const;
      for (const [date, title] of expected) {
        const gh = contentForDay('gh', mustDay('gh', date));
        assertOk(gh.kind === 'learning' && gh.title === title, `gh ${date} should show ${title}`);
        assertOk(gh.kind === 'learning' && gh.pending, `gh ${date} should remain pending until assets are uploaded`);
      }
      return 'gh-planned-midterm-titles: ok remaining-plan';
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
      const content = contentForDay('gs2', mustDay('gs2', '2026-07-21'));
      assertOk(content.kind === 'learning' && content.pending && content.resources.length === 0, 'pending content must not include links');
      assertOk(content.kind === 'learning' && content.title !== '자료 준비중', 'pending content must still show a planned title');
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
