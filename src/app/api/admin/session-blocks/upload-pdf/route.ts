import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// POST: PDF 업로드 + 선택적 영상 자동매칭
// 기존 블록 ID가 있으면 그 블록을 업데이트, 없으면 insert_at 위치에 삽입
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const pdfFile = formData.get('pdf') as File;
  const curriculumItemId = formData.get('curriculum_item_id') as string;
  const blockType = (formData.get('block_type') as string) || 'pdf';
  const existingBlockId = formData.get('block_id') as string | null; // 기존 블록 업데이트용
  const insertAt = formData.get('insert_at') as string | null; // 삽입할 order_index
  // 자동매칭(Anthropic API)은 비용 문제로 비활성화 — CLI(npm run admin:session)에서 처리.

  if (!pdfFile || !curriculumItemId) {
    return NextResponse.json({ error: 'pdf, curriculum_item_id 필수' }, { status: 400 });
  }

  const sc = getServiceClient();

  // 1. PDF를 Supabase Storage에 업로드
  const bytes = await pdfFile.arrayBuffer();
  const safeName = `session-blocks/${Date.now()}.pdf`;
  const { data: uploadData, error: uploadError } = await sc.storage
    .from('pdfs')
    .upload(safeName, bytes, { contentType: 'application/pdf', upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: 'PDF 업로드 실패: ' + uploadError.message }, { status: 500 });
  }

  const { data: urlData } = sc.storage.from('pdfs').getPublicUrl(uploadData.path);
  const pdfUrl = urlData.publicUrl;

  const pdfContent: Record<string, unknown> = {
    storage_path: uploadData.path,
    url: pdfUrl,
    filename: safeName,
    original_name: pdfFile.name,
  };

  let pdfBlock: Record<string, unknown>;
  let pdfOrderIndex: number;

  if (existingBlockId) {
    // 기존 블록 업데이트 (같은 위치 유지)
    const { data, error } = await sc
      .from('session_blocks')
      .update({ content: pdfContent, block_type: blockType })
      .eq('id', existingBlockId)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    pdfBlock = data;
    pdfOrderIndex = data.order_index;
  } else {
    // 새 블록 삽입
    const targetOrder = insertAt !== null ? parseInt(insertAt) : null;

    if (targetOrder !== null) {
      // 해당 위치 이후 블록들을 1칸씩 밀기
      const { data: laterBlocks } = await sc
        .from('session_blocks')
        .select('id, order_index')
        .eq('curriculum_item_id', curriculumItemId)
        .gte('order_index', targetOrder)
        .order('order_index', { ascending: false });

      if (laterBlocks && laterBlocks.length > 0) {
        for (const b of laterBlocks) {
          await sc.from('session_blocks').update({ order_index: b.order_index + 1 }).eq('id', b.id);
        }
      }
      pdfOrderIndex = targetOrder;
    } else {
      // 맨 뒤에 추가
      const { data: existing } = await sc
        .from('session_blocks')
        .select('order_index')
        .eq('curriculum_item_id', curriculumItemId)
        .order('order_index', { ascending: false })
        .limit(1);
      pdfOrderIndex = (existing && existing.length > 0) ? existing[0].order_index + 1 : 0;
    }

    const { data, error } = await sc
      .from('session_blocks')
      .insert({
        curriculum_item_id: curriculumItemId,
        block_type: blockType,
        order_index: pdfOrderIndex,
        content: pdfContent,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    pdfBlock = data;
  }

  return NextResponse.json({ blocks: [pdfBlock] });
}
