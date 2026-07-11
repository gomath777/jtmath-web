import { NextResponse } from 'next/server';
import { loginAndSetCookie } from '@/lib/summer-5week/server';

function pinFromBody(value: unknown): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return '';
  if (!('pin' in value)) return '';
  const pin = value.pin;
  return typeof pin === 'string' ? pin : '';
}

function assertNever(value: never): never {
  throw new Error(`Unhandled summer login result: ${String(value)}`);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    body = {};
  }

  const result = await loginAndSetCookie(pinFromBody(body));
  switch (result.kind) {
    case 'ok': {
      const firstSubject = result.session.subjects[0] ?? null;
      return NextResponse.json({
        ok: true,
        subjects: result.session.subjects,
        master: result.session.master,
        redirectTo: result.session.subjects.length === 1 && firstSubject ? `/5wsummer/${firstSubject}` : '/5wsummer',
      });
    }
    case 'format':
      return NextResponse.json({ ok: false, error: 'format' }, { status: 400 });
    case 'invalid':
      return NextResponse.json({ ok: false, error: 'invalid' }, { status: 401 });
    case 'config':
      return NextResponse.json({ ok: false, error: 'config' }, { status: 503 });
    case 'rate_limited':
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    default:
      return assertNever(result);
  }
}
