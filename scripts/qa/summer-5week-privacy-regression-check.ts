#!/usr/bin/env npx tsx

import { execFileSync } from 'child_process';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { parseRosterConfig } from '../../src/lib/summer-5week/roster';

const EVIDENCE_PATH = '.omo/evidence/summer-5week-assigned-subjects/task-7-privacy.txt';

function requestedCases(): readonly string[] {
  const cases: string[] = [];
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--case') {
      const value = args[index + 1];
      if (value) cases.push(value);
    }
  }
  return cases.length > 0 ? cases : ['no-pii', 'existing-student-auth', 'no-student-session', 'pii-fixture'];
}

function assertOk(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function fileIncludes(path: string, needle: string): Promise<boolean> {
  const content = await readFile(path, 'utf8');
  return content.includes(needle);
}

async function runCase(name: string): Promise<string> {
  switch (name) {
    case 'no-pii': {
      const routeHasIdentity = await fileIncludes('src/app/api/5wsummer/login/route.ts', 'profile');
      assertOk(!routeHasIdentity, 'summer API must not return profile identity');
      return 'no-pii: ok no identity fields in summer API';
    }
    case 'existing-student-auth': {
      const diff = execFileSync('git', ['diff', '--name-only', '--', 'src/app/api/public/verify-student/route.ts', 'src/utils/student-auth.ts'], { encoding: 'utf8' });
      assertOk(diff.trim() === '', 'existing student auth files should be untouched');
      return 'existing-student-auth: ok untouched';
    }
    case 'no-student-session': {
      const files = [
        'src/lib/summer-5week/auth.ts',
        'src/lib/summer-5week/server.ts',
        'src/app/api/5wsummer/login/route.ts',
        'src/app/api/5wsummer/session/route.ts',
        'src/app/api/5wsummer/logout/route.ts',
      ];
      for (const file of files) {
        assertOk(!(await fileIncludes(file, 'student_session')), `student_session found in ${file}`);
      }
      return 'no-student-session: ok summer cookie only';
    }
    case 'pii-fixture': {
      const result = parseRosterConfig('[{"pin":"100101","subjects":["mj1"],"phone":"redacted"}]');
      assertOk(result.kind === 'error' && result.code === 'pii_field', 'PII fixture should fail');
      return 'pii-fixture: ok rejected';
    }
    default:
      throw new Error(`unknown case: ${name}`);
  }
}

async function main(): Promise<void> {
  const lines: string[] = [];
  for (const testCase of requestedCases()) {
    lines.push(await runCase(testCase));
  }
  await mkdir(dirname(EVIDENCE_PATH), { recursive: true });
  await writeFile(EVIDENCE_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log(lines.join('\n'));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
