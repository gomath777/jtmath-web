import { allSubjects, isSummerSubject, sortSubjects, type SummerSubject } from './subjects';
import { summerCalendar } from './schedule';

export type RosterEntry = {
  readonly pin: string;
  readonly subjects: readonly SummerSubject[];
  readonly accessThrough?: RosterAccessThrough;
};

export type RosterAccessThrough = Readonly<Partial<Record<SummerSubject, string>>>;
type MutableRosterAccessThrough = Partial<Record<SummerSubject, string>>;

export type ParsedRoster =
  | { readonly kind: 'ok'; readonly entries: readonly RosterEntry[] }
  | { readonly kind: 'error'; readonly code: RosterErrorCode };

export type RosterErrorCode =
  | 'empty'
  | 'malformed'
  | 'invalid_pin'
  | 'unknown_subject'
  | 'pii_field';

export type AccessLookup =
  | { readonly kind: 'student'; readonly subjects: readonly SummerSubject[]; readonly accessThrough: RosterAccessThrough }
  | { readonly kind: 'master'; readonly subjects: readonly SummerSubject[]; readonly accessThrough: RosterAccessThrough }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'config_error'; readonly code: RosterErrorCode };

const PIN_PATTERN = /^\d{6}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FORBIDDEN_KEYS = new Set([
  'name',
  'phone',
  'birthdate',
  'birth_date',
  'email',
  'school',
  'studentid',
  'student_id',
  'slug',
  'portalslug',
  'portal_slug',
  'profileid',
  'profile_id',
]);

export const SANITIZED_ROSTER_FIXTURE = [
  { pin: '100101', subjects: ['mj1'] },
  { pin: '110202', subjects: ['gs1'] },
  { pin: '110202', subjects: ['ds'] },
  { pin: '120303', subjects: ['gs2', 'gh'] },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => hasForbiddenKey(item));
  if (!isRecord(value)) return false;

  return Object.entries(value).some(([key, nested]) => {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) return true;
    return hasForbiddenKey(nested);
  });
}

function parseSubjects(value: unknown): readonly SummerSubject[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: SummerSubject[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !isSummerSubject(item)) return null;
    parsed.push(item);
  }
  return parsed.length > 0 ? sortSubjects(Array.from(new Set(parsed))) : null;
}

type AccessThroughParse =
  | { readonly kind: 'ok'; readonly accessThrough: RosterAccessThrough | undefined }
  | { readonly kind: 'error'; readonly code: Extract<RosterErrorCode, 'malformed' | 'unknown_subject'> };

function isCourseDate(subject: SummerSubject, date: string): boolean {
  return DATE_PATTERN.test(date) && summerCalendar(subject).some((day) => day.date === date);
}

function parseAccessThrough(value: unknown, subjects: readonly SummerSubject[]): AccessThroughParse {
  if (value === undefined) return { kind: 'ok', accessThrough: undefined };
  if (!isRecord(value)) return { kind: 'error', code: 'malformed' };

  const accessThrough: MutableRosterAccessThrough = {};
  for (const [key, cutoff] of Object.entries(value)) {
    if (!isSummerSubject(key) || !subjects.includes(key)) {
      return { kind: 'error', code: 'unknown_subject' };
    }
    if (typeof cutoff !== 'string' || !isCourseDate(key, cutoff)) {
      return { kind: 'error', code: 'malformed' };
    }
    accessThrough[key] = cutoff;
  }
  return { kind: 'ok', accessThrough };
}

function parseJsonRoster(raw: string): ParsedRoster {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) return { kind: 'error', code: 'malformed' };
    throw error;
  }

  if (hasForbiddenKey(decoded)) return { kind: 'error', code: 'pii_field' };
  if (!Array.isArray(decoded)) return { kind: 'error', code: 'malformed' };

  const entries: RosterEntry[] = [];
  for (const row of decoded) {
    if (!isRecord(row)) return { kind: 'error', code: 'malformed' };
    const pin = row.pin;
    if (typeof pin !== 'string' || !PIN_PATTERN.test(pin)) {
      return { kind: 'error', code: 'invalid_pin' };
    }
    const subjects = parseSubjects(row.subjects);
    if (!subjects) return { kind: 'error', code: 'unknown_subject' };
    const parsedAccessThrough = parseAccessThrough(row.accessThrough, subjects);
    if (parsedAccessThrough.kind === 'error') {
      return { kind: 'error', code: parsedAccessThrough.code };
    }
    entries.push(
      parsedAccessThrough.accessThrough
        ? { pin, subjects, accessThrough: parsedAccessThrough.accessThrough }
        : { pin, subjects },
    );
  }

  return entries.length > 0 ? mergeDuplicatePins(entries) : { kind: 'error', code: 'empty' };
}

