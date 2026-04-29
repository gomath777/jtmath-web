import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStudentFromRequest } from '@/utils/student-auth';

export async function POST(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 마스터 PIN 접근은 학생 시청 진도로 기록하지 않음.
  if (student.isMaster) {
    return NextResponse.json({ ok: true, skipped: 'master' });
  }

  const { bunny_video_id, watch_percent } = await req.json();

  if (!bunny_video_id || watch_percent === undefined) {
    return NextResponse.json({ error: 'bunny_video_id, watch_percent 필수' }, { status: 400 });
  }

  const percent = Math.min(100, Math.max(0, Math.round(watch_percent)));
  const completed = percent >= 80;

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Upsert progress — only update if new percent is higher
  const { data: existing } = await sc
    .from('video_watch_progress')
    .select('id, watch_percent')
    .eq('user_id', student.profileId)
    .eq('bunny_video_id', bunny_video_id)
    .single();

  if (existing) {
    const newPercent = Math.max(existing.watch_percent, percent);
    await sc
      .from('video_watch_progress')
      .update({
        watch_percent: newPercent,
        completed: newPercent >= 80,
        last_watched_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return NextResponse.json({ watch_percent: newPercent, completed: newPercent >= 80 });
  } else {
    await sc.from('video_watch_progress').insert({
      user_id: student.profileId,
      bunny_video_id,
      watch_percent: percent,
      completed,
      last_watched_at: new Date().toISOString(),
    });

    return NextResponse.json({ watch_percent: percent, completed });
  }
}
