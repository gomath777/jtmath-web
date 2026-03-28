import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// POST: 시청 진행률 업데이트
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bunny_video_id, watch_percent } = await req.json();

  if (!bunny_video_id || watch_percent === undefined) {
    return NextResponse.json({ error: 'bunny_video_id, watch_percent 필수' }, { status: 400 });
  }

  const percent = Math.round(Math.min(100, Math.max(0, watch_percent)));
  const completed = percent >= 80;

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 기존 기록이 있으면 더 높은 값만 업데이트 (되감기 방지)
  const { data: existing } = await sc
    .from('video_watch_progress')
    .select('id, watch_percent, completed')
    .eq('user_id', user.id)
    .eq('bunny_video_id', bunny_video_id)
    .single();

  if (existing) {
    // 이미 완료됐으면 completed는 유지, percent는 더 높은 값만
    const newPercent = Math.max(existing.watch_percent, percent);
    const newCompleted = existing.completed || completed;

    const { error } = await sc
      .from('video_watch_progress')
      .update({
        watch_percent: newPercent,
        completed: newCompleted,
        last_watched_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ watch_percent: newPercent, completed: newCompleted });
  } else {
    const { error } = await sc
      .from('video_watch_progress')
      .insert({
        user_id: user.id,
        bunny_video_id,
        watch_percent: percent,
        completed,
        last_watched_at: new Date().toISOString(),
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ watch_percent: percent, completed });
  }
}
