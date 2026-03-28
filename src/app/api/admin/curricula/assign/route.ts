import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// POST: 커리큘럼을 학생/강의에 일괄 배정
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { curriculum_id, user_ids, course_id } = await req.json();

  if (!curriculum_id) {
    return NextResponse.json({ error: 'curriculum_id 필수' }, { status: 400 });
  }
  if (!user_ids?.length && !course_id) {
    return NextResponse.json({ error: '학생 또는 강의를 선택하세요' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 커리큘럼 차시 목록 가져오기
  const { data: items, error: itemError } = await sc
    .from('curriculum_items')
    .select('id, set_id, week_number, session_number, label, publish_date')
    .eq('curriculum_id', curriculum_id)
    .order('order_index');

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });
  if (!items?.length) return NextResponse.json({ error: '차시가 없습니다' }, { status: 400 });

  // 배정 rows 생성
  const rows: Array<{
    set_id: string;
    user_id: string | null;
    course_id: string | null;
    curriculum_id: string;
    curriculum_item_id: string;
    label: string;
    week_number: number;
    session_number: number;
    published_at: string;
  }> = [];

  for (const item of items) {
    if (!item.set_id) continue; // learning set 미연결 차시는 스킵

    const published_at = new Date(item.publish_date + 'T00:00:00+09:00').toISOString(); // KST 자정

    if (course_id) {
      rows.push({
        set_id: item.set_id,
        user_id: null,
        course_id,
        curriculum_id,
        curriculum_item_id: item.id,
        label: item.label || `${item.week_number}주차 ${item.session_number}차시`,
        week_number: item.week_number,
        session_number: item.session_number,
        published_at,
      });
    } else if (user_ids?.length) {
      for (const uid of user_ids) {
        rows.push({
          set_id: item.set_id,
          user_id: uid,
          course_id: null,
          curriculum_id,
          curriculum_item_id: item.id,
          label: item.label || `${item.week_number}주차 ${item.session_number}차시`,
          week_number: item.week_number,
          session_number: item.session_number,
          published_at,
        });
      }
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'learning set이 연결된 차시가 없습니다' }, { status: 400 });
  }

  const { data, error } = await sc.from('assignments').insert(rows).select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    created: data.length,
    sessions: items.length,
    message: `${items.length}차시 × ${course_id ? '강의 전체' : user_ids.length + '명'} = ${data.length}건 배정 완료`,
  });
}
