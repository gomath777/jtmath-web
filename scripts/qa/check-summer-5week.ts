import assert from 'node:assert/strict';
import { createSummerToken, verifySummerToken } from '../../src/lib/summer-5week/auth';
import { contentForDay } from '../../src/lib/summer-5week/content';
import { fixtureRosterConfig, lookupAccess, parseRosterConfig } from '../../src/lib/summer-5week/roster';
import { releaseStateFor, summerCalendar } from '../../src/lib/summer-5week/schedule';
import { allSubjects } from '../../src/lib/summer-5week/subjects';

const SECRET = 'qa-secret';
const MASTER_PIN = '999999';

function firstLearningDay() {
  const day = summerCalendar().find((candidate) => candidate.learningNumber === 1);
  assert.ok(day, 'first learning day exists');
  return day;
}

function learningDay(number: number) {
  const day = summerCalendar().find((candidate) => candidate.learningNumber === number);
  assert.ok(day, `learning day ${number} exists`);
  return day;
}

const fixture = fixtureRosterConfig();
assert.equal(fixture.kind, 'ok', 'fixture roster parses');

const duplicateLookup = lookupAccess('110202', fixture, MASTER_PIN);
assert.equal(duplicateLookup.kind, 'student', 'duplicate fixture lookup succeeds');
if (duplicateLookup.kind === 'student') {
  assert.deepEqual(duplicateLookup.subjects, ['gs1', 'ds'], 'duplicate pins merge assigned subjects');
}

const masterLookup = lookupAccess(MASTER_PIN, fixture, MASTER_PIN);
assert.equal(masterLookup.kind, 'master', 'master lookup succeeds');
if (masterLookup.kind === 'master') {
  assert.deepEqual(masterLookup.subjects, allSubjects(), 'master sees every subject');
}

assert.equal(lookupAccess('abcdef', fixture, MASTER_PIN).kind, 'not_found', 'non-numeric pin fails closed');
assert.equal(lookupAccess('000000', fixture, MASTER_PIN).kind, 'not_found', 'unknown pin fails closed');

const piiRoster = parseRosterConfig('[{"pin":"123456","subjects":["mj1"],"name":"sample"}]');
assert.deepEqual(piiRoster, { kind: 'error', code: 'pii_field' }, 'roster rejects PII-shaped fields');

const token = createSummerToken(['mj1'], SECRET, false, Date.parse('2026-07-11T00:00:00+09:00'));
const verified = verifySummerToken(token, SECRET, Date.parse('2026-07-11T00:00:00+09:00'));
assert.ok(verified, 'signed token verifies');
assert.deepEqual(verified.subjects, ['mj1'], 'token contains assigned subject only');
assert.equal(verifySummerToken(`${token.slice(0, -1)}x`, SECRET), null, 'tampered token fails closed');
assert.equal(verifySummerToken(token, ''), null, 'empty secret fails closed');

const day1 = firstLearningDay();
assert.deepEqual(
  releaseStateFor(day1.date, new Date('2026-07-11T20:00:00+09:00'), false),
  { kind: 'locked', opensAt: '2026-07-12' },
  'first Monday is locked before Sunday release',
);
assert.deepEqual(
  releaseStateFor(day1.date, new Date('2026-07-12T00:00:00+09:00'), false),
  { kind: 'open' },
  'first Monday opens on Sunday',
);

const day3 = learningDay(3);
assert.deepEqual(
  releaseStateFor(day3.date, new Date('2026-07-15T20:59:00+09:00'), false),
  { kind: 'locked', opensAt: '2026-07-15T21:00:00+09:00' },
  'Thursday learning opens Wednesday night',
);
assert.deepEqual(
  releaseStateFor(day3.date, new Date('2026-07-15T21:00:00+09:00'), false),
  { kind: 'open' },
  'Thursday learning opens at the release window',
);

const mj1First = contentForDay('mj1', day1);
assert.equal(mj1First.kind, 'learning', 'existing mj1 content resolves as learning');
if (mj1First.kind === 'learning') {
  assert.equal(mj1First.pending, false, 'mj1 first day is ready');
  assert.ok(mj1First.resources.some((resource) => resource.kind === 'pdf'), 'mj1 first day has note');
  assert.ok(mj1First.resources.some((resource) => resource.kind === 'video'), 'mj1 first day has video');
}

const gs2First = contentForDay('gs2', day1);
assert.equal(gs2First.kind, 'learning', 'gs2 content resolves as learning');
if (gs2First.kind === 'learning') {
  assert.equal(gs2First.pending, false, 'gs2 first day is ready');
  assert.equal(gs2First.title, '선분의 내분점', 'gs2 first day uses renumbered lesson title');
  assert.ok(gs2First.resources.some((resource) => resource.kind === 'pdf'), 'gs2 first day has note');
  assert.equal(gs2First.resources.filter((resource) => resource.kind === 'video').length, 1, 'gs2 first day has one video');
  assert.ok(gs2First.resources.some((resource) => resource.label === '1강 선분의 내분점'), 'gs2 first day has renumbered lecture 1');
}

