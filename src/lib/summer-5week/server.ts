import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  createSummerToken,
  SUMMER_COOKIE_MAX_AGE,
  SUMMER_COOKIE_NAME,
  verifySummerToken,
  type SummerSession,
} from './auth';
import {
  fixtureRosterConfig,
  lookupAccess,
  parseRosterConfigs,
  type AccessLookup,
  type ParsedRoster,
} from './roster';

export type LoginResult =
  | { readonly kind: 'ok'; readonly session: SummerSession }
  | { readonly kind: 'format' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'config' }
  | { readonly kind: 'rate_limited' };

const PIN_PATTERN = /^\d{6}$/;
const ATTEMPT_COOKIE_NAME = 'summer_5week_attempts';
const ATTEMPT_WINDOW_SECONDS = 10 * 60;
const ATTEMPT_LIMIT = 8;
const SERVER_ATTEMPTS = new Map<string, AttemptState>();
const ROSTER_ENV_KEY = 'SUMMER_5WEEK_ACCESS_ROSTER';
const ROSTER_EXTRA_ENV_PREFIX = 'SUMMER_5WEEK_ACCESS_ROSTER_EXTRA';

type AttemptState = {
  readonly count: number;
  readonly resetAt: number;
};

function assertNever(value: never): never {
  throw new Error(`Unhandled summer access result: ${String(value)}`);
}

function cookieSecret(): string | null {
  const configured = process.env.SUMMER_5WEEK_COOKIE_SECRET || process.env.STUDENT_TOKEN_SECRET;
  return configured || null;
}

function signAttemptPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  return aBytes.length === bBytes.length && timingSafeEqual(aBytes, bBytes);
}

function parseAttemptCookie(value: string | undefined, secret: string, nowSeconds: number): AttemptState {
  if (!value) return { count: 0, resetAt: nowSeconds + ATTEMPT_WINDOW_SECONDS };
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra !== undefined) {
    return { count: 0, resetAt: nowSeconds + ATTEMPT_WINDOW_SECONDS };
  }

  const expected = signAttemptPayload(payload, secret);
  if (!safeEqual(expected, signature)) return { count: 0, resetAt: nowSeconds + ATTEMPT_WINDOW_SECONDS };

  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
      return { count: 0, resetAt: nowSeconds + ATTEMPT_WINDOW_SECONDS };
    }
    const count = 'count' in decoded ? decoded.count : null;
    const resetAt = 'resetAt' in decoded ? decoded.resetAt : null;
    if (typeof count !== 'number' || typeof resetAt !== 'number') {
      return { count: 0, resetAt: nowSeconds + ATTEMPT_WINDOW_SECONDS };
    }
    if (!Number.isInteger(count) || !Number.isInteger(resetAt) || resetAt <= nowSeconds) {
      return { count: 0, resetAt: nowSeconds + ATTEMPT_WINDOW_SECONDS };
    }
    return { count, resetAt };
  } catch (error) {
    if (error instanceof SyntaxError) return { count: 0, resetAt: nowSeconds + ATTEMPT_WINDOW_SECONDS };
    throw error;
  }
}

function serializeAttemptCookie(state: AttemptState, secret: string): string {
  const payload = Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
  return `${payload}.${signAttemptPayload(payload, secret)}`;
}

async function serverAttemptKey(secret: string): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const realIp = headerStore.get('x-real-ip')?.trim() ?? '';
  const userAgent = headerStore.get('user-agent')?.trim() ?? '';
  const source = `${forwardedFor || realIp || 'local'}:${userAgent}`;
  return signAttemptPayload(source, secret);
}

function readServerAttempts(key: string, nowSeconds: number): AttemptState {
  const stored = SERVER_ATTEMPTS.get(key);
  if (!stored || stored.resetAt <= nowSeconds) {
    SERVER_ATTEMPTS.delete(key);
    return { count: 0, resetAt: nowSeconds + ATTEMPT_WINDOW_SECONDS };
  }
  return stored;
}

