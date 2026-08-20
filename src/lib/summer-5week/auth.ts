import { createHmac, timingSafeEqual } from 'crypto';
import { allSubjects, isSummerSubject, sortSubjects, type SummerSubject } from './subjects';

export type SummerAccessThrough = Readonly<Partial<Record<SummerSubject, string>>>;
type MutableSummerAccessThrough = Partial<Record<SummerSubject, string>>;

export type SummerSession = {
  readonly subjects: readonly SummerSubject[];
  readonly accessThrough: SummerAccessThrough;
  readonly exp: number;
  readonly master: boolean;
};

export const SUMMER_COOKIE_NAME = 'summer_5week_access';
export const SUMMER_COOKIE_MAX_AGE = 60 * 60 * 24 * 45;
export const DEFAULT_SUMMER_ACCESS_POLICY_VERSION = 'summer-5week-policy-default';

type TokenPayload = {
  readonly v: 2;
  readonly subjects: readonly SummerSubject[];
  readonly accessThrough: SummerAccessThrough;
  readonly exp: number;
  readonly master: boolean;
  readonly apv: string;
};

export type CreateSummerTokenOptions = {
  readonly accessThrough?: SummerAccessThrough;
  readonly accessPolicyVersion?: string;
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

function policyVersionFromConfig(): string {
  const configured = process.env.SUMMER_5WEEK_ACCESS_POLICY_VERSION?.trim();
  return configured ? configured : DEFAULT_SUMMER_ACCESS_POLICY_VERSION;
}

function parseSubjects(value: unknown): readonly SummerSubject[] | null {
  if (!Array.isArray(value)) return null;
  const subjects: SummerSubject[] = [];
  for (const subject of value) {
    if (typeof subject !== 'string' || !isSummerSubject(subject)) return null;
    subjects.push(subject);
  }
  const sortedSubjects = sortSubjects(Array.from(new Set(subjects)));
  return sortedSubjects.length > 0 ? sortedSubjects : null;
}

const ACCESS_THROUGH_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseAccessThrough(value: unknown, subjects: readonly SummerSubject[]): SummerAccessThrough | null {
  if (!isRecord(value)) return null;

  const allowedSubjects = new Set(subjects);
  const accessThrough: MutableSummerAccessThrough = {};
  for (const [subject, cutoff] of Object.entries(value)) {
    if (!isSummerSubject(subject) || !allowedSubjects.has(subject)) return null;
    if (typeof cutoff !== 'string' || !ACCESS_THROUGH_PATTERN.test(cutoff)) return null;
    accessThrough[subject] = cutoff;
  }
  return accessThrough;
}

export function normalizeSummerAccessThrough(value: unknown, subjects: readonly SummerSubject[]): SummerAccessThrough {
  const parsed = parseAccessThrough(value, subjects);
  return parsed ?? {};
}

function parsePayload(value: unknown, expectedAccessPolicyVersion: string): SummerSession | null {
  if (!isRecord(value)) return null;
  if (typeof value.exp !== 'number' || !Number.isInteger(value.exp)) return null;
  if (typeof value.master !== 'boolean') return null;

  const sortedSubjects = parseSubjects(value.subjects);
  if (!sortedSubjects) return null;

  if (value.master) {
    return {
      subjects: allSubjects(),
      accessThrough: {},
      exp: value.exp,
      master: true,
    };
  }

  if (value.v !== 2) return null;
  if (typeof value.apv !== 'string' || value.apv !== expectedAccessPolicyVersion) return null;
  const accessThrough = parseAccessThrough(value.accessThrough, sortedSubjects);
  if (!accessThrough) return null;

  return {
    subjects: sortedSubjects,
    accessThrough,
    exp: value.exp,
    master: false,
  };
}

export function createSummerToken(
  subjects: readonly SummerSubject[],
  secret: string,
  master: boolean,
  nowMs = Date.now(),
  options: CreateSummerTokenOptions = {},
): string {
  const tokenSubjects = master ? allSubjects() : sortSubjects(subjects);
  const payload: TokenPayload = {
    v: 2,
    subjects: tokenSubjects,
    accessThrough: master ? {} : normalizeSummerAccessThrough(options.accessThrough ?? {}, tokenSubjects),
    exp: Math.floor(nowMs / 1000) + SUMMER_COOKIE_MAX_AGE,
    master,
    apv: options.accessPolicyVersion ?? policyVersionFromConfig(),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifySummerToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
  expectedAccessPolicyVersion = policyVersionFromConfig(),
): SummerSession | null {
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

  const payload = parsePayload(parsedJson, expectedAccessPolicyVersion);
  if (!payload) return null;
  if (payload.exp < Math.floor(nowMs / 1000)) return null;
  return payload;
}
