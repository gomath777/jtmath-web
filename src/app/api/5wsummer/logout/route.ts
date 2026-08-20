import { NextResponse } from 'next/server';
import { clearSummerCookie } from '@/lib/summer-5week/server';

export async function POST() {
  await clearSummerCookie();
  return NextResponse.json({ ok: true });
}
