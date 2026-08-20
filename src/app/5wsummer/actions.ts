'use server';

import { redirect } from 'next/navigation';
import { clearSummerCookie, loginAndSetCookie } from '@/lib/summer-5week/server';

function assertNever(value: never): never {
  throw new Error(`Unhandled summer login result: ${String(value)}`);
}

export async function loginSummer(formData: FormData): Promise<void> {
  const submitted = formData.get('pin');
  const pin = typeof submitted === 'string' ? submitted : '';
  const result = await loginAndSetCookie(pin);

  switch (result.kind) {
    case 'ok': {
      const firstSubject = result.session.subjects[0];
      if (result.session.subjects.length === 1 && firstSubject) {
        redirect(`/5wsummer/${firstSubject}`);
      }
      redirect('/5wsummer');
    }
    case 'format':
      redirect('/5wsummer?gate=format');
    case 'invalid':
      redirect('/5wsummer?gate=invalid');
    case 'config':
      redirect('/5wsummer?gate=config');
    case 'rate_limited':
      redirect('/5wsummer?gate=rate_limited');
    default:
      assertNever(result);
  }
}

export async function logoutSummer(): Promise<void> {
  await clearSummerCookie();
  redirect('/5wsummer');
}
