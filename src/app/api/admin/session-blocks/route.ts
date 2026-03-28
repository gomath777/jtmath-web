import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// GET: 특정 차시의 블록 목록
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const itemId = req.nextUrl.searchParams.get('item_id');
  if (!itemId) return NextResponse.json({ error: 'item_id 필수' }, { status: 400 });

  const sc = getServiceClient();
  const { data, error } = await sc
    .from('session_blocks')
    .select('*')
    .eq('curriculum_item_id', itemId)
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 새 블록 추가
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { curriculum_item_id, block_type, content } = body;

  if (!curriculum_item_id || !block_type) {
    return NextResponse.json({ error: 'curriculum_item_id, block_type 필수' }, { status: 400 });
  }

  const sc = getServiceClient();

  // 현재 최대 order_index 구하기
  const { data: existing } = await sc
    .from('session_blocks')
    .select('order_index')
    .eq('curriculum_item_id', curriculum_item_id)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrder = (existing && existing.length > 0) ? existing[0].order_index + 1 : 0;

  const { data, error } = await sc
    .from('session_blocks')
    .insert({
      curriculum_item_id,
      block_type,
      order_index: nextOrder,
      content: content || {},
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
