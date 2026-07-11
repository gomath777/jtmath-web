import { createHmac, timingSafeEqual } from 'crypto';
import { allSubjects, isSummerSubject, sortSubjects, type SummerSubject } from './subjects';

export type SummerSession = {
  readonly subjects: readonly SummerSubject[];
  readonly exp: number;
  readonly master: boolean;
};

export const SUMMER_COOKIE_NAME = 'summer_5week_access';
export const SUMMER_COOKIE_MAX_AGE = 60 * 60 * 24 * 45;

type TokenPayload = {
  readonly subjects: readonly SummerSubject[];
  readonly exp: number;
  readonly master: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

function parsePayload(value: unknown): TokenPayload | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.subjects)) return null;
  if (typeof value.exp !== 'number' || !Number.isInteger(value.exp)) return null;
  if (typeof value.master !== 'boolean') return null;

  const subjects: SummerSubject[] = [];
  for (const subject of value.subjects) {
    if (typeof subject !== 'string' || !isSummerSubject(subject)) return null;
    subjects.push(subject);
  }
  const sortedSubjects = sortSubjects(Array.from(new Set(subjects)));
  if (sortedSubjects.length === 0) return null;

  return {
    subjects: value.master ? allSubjects() : sortedSubjects,
    exp: value.exp,
    master: value.master,
  };
}

export function createSummerToken(
  subjects: readonly SummerSubject[],
  secret: string,
  master: boolean,
  nowMs = Date.now(),
): string {
  const payload: TokenPayload = {
    subjects: master ? allSubjects() : sortSubjects(subjects),
    exp: Math.floor(nowMs / 1000) + SUMMER_COOKIE_MAX_AGE,
    master,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifySummerToken(token: string, secret: string, nowMs = Date.now()): SummerSession | null {
  const [encodedPayload, signature, extra] = token.split('.');
  if (!encodedPayload || !signature || extra !== undefined) return null;

  const expected = signPayload(encodedPayload, secret);
  if (!signaturesMatch(expected, signature)) return null;

  const decoded = decodeBase64Url(encodedPayload);
  if (!decoded) return null;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(decoded);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }

  const payload = parsePayload(parsedJson);
  if (!payload) return null;
  if (payload.exp < Math.floor(nowMs / 1000)) return null;
  return payload;
}
