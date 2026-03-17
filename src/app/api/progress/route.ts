import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/progress?lesson_id=xxx → 저장된 시청 위치 반환
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lesson_id = request.nextUrl.searchParams.get('lesson_id');
  if (!lesson_id) return NextResponse.json({ position_secs: 0, completed: false });

  const { data } = await supabase
    .from('lesson_progress')
    .select('position_secs, duration_secs, completed')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson_id)
    .single();

  return NextResponse.json(data ?? { position_secs: 0, duration_secs: 0, completed: false });
}

// POST /api/progress → 시청 위치 저장 (upsert)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { lesson_id, position_secs, duration_secs } = body;
  if (!lesson_id) return NextResponse.json({ error: 'lesson_id required' }, { status: 400 });

  // 90% 이상 시청 시 자동 완료 처리
  const completed = duration_secs > 0 && (position_secs / duration_secs) >= 0.9;

  await supabase
    .from('lesson_progress')
    .upsert({
      user_id: user.id,
      lesson_id,
      position_secs,
      duration_secs,
      completed,
      last_watched: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });

  return NextResponse.json({ ok: true, completed });
}
