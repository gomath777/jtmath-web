#!/usr/bin/env npx tsx

import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { createSummerToken, verifySummerToken } from '../../src/lib/summer-5week/auth';
import { fixtureRosterConfig, lookupAccess } from '../../src/lib/summer-5week/roster';

const EVIDENCE_PATH = '.omo/evidence/summer-refund-cutoff-access/task-2-auth-existing.txt';
const SECRET = 'qa-secret';
const MASTER_PIN = process.env.SUMMER_5WEEK_MASTER_PIN ?? '999999';

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
    : ['one-subject', 'two-subject', 'duplicate-union', 'master', 'malformed', 'unknown', 'tampered-cookie', 'empty-secret'];
}

function assertOk(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function runCase(name: string): string {
  const roster = fixtureRosterConfig();
  switch (name) {
    case 'one-subject': {
      const access = lookupAccess('100101', roster, null);
      assertOk(access.kind === 'student' && access.subjects.length === 1, 'expected one subject');
      if (access.kind !== 'student') return 'one-subject: failed';
      const token = createSummerToken(access.subjects, SECRET, false, 1_785_600_000_000, {
        accessThrough: { mj1: '2026-07-28' },
        accessPolicyVersion: 'qa-v2',
      });
      const session = verifySummerToken(token, SECRET, 1_785_600_000_000, 'qa-v2');
      assertOk(session?.subjects.length === 1 && !session.master, 'one-subject token failed');
      assertOk(session.accessThrough.mj1 === '2026-07-28', 'one-subject token accessThrough failed');
      return 'one-subject: ok subjects=1 cookie=verified accessThrough=round-tripped';
    }
    case 'two-subject': {
      const access = lookupAccess('120303', roster, null);
      assertOk(access.kind === 'student' && access.subjects.length === 2, 'expected two subjects');
      return 'two-subject: ok subjects=2';
    }
    case 'duplicate-union': {
      const access = lookupAccess('110202', roster, null);
      assertOk(access.kind === 'student' && access.subjects.length === 2, 'expected duplicate union');
      return 'duplicate-union: ok subjects=2';
    }
    case 'master': {
      const access = lookupAccess(MASTER_PIN, roster, MASTER_PIN);
      assertOk(access.kind === 'master' && access.subjects.length === 5, 'expected master all subjects');
      const token = createSummerToken(access.subjects, SECRET, true, 1_785_600_000_000);
      const session = verifySummerToken(token, SECRET, 1_785_600_000_000);
      assertOk(session?.master === true && session.subjects.length === 5, 'master token failed');
      return 'master: ok subjects=5';
    }
    case 'malformed': {
      const access = lookupAccess('abc123', roster, null);
      assertOk(access.kind === 'not_found', 'malformed PIN should not resolve');
      return 'malformed: ok rejected';
    }
    case 'unknown': {
      const access = lookupAccess('999999', roster, null);
      assertOk(access.kind === 'not_found', 'unknown PIN should not resolve');
      return 'unknown: ok rejected';
    }
    case 'tampered-cookie': {
      const token = createSummerToken(['mj1'], SECRET, false, 1_785_600_000_000);
      const session = verifySummerToken(`${token}x`, SECRET, 1_785_600_000_000);
      assertOk(session === null, 'tampered token should fail');
      return 'tampered-cookie: ok rejected';
    }
    case 'empty-secret': {
      const token = createSummerToken(['mj1'], SECRET, false, 1_785_600_000_000);
      const session = verifySummerToken(token, '', 1_785_600_000_000);
      assertOk(session === null, 'token should fail with empty secret');
      return 'empty-secret: ok rejected';
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