function mergedAttempts(cookieAttempts: AttemptState, serverAttempts: AttemptState): AttemptState {
  return {
    count: Math.max(cookieAttempts.count, serverAttempts.count),
    resetAt: Math.max(cookieAttempts.resetAt, serverAttempts.resetAt),
  };
}

function masterPin(): string | null {
  const configured = process.env.SUMMER_5WEEK_MASTER_PIN;
  if (configured && PIN_PATTERN.test(configured)) return configured;
  return null;
}

export function configuredRoster(): ParsedRoster {
  const rawValues = Object.entries(process.env)
    .filter(([key, value]) => (key === ROSTER_ENV_KEY || key.startsWith(ROSTER_EXTRA_ENV_PREFIX)) && Boolean(value))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([, value]) => value ?? '');
  if (rawValues.length > 0) return parseRosterConfigs(rawValues);
  if (process.env.SUMMER_5WEEK_USE_FIXTURE_ROSTER === '1') return fixtureRosterConfig();
  return { kind: 'error', code: 'empty' };
}

function accessToLoginResult(access: AccessLookup): LoginResult {
  switch (access.kind) {
    case 'student':
      return {
        kind: 'ok',
        session: {
          subjects: access.subjects,
          accessThrough: access.accessThrough,
          exp: Math.floor(Date.now() / 1000) + SUMMER_COOKIE_MAX_AGE,
          master: false,
        },
      };
    case 'master':
      return {
        kind: 'ok',
        session: {
          subjects: access.subjects,
          accessThrough: {},
          exp: Math.floor(Date.now() / 1000) + SUMMER_COOKIE_MAX_AGE,
          master: true,
        },
      };
    case 'config_error':
      return { kind: 'config' };
    case 'not_found':
      return { kind: 'invalid' };
    default:
      return assertNever(access);
  }
}

export function resolveSummerLogin(pin: string): LoginResult {
  const normalized = pin.trim();
  if (!PIN_PATTERN.test(normalized)) return { kind: 'format' };
  return accessToLoginResult(lookupAccess(normalized, configuredRoster(), masterPin()));
}

export async function setSummerCookie(session: SummerSession): Promise<void> {
  const cookieStore = await cookies();
  const secret = cookieSecret();
  if (!secret) return;
  cookieStore.set(
    SUMMER_COOKIE_NAME,
    createSummerToken(session.subjects, secret, session.master, Date.now(), {
      accessThrough: session.accessThrough,
    }),
    {
      httpOnly: true,
      maxAge: SUMMER_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  );
  cookieStore.set(ATTEMPT_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function clearSummerCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SUMMER_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function readSummerSession(): Promise<SummerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUMMER_COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = cookieSecret();
  return secret ? verifySummerToken(token, secret) : null;
}

export async function requireSummerSession(): Promise<SummerSession> {
  const session = await readSummerSession();
  if (!session) redirect('/5wsummer');
  return session;
}

export async function loginAndSetCookie(pin: string): Promise<LoginResult> {
  const secret = cookieSecret();
  if (!secret) return { kind: 'config' };
  const cookieStore = await cookies();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const attemptKey = await serverAttemptKey(secret);
  const attempts = mergedAttempts(
    parseAttemptCookie(cookieStore.get(ATTEMPT_COOKIE_NAME)?.value, secret, nowSeconds),
    readServerAttempts(attemptKey, nowSeconds),
  );
  if (attempts.count >= ATTEMPT_LIMIT) return { kind: 'rate_limited' };

  const result = resolveSummerLogin(pin);
  if (result.kind === 'ok') {
    SERVER_ATTEMPTS.delete(attemptKey);
    await setSummerCookie(result.session);
    return result;
  }
  if (result.kind === 'format' || result.kind === 'invalid') {
    const nextAttempts = { count: attempts.count + 1, resetAt: attempts.resetAt };
    SERVER_ATTEMPTS.set(attemptKey, nextAttempts);
    cookieStore.set(ATTEMPT_COOKIE_NAME, serializeAttemptCookie(nextAttempts, secret), {
      httpOnly: true,
      maxAge: Math.max(1, attempts.resetAt - nowSeconds),
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return result;
}
