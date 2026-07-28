import { createHmac } from 'crypto';
import { SUMMER_COOKIE_NAME } from '../../src/lib/summer-5week/auth';
import { contentForDay } from '../../src/lib/summer-5week/content';
import { summerCalendar } from '../../src/lib/summer-5week/schedule';
import type { SummerSubject } from '../../src/lib/summer-5week/subjects';

export const EVIDENCE_PATH = '.omo/evidence/summer-refund-cutoff-access/task-4-route-guards.txt';
export const MASTER_PIN = process.env.SUMMER_5WEEK_MASTER_PIN ?? '999999';
export const COOKIE_SECRET = process.env.SUMMER_5WEEK_COOKIE_SECRET ?? 'test-secret';
export const POLICY_VERSION = process.env.SUMMER_5WEEK_ACCESS_POLICY_VERSION ?? 'test-v2';
export const CUTOFF_PIN = '100101';
export const ACTIVE_PIN = '110202';
export const MULTI_PIN = '120303';
export const CUTOFF_DATE = '2026-07-28';

const DEFAULT_CASES = [
  'assigned',
  'master-all',
  'unassigned-direct',
  'bad-subject',
  'logged-out-direct',
  'locked-resource-redaction',
  'cutoff-prior-visible',
  'cutoff-later-redacted',
  'cutoff-subject-still-renders',
  'no-cutoff-active-still-sees-later-resource',
  'multi-subject-cutoff-is-subject-scoped',
  'old-token-relogin-required',
  'rate-limit',
  'rate-limit-cookie-bypass',
  'rate-limit-logout-bypass',
] as const;

type FailedLoginResult = {
  readonly status: number;
  readonly cookie: string;
};

export type TextResponse = {
  readonly status: number;
  readonly text: string;
};

export type TokenPayload = {
  readonly subjects: readonly SummerSubject[];
  readonly exp: number;
  readonly master: boolean;
  readonly v?: 2;
  readonly accessThrough?: Readonly<Partial<Record<SummerSubject, string>>>;
  readonly apv?: string;
};

export function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value ?? fallback;
}

export function requestedCases(): readonly string[] {
  const cases: string[] = [];
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--case') {
      const value = args[index + 1];
      if (value) cases.push(value);
    }
  }
  return cases.length > 0 ? cases : DEFAULT_CASES;
}

export function assertOk(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function qaNow(): Date {
  const configured = process.env.SUMMER_5WEEK_NOW;
  if (!configured) return new Date();
  const parsed = new Date(configured);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function signPayload(payload: string): string {
  return createHmac('sha256', COOKIE_SECRET).update(payload).digest('base64url');
}

export function signedCookie(payload: TokenPayload): string {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${SUMMER_COOKIE_NAME}=${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function futureExp(): number {
  return Math.floor(Date.now() / 1000) + 60 * 60;
}

export function resourceHrefsAfter(subject: SummerSubject, cutoff: string): readonly string[] {
  const hrefs: string[] = [];
  for (const day of summerCalendar(subject)) {
    if (day.date <= cutoff) continue;
    const content = contentForDay(subject, day);
    if (content.kind !== 'learning') continue;
    for (const resource of content.resources) {
      hrefs.push(resource.href);
    }
  }
  return hrefs;
}

export function firstResourceHrefThrough(subject: SummerSubject, cutoff: string): string {
  for (const day of summerCalendar(subject)) {
    if (day.date > cutoff) continue;
    const content = contentForDay(subject, day);
    if (content.kind === 'learning' && content.resources[0]) {
      return content.resources[0].href;
    }
  }
  throw new Error(`no pre-cutoff resource found for ${subject}`);
}

export function firstResourceHrefAfter(subject: SummerSubject, cutoff: string): string {
  const [href] = resourceHrefsAfter(subject, cutoff);
  if (!href) throw new Error(`no post-cutoff resource found for ${subject}`);
  return href;
}

export function assertNoHrefs(text: string, hrefs: readonly string[], label: string): void {
  assertOk(hrefs.length > 0, `${label} needs at least one source href`);
  const leaked = hrefs.filter((href) => text.includes(href));
  assertOk(leaked.length === 0, `${label} leaked ${leaked.length} post-cutoff href(s)`);
}

export function qaServerCommand(baseUrl: string): string {
  const port = new URL(baseUrl).port || '3105';
  const clock = process.env.SUMMER_5WEEK_NOW ?? '2026-08-16T12:00:00+09:00';
  return [
    'SUMMER_5WEEK_ACCESS_ROSTER=\'[',
    '{"pin":"100101","subjects":["mj1"],"accessThrough":{"mj1":"2026-07-28"}},',
    '{"pin":"110202","subjects":["gs1"]},',
    '{"pin":"120303","subjects":["gs2","gh"],"accessThrough":{"gs2":"2026-07-28"}}',
    ']\'',
    'SUMMER_5WEEK_MASTER_PIN=999999',
    'SUMMER_5WEEK_COOKIE_SECRET=test-secret',
    'SUMMER_5WEEK_ACCESS_POLICY_VERSION=test-v2',
    `SUMMER_5WEEK_NOW=${clock}`,
    `npm run dev -- -p ${port}`,
  ].join(' ');
}

export async function login(baseUrl: string, pin: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/5wsummer/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  assertOk(response.ok, `login failed with status ${response.status}`);
  const cookie = response.headers.get('set-cookie');
  assertOk(typeof cookie === 'string' && cookie.includes(`${SUMMER_COOKIE_NAME}=`), 'summer cookie missing');
  assertOk(cookie.includes('Path=/'), 'summer cookie must be available to API and pages');
  return cookie.split(';')[0] ?? '';
}

export async function failedLogin(baseUrl: string, pin: string, cookie: string): Promise<FailedLoginResult> {
  const response = await fetch(`${baseUrl}/api/5wsummer/login`, {
    method: 'POST',
    headers: cookie ? { 'content-type': 'application/json', cookie } : { 'content-type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const setCookie = response.headers.get('set-cookie');
  return { status: response.status, cookie: setCookie?.split(';')[0] ?? cookie };
}

export async function logout(baseUrl: string): Promise<number> {
  const response = await fetch(`${baseUrl}/api/5wsummer/logout`, { method: 'POST' });
  return response.status;
}

export async function getText(url: string, cookie?: string): Promise<TextResponse> {
  const response = await fetch(url, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  });
  return { status: response.status, text: await response.text() };
}

export async function exhaustRateLimit(baseUrl: string): Promise<void> {
  let attemptCookie = '';
  for (let attempt = 0; attempt < 9; attempt += 1) {
    const result = await failedLogin(baseUrl, '000000', attemptCookie);
    attemptCookie = result.cookie;
    if (result.status === 429) return;
  }
  throw new Error('rate limit was not reached during setup');
}
