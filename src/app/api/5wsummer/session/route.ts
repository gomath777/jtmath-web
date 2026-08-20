import { NextResponse } from 'next/server';
import { readSummerSession } from '@/lib/summer-5week/server';

export async function GET() {
  const session = await readSummerSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    subjects: session.subjects,
    master: session.master,
    accessThrough: session.accessThrough,
  });
}