function parseLineRoster(raw: string): ParsedRoster {
  const lines = raw.split(/\r?\n|;/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { kind: 'error', code: 'empty' };

  const entries: RosterEntry[] = [];
  for (const line of lines) {
    const [pinPart, subjectPart, extra] = line.split(':');
    if (extra !== undefined || !pinPart || !subjectPart) {
      return { kind: 'error', code: 'malformed' };
    }
    const pin = pinPart.trim();
    if (!PIN_PATTERN.test(pin)) return { kind: 'error', code: 'invalid_pin' };

    const subjects = subjectPart.split(',').map((subject) => subject.trim());
    const parsed = parseSubjects(subjects);
    if (!parsed) return { kind: 'error', code: 'unknown_subject' };
    entries.push({ pin, subjects: parsed });
  }

  return mergeDuplicatePins(entries);
}

export function parseRosterConfig(raw: string): ParsedRoster {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'error', code: 'empty' };
  if (trimmed.startsWith('[')) return parseJsonRoster(trimmed);
  return parseLineRoster(trimmed);
}

export function parseRosterConfigs(rawValues: readonly string[]): ParsedRoster {
  const entries: RosterEntry[] = [];
  for (const rawValue of rawValues) {
    if (!rawValue.trim()) continue;
    const parsed = parseRosterConfig(rawValue);
    if (parsed.kind === 'error') return parsed;
    entries.push(...parsed.entries);
  }
  return mergeDuplicatePins(entries);
}

export function mergeDuplicatePins(entries: readonly RosterEntry[]): ParsedRoster {
  const byPin = new Map<string, { readonly subjects: Set<SummerSubject>; readonly accessThrough: Map<SummerSubject, string> }>();
  for (const entry of entries) {
    if (!PIN_PATTERN.test(entry.pin)) return { kind: 'error', code: 'invalid_pin' };
    if (entry.subjects.length === 0) return { kind: 'error', code: 'unknown_subject' };
    const existing = byPin.get(entry.pin) ?? {
      subjects: new Set<SummerSubject>(),
      accessThrough: new Map<SummerSubject, string>(),
    };
    for (const subject of entry.subjects) {
      existing.subjects.add(subject);
    }
    for (const [key, cutoff] of Object.entries(entry.accessThrough ?? {})) {
      if (!isSummerSubject(key) || !entry.subjects.includes(key)) {
        return { kind: 'error', code: 'unknown_subject' };
      }
      if (!isCourseDate(key, cutoff)) return { kind: 'error', code: 'malformed' };
      const existingCutoff = existing.accessThrough.get(key);
      if (!existingCutoff || cutoff < existingCutoff) {
        existing.accessThrough.set(key, cutoff);
      }
    }
    byPin.set(entry.pin, existing);
  }

  const merged = Array.from(byPin.entries()).map(([pin, entry]) => {
    const subjects = sortSubjects(Array.from(entry.subjects));
    const accessThrough: MutableRosterAccessThrough = {};
    for (const subject of subjects) {
      const cutoff = entry.accessThrough.get(subject);
      if (cutoff) accessThrough[subject] = cutoff;
    }
    return Object.keys(accessThrough).length > 0
      ? { pin, subjects, accessThrough }
      : { pin, subjects };
  });
  return merged.length > 0 ? { kind: 'ok', entries: merged } : { kind: 'error', code: 'empty' };
}

export function lookupAccess(
  pin: string,
  roster: ParsedRoster,
  masterPin: string | null,
): AccessLookup {
  if (!PIN_PATTERN.test(pin)) return { kind: 'not_found' };
  if (masterPin && pin === masterPin) {
    return { kind: 'master', subjects: allSubjects(), accessThrough: {} };
  }
  if (roster.kind === 'error') return { kind: 'config_error', code: roster.code };

  const entry = roster.entries.find((candidate) => candidate.pin === pin);
  return entry
    ? { kind: 'student', subjects: entry.subjects, accessThrough: entry.accessThrough ?? {} }
    : { kind: 'not_found' };
}

export function fixtureRosterConfig(): ParsedRoster {
  return mergeDuplicatePins(SANITIZED_ROSTER_FIXTURE);
}
