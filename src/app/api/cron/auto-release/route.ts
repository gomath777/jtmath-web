import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// 매일 00:00 KST (= 15:00 UTC)에 Vercel Cron이 호출.
// scheduled_date <= 오늘(KST) 인 pending SLA를 released로 전환.
// vercel.json crons: { "path": "/api/cron/auto-release", "schedule": "0 15 * * *" }

function getTodayKstYmd(): string {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  // CRON_SECRET 인증
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const todayKst = getTodayKstYmd();

  const { data, error } = await sc
    .from('student_lesson_assignments')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .lte('scheduled_date', todayKst)
    .select('id');

  if (error) {
    console.error('[auto-release] DB 오류:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = data?.length ?? 0;
  console.log(`[auto-release] ${todayKst} — ${count}건 released`);
  return NextResponse.json({ released: count, date: todayKst });
}
