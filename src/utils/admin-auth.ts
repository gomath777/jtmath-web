import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from '@/utils/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com')
  .split(',').map(e => e.trim()).filter(Boolean);
const SIMPLE_ADMIN_COOKIE = 'jt_admin_access';
const SIMPLE_ADMIN_TOKEN_SEED = 'jtmath-admin-simple-access-v1';
const SIMPLE_ADMIN_PASSCODE = process.env.ADMIN_SIMPLE_PASSCODE || '260613';

export function isLocalAdminMode(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.LOCAL_ADMIN_MODE === 'true';
}

function createSimpleAdminToken(passcode: string): string {
  return createHmac('sha256', passcode).update(SIMPLE_ADMIN_TOKEN_SEED).digest('hex');
}

function passcodesMatch(expected: string, submitted: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const submittedBuffer = Buffer.from(submitted);
  return (
    expectedBuffer.length === submittedBuffer.length &&
    timingSafeEqual(expectedBuffer, submittedBuffer)
  );
}

export function verifySimpleAdminPasscode(passcode: string): boolean {
  return /^\d{6}$/.test(passcode) && passcodesMatch(SIMPLE_ADMIN_PASSCODE, passcode);
}

export async function setSimpleAdminCookie(passcode: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SIMPLE_ADMIN_COOKIE, createSimpleAdminToken(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function isSimpleAdminUnlocked(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SIMPLE_ADMIN_COOKIE)?.value;
  return token === createSimpleAdminToken(SIMPLE_ADMIN_PASSCODE);
}

/**
 * Guard for admin API routes. Returns NextResponse on failure (401/403),
 * or null on success. Caller should:
 *   const guard = await requireAdmin();
 *   if (guard) return guard;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (isLocalAdminMode() || await isSimpleAdminUnlocked()) return null;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