const gs2SecondDay = learningDay(2);
const gs2Second = contentForDay('gs2', gs2SecondDay);
assert.equal(gs2Second.kind, 'learning', 'gs2 second day resolves as learning');
if (gs2Second.kind === 'learning') {
  assert.equal(gs2Second.pending, false, 'gs2 second day is ready');
  assert.equal(gs2Second.resources.filter((resource) => resource.kind === 'pdf').length, 2, 'gs2 second day has two notes');
  assert.equal(gs2Second.resources.filter((resource) => resource.kind === 'video').length, 3, 'gs2 second day has three videos');
  assert.ok(gs2Second.resources.some((resource) => resource.label === '2강 직선의 방정식'), 'gs2 second day starts at lecture 2');
  assert.ok(gs2Second.resources.some((resource) => resource.label === '4강 점과 직선 사이의 거리'), 'gs2 second day ends at lecture 4');
}

const gs2ThirdDay = summerCalendar('gs2').find((candidate) => candidate.date === '2026-07-16');
assert.ok(gs2ThirdDay, 'gs2 third day exists');
const gs2Third = contentForDay('gs2', gs2ThirdDay);
assert.equal(gs2Third.kind, 'learning', 'gs2 third day resolves as learning');
if (gs2Third.kind === 'learning') {
  assert.equal(gs2Third.title, '원의 방정식과 그래프', 'gs2 third day uses planned unit title');
  assert.equal(gs2Third.pending, true, 'gs2 planned-but-not-uploaded day remains pending');
  assert.equal(gs2Third.resources.length, 0, 'gs2 planned-but-not-uploaded day has no fake links');
}

const gs2ReviewDay = summerCalendar('gs2').find((candidate) => candidate.date === '2026-07-28');
assert.ok(gs2ReviewDay, 'gs2 review day exists');
assert.equal(gs2ReviewDay.role, 'review', 'gs2 uses one midterm review day');
assert.equal(summerCalendar('gs2').find((candidate) => candidate.date === '2026-07-29')?.title, '모의중간', 'gs2 mock midterm follows review day');

const gs2TenthDay = summerCalendar('gs2').find((candidate) => candidate.learningNumber === 10);
assert.ok(gs2TenthDay, 'gs2 tenth learning day exists');
const gs2Tenth = contentForDay('gs2', gs2TenthDay);
assert.equal(gs2Tenth.kind, 'learning', 'gs2 tenth day resolves as learning');
if (gs2Tenth.kind === 'learning') {
  assert.equal(gs2Tenth.title, '명제와 조건', 'gs2 final range starts with proposition');
  assert.equal(gs2Tenth.pending, true, 'gs2 final range stays pending until assets are uploaded');
}

const gs2SixteenthDay = summerCalendar('gs2').find((candidate) => candidate.learningNumber === 16);
assert.ok(gs2SixteenthDay, 'gs2 sixteenth learning day exists');
const gs2Sixteenth = contentForDay('gs2', gs2SixteenthDay);
assert.equal(gs2Sixteenth.kind, 'learning', 'gs2 sixteenth day resolves as learning');
if (gs2Sixteenth.kind === 'learning') {
  assert.equal(gs2Sixteenth.title, '유리함수와 무리함수 활용', 'gs2 final range closes with rational and irrational functions');
  assert.equal(gs2Sixteenth.pending, true, 'gs2 final range close stays pending until assets are uploaded');
}

const ghFirst = contentForDay('gh', day1);
assert.equal(ghFirst.kind, 'learning', 'gh content resolves as learning');
if (ghFirst.kind === 'learning') {
  assert.equal(ghFirst.pending, false, 'gh first day is ready');
  assert.ok(ghFirst.resources.some((resource) => resource.kind === 'pdf'), 'gh first day has note');
  assert.ok(ghFirst.resources.some((resource) => resource.kind === 'video'), 'gh first day has video');
}

const ghSecondDay = learningDay(2);
const ghSecond = contentForDay('gh', ghSecondDay);
assert.equal(ghSecond.kind, 'learning', 'gh second day resolves as learning');
if (ghSecond.kind === 'learning') {
  assert.equal(ghSecond.pending, false, 'gh second day is ready');
  assert.equal(ghSecond.title, '타원의 방정식', 'gh second day uses ellipse lesson title');
  assert.ok(ghSecond.resources.some((resource) => resource.label === '타원 개념노트'), 'gh second day has ellipse note');
  assert.ok(ghSecond.resources.some((resource) => resource.label === '2강 타원의 방정식'), 'gh second day has ellipse video');
}

console.log('summer-5week qa checks passed');
