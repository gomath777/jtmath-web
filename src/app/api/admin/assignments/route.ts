import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// GET: 배정 목록 (특정 learning set 또는 전체)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sc = getServiceClient();
  const setId = req.nextUrl.searchParams.get('set_id');

  let query = sc
    .from('assignments')
    .select(`
      id, set_id, user_id, course_id, label, published_at, week_number, session_number, created_at,
      learning_sets ( id, title, subject_slug ),
      profiles ( id, name, school )
    `)
    .order('created_at', { ascending: false });

  if (setId) query = query.eq('set_id', setId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 새 배정 생성
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { set_id, user_ids, course_id, label, week_number, session_number, publish_now } = body;

  if (!set_id) {
    return NextResponse.json({ error: 'set_id 필수' }, { status: 400 });
  }
  if (!user_ids?.length && !course_id) {
    return NextResponse.json({ error: '학생 또는 강의를 선택하세요' }, { status: 400 });
  }

  const sc = getServiceClient();
  const published_at = publish_now ? new Date().toISOString() : null;

  const rows: Array<{
    set_id: string;
    user_id: string | null;
    course_id: string | null;
    label: string | null;
    week_number: number | null;
    session_number: number | null;
    published_at: string | null;
  }> = [];

  if (course_id) {
    // 강의 전체 배정
    rows.push({
      set_id,
      user_id: null,
      course_id,
      label: label || null,
      week_number: week_number || null,
      session_number: session_number || null,
      published_at,
    });
  } else if (user_ids?.length) {
    // 개별 학생 배정
    for (const uid of user_ids) {
      rows.push({
        set_id,
        user_id: uid,
        course_id: null,
        label: label || null,
        week_number: week_number || null,
        session_number: session_number || null,
        published_at,
      });
    }
  }

  const { data, error } = await sc.from('assignments').insert(rows).select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ created: data.length, ids: data.map((d: { id: string }) => d.id) });
}

// DELETE: 배정 삭제
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 });

  const sc = getServiceClient();
  const { error } = await sc.from('assignments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
