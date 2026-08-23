import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { setSimpleAdminCookie, verifySimpleAdminPasscode } from '@/utils/admin-auth';
import { setStudentCookie, signToken } from '@/utils/student-auth';
import { isMidtermFrontAdminEntry } from './policy';

const BIRTH_PIN_PATTERN = /^\d{6}$/;

type TokenRow = {
  readonly id: string;
  readonly profile_id: string;
  readonly slug: string;
  readonly birth_pin: string;
  readonly portal_expires_at: string | null;
  readonly profiles: {
    readonly name: string | null;
  } | null;
};

function redirectTo(req: NextRequest, error: string): NextResponse {
  const url = new URL('/midterm-front', req.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url, { status: 303 });
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, '').trim();
}

function isExpired(portalExpiresAt: string | null): boolean {
  return !!portalExpiresAt && new Date(portalExpiresAt).getTime() <= Date.now();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const formData = await req.formData();
  const rawBirthPin = formData.get('birth_pin');
  const rawName = formData.get('name');
  const birthPin = typeof rawBirthPin === 'string' ? rawBirthPin.replace(/\D/g, '').slice(0, 6) : '';
  const submittedName = typeof rawName === 'string' ? normalizeName(rawName) : '';

  if (!BIRTH_PIN_PATTERN.test(birthPin)) {
    return redirectTo(req, 'format');
  }

  if (isMidtermFrontAdminEntry({ birthPin, verifyAdminPasscode: verifySimpleAdminPasscode })) {
    await setSimpleAdminCookie(birthPin);
    return NextResponse.redirect(new URL('/admin/calendars-new', req.url), { status: 303 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data, error } = await sc
    .from('student_tokens')
    .select('id, profile_id, slug, birth_pin, portal_expires_at, profiles!inner(name)')
    .eq('is_active', true)
    .eq('show_in_calendar', true)
    .eq('birth_pin', birthPin);

  if (error) {
    return redirectTo(req, 'server');
  }

  const activeRows = ((data ?? []) as unknown as readonly TokenRow[]).filter(
    (row) => !isExpired(row.portal_expires_at),
  );

  const matchedRows = submittedName
    ? activeRows.filter((row) => normalizeName(row.profiles?.name ?? '') === submittedName)
    : activeRows;

  if (matchedRows.length === 0) {
    return redirectTo(req, activeRows.length > 1 ? 'name' : 'invalid');
  }

  if (matchedRows.length > 1) {
    return redirectTo(req, 'name');
  }

  const tokenRow = matchedRows[0];
  await sc
    .from('student_tokens')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  const token = await signToken(tokenRow.profile_id, tokenRow.slug);
  const res = NextResponse.redirect(new URL(`/s/${tokenRow.slug}`, req.url), { status: 303 });
  return setStudentCookie(res, token);
}
