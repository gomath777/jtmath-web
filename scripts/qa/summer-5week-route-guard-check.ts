#!/usr/bin/env npx tsx

import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { contentForDay } from '../../src/lib/summer-5week/content';
import { summerCalendar } from '../../src/lib/summer-5week/schedule';

const EVIDENCE_PATH = '.omo/evidence/summer-5week-assigned-subjects/task-4-route-guards.txt';
const MASTER_PIN = process.env.SUMMER_5WEEK_MASTER_PIN ?? '999999';

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value ?? fallback;
}

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
    : ['assigned', 'master-all', 'unassigned-direct', 'bad-subject', 'logged-out-direct', 'locked-resource-redaction', 'rate-limit', 'rate-limit-cookie-bypass', 'rate-limit-logout-bypass'];
}

function assertOk(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function login(baseUrl: string, pin: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/5wsummer/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  assertOk(response.ok, `login failed with status ${response.status}`);
  const cookie = response.headers.get('set-cookie');
  assertOk(typeof cookie === 'string' && cookie.includes('summer_5week_access='), 'summer cookie missing');
  assertOk(cookie.includes('Path=/'), 'summer cookie must be available to API and pages');
  return cookie.split(';')[0] ?? '';
}

type FailedLoginResult = {
  readonly status: number;
  readonly cookie: string;
};

async function failedLogin(baseUrl: string, pin: string, cookie: string): Promise<FailedLoginResult> {
  const response = await fetch(`${baseUrl}/api/5wsummer/login`, {
    method: 'POST',
    headers: cookie ? { 'content-type': 'application/json', cookie } : { 'content-type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const setCookie = response.headers.get('set-cookie');
  return { status: response.status, cookie: setCookie?.split(';')[0] ?? cookie };
}

async function logout(baseUrl: string): Promise<number> {
  const response = await fetch(`${baseUrl}/api/5wsummer/logout`, { method: 'POST' });
  return response.status;
}

async function getText(url: string, cookie?: string): Promise<{ readonly status: number; readonly text: string }> {
  const response = await fetch(url, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  });
  return { status: response.status, text: await response.text() };
}

async function runCase(baseUrl: string, name: string): Promise<string> {
  switch (name) {
    case 'assigned': {
      const cookie = await login(baseUrl, '100101');
      const page = await getText(`${baseUrl}/5wsummer/mj1`, cookie);
      assertOk(page.status === 200 && page.text.includes('미적분 I') && page.text.includes('학습 달력'), 'assigned subject should render');
      return 'assigned: ok rendered';
    }
    case 'master-all': {
      const cookie = await login(baseUrl, MASTER_PIN);
      const session = await getText(`${baseUrl}/api/5wsummer/session`, cookie);
      assertOk(session.status === 200 && session.text.includes('"master":true'), 'master session missing');
      const page = await getText(`${baseUrl}/5wsummer/gh`, cookie);
      assertOk(page.status === 200 && page.text.includes('기하') && page.text.includes('학습 달력'), 'master should open all subjects');
      return 'master-all: ok subjects=5';
    }
    case 'unassigned-direct': {
      const cookie = await login(baseUrl, '100101');
      const page = await getText(`${baseUrl}/5wsummer/ds`, cookie);
      assertOk(page.status === 307 || page.status === 308, 'unassigned subject should redirect to chooser');
      return 'unassigned-direct: ok redirected';
    }
    case 'bad-subject': {
      const page = await getText(`${baseUrl}/5wsummer/bad-subject`);
      assertOk(page.status === 404, 'bad subject should 404');
      return 'bad-subject: ok 404';
    }
    case 'logged-out-direct': {
      const page = await getText(`${baseUrl}/5wsummer/mj1`);
      assertOk(page.status === 307 || page.status === 308, 'logged-out direct should redirect');
      return 'logged-out-direct: ok redirect';
    }
    case 'rate-limit': {
      const statuses: number[] = [];
      let attemptCookie = '';
      for (let attempt = 0; attempt < 9; attempt += 1) {
        const result = await failedLogin(baseUrl, '000000', attemptCookie);
        statuses.push(result.status);
        attemptCookie = result.cookie;
      }
      assertOk(statuses.slice(0, 8).every((status) => status === 401), 'first eight failed logins should be rejected normally');
      assertOk(statuses[8] === 429, 'ninth failed login should be rate limited');
      return 'rate-limit: ok ninth failure returned 429';
    }
    case 'rate-limit-cookie-bypass': {
      const status = await failedLogin(baseUrl, '000000', '');
      assertOk(status.status === 429, 'server-side attempt counter should survive missing attempt cookie');
      return 'rate-limit-cookie-bypass: ok missing cookie still returned 429';
    }
    case 'rate-limit-logout-bypass': {
      const logoutStatus = await logout(baseUrl);
      assertOk(logoutStatus === 200, 'logout endpoint should respond');
      const status = await failedLogin(baseUrl, '000000', '');
      assertOk(status.status === 429, 'server-side attempt counter should survive logout');
      return 'rate-limit-logout-bypass: ok logout did not reset 429';
    }
    case 'locked-resource-redaction': {
      const lockedDay = summerCalendar().find((day) => day.learningNumber === 5);
      assertOk(lockedDay !== undefined, 'locked resource redaction needs day 5');
      const content = contentForDay('mj1', lockedDay);
      assertOk(content.kind === 'learning' && content.resources.length > 0, 'day 5 should have resources in source data');
      const cookie = await login(baseUrl, '100101');
      const page = await getText(`${baseUrl}/5wsummer/mj1`, cookie);
      for (const resource of content.resources) {
        assertOk(!page.text.includes(resource.href), `locked resource leaked: ${resource.href}`);
      }
      return 'locked-resource-redaction: ok future links omitted from html';
    }
    default:
      throw new Error(`unknown case: ${name}`);
  }
}

async function main(): Promise<void> {
  const baseUrl = argValue('--base-url', 'http://127.0.0.1:3105');
  const lines: string[] = [];
  for (const testCase of requestedCases()) {
    lines.push(await runCase(baseUrl, testCase));
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
