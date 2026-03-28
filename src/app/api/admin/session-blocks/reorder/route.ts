import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// POST: 블록 순서 변경
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { blocks } = await req.json();
  if (!Array.isArray(blocks)) {
    return NextResponse.json({ error: 'blocks 배열 필수' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 각 블록의 order_index 업데이트
  const updates = blocks.map((b: { id: string; order_index: number }) =>
    sc.from('session_blocks').update({ order_index: b.order_index }).eq('id', b.id)
  );

  await Promise.all(updates);
  return NextResponse.json({ success: true });
}
