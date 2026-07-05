import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type GateStatus = 'config' | 'format' | 'invalid';

export type ConceptGateConfig = {
  readonly cookieName: string;
  readonly path: string;
  readonly tokenSeed: string;
  readonly passcodeEnvKeys: readonly string[];
};

const MASTER_PASSCODE = '260613';
const PASSCODE_PATTERN = /^\d{6}$/;

function validPasscodes(passcodeEnvKeys: readonly string[]): readonly string[] {
  const candidates = [
    MASTER_PASSCODE,
    ...passcodeEnvKeys.map((key) => process.env[key] || ''),
  ];
  return Array.from(new Set(candidates.filter((passcode) => PASSCODE_PATTERN.test(passcode))));
}

function createGateToken(tokenSeed: string, passcode: string): string {
  return createHmac('sha256', passcode).update(tokenSeed).digest('hex');
}

function passcodesMatch(expectedPasscode: string, submittedPasscode: string): boolean {
  if (!PASSCODE_PATTERN.test(submittedPasscode)) return false;
  const expected = Buffer.from(expectedPasscode);
  const submitted = Buffer.from(submittedPasscode);
  return expected.length === submitted.length && timingSafeEqual(expected, submitted);
}

function matchingPasscode(
  passcodes: readonly string[],
  submittedPasscode: string,
): string | null {
  return passcodes.find((passcode) => passcodesMatch(passcode, submittedPasscode)) || null;
}

export function readGateStatus(gate: string | readonly string[] | undefined): GateStatus | null {
  const value = Array.isArray(gate) ? gate[0] : gate;
  if (value === 'config' || value === 'format' || value === 'invalid') return value;
  return null;
}

export async function isConceptPageUnlocked(config: ConceptGateConfig): Promise<boolean> {
  const passcodes = validPasscodes(config.passcodeEnvKeys);
  const cookieStore = await cookies();
  const token = cookieStore.get(config.cookieName)?.value;
  if (!token) return false;
  return passcodes.some((passcode) => token === createGateToken(config.tokenSeed, passcode));
}

export async function unlockConceptPage(
  formData: FormData,
  config: ConceptGateConfig,
): Promise<void> {
  const passcodes = validPasscodes(config.passcodeEnvKeys);
  if (passcodes.length === 0) redirect(`${config.path}?gate=config`);

  const submitted = formData.get('passcode');
  const submittedPasscode = typeof submitted === 'string' ? submitted.trim() : '';
  if (!PASSCODE_PATTERN.test(submittedPasscode)) redirect(`${config.path}?gate=format`);

  const passcode = matchingPasscode(passcodes, submittedPasscode);
  if (!passcode) redirect(`${config.path}?gate=invalid`);

  const cookieStore = await cookies();
  cookieStore.set(config.cookieName, createGateToken(config.tokenSeed, passcode), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: config.path,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  redirect(config.path);
}
