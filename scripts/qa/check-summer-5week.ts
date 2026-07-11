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
  assert.equal(gs2First.pending, true, 'gs2 is allowed to show pending resources');
}

const ghFirst = contentForDay('gh', day1);
assert.equal(ghFirst.kind, 'learning', 'gh content resolves as learning');
if (ghFirst.kind === 'learning') {
  assert.equal(ghFirst.pending, false, 'gh first day is ready');
  assert.ok(ghFirst.resources.some((resource) => resource.kind === 'pdf'), 'gh first day has note');
  assert.ok(ghFirst.resources.some((resource) => resource.kind === 'video'), 'gh first day has video');
}

console.log('summer-5week qa checks passed');
