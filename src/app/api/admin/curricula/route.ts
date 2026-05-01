import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// GET: 커리큘럼 목록
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sc = getServiceClient();
  const { data, error } = await sc
    .from('curricula')
    .select(`
      id, title, description, subject_slug, schedule_pattern, start_date, created_at,
      curriculum_items (
        id, set_id, week_number, session_number, label, publish_date, order_index,
        learning_sets ( id, title, pdf_filename ),
        session_blocks ( id, block_type, order_index, content )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 커리큘럼 생성 + 차시별 날짜 자동 계산
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, subject_slug, schedule_pattern, start_date, items } = body;

  if (!title || !start_date || !items?.length) {
    return NextResponse.json({ error: '제목, 시작일, 차시 목록 필수' }, { status: 400 });
  }

  const sc = getServiceClient();

  // 커리큘럼 생성
  const { data: curriculum, error: curError } = await sc
    .from('curricula')
    .insert({ title, description, subject_slug, schedule_pattern: schedule_pattern || 'sun_wed', start_date })
    .select('id')
    .single();

  if (curError) return NextResponse.json({ error: curError.message }, { status: 500 });

  // 차시 생성
  const itemRows = items.map((item: {
    set_id: string | null;
    week_number: number;
    session_number: number;
    label: string;
    publish_date: string;
  }, idx: number) => ({
    curriculum_id: curriculum.id,
    set_id: item.set_id || null,
    week_number: item.week_number,
    session_number: item.session_number,
    label: item.label || '',
    publish_date: item.publish_date,
    order_index: idx,
  }));

  const { error: itemError } = await sc
    .from('curriculum_items')
    .insert(itemRows);

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });

  return NextResponse.json({ id: curriculum.id, items_created: itemRows.length });
}
