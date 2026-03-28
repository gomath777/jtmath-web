import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

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
  const subjectSlug = formData.get('subject_slug') as string | null;
  const autoMatch = formData.get('auto_match') === 'true';
  const blockType = (formData.get('block_type') as string) || 'pdf';
  const existingBlockId = formData.get('block_id') as string | null; // 기존 블록 업데이트용
  const insertAt = formData.get('insert_at') as string | null; // 삽입할 order_index

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

  const createdBlocks = [pdfBlock];

  // 자동매칭 (선택적)
  if (autoMatch) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const base64 = Buffer.from(bytes).toString('base64');

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            {
              type: 'text',
              text: `이 PDF의 각 문제 상단에 "[YYYY년 MM월 고N NN번/XX점]" 형식의 출처 정보가 있습니다.
문제 번호(01, 02, 03...)와 각 문제의 출처 정보를 정확하게 읽어서 JSON 배열로만 응답해주세요.

주의사항:
- 월(month)을 정확히 읽으세요: 3월=3, 4월=4, 6월=6, 9월=9, 10월=10, 11월=11
- 번호(problem)를 정확히 읽으세요: 숫자를 절대 혼동하지 마세요
- raw_text에는 대괄호 안의 원문을 그대로 복사하세요

응답 형식 (JSON 배열만):
[{"problem_number": 1, "year": 2025, "month": 9, "grade": 1, "problem": 15, "raw_text": "[2025년 9월 고1 15번/4점]"}]

출처를 찾을 수 없는 문제는 year, month, grade, problem을 null로 설정.`,
            },
          ],
        }],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const problems = JSON.parse(jsonMatch[0]);

        // exam_videos에서 매칭
        const matchedVideos = [];
        for (const p of problems) {
          if (!p.year || !p.month || !p.grade || !p.problem) continue;
          let query = sc
            .from('exam_videos')
            .select('id, bunny_video_id, title, subject_slug')
            .eq('year', p.year).eq('month', p.month).eq('grade', p.grade).eq('problem', p.problem)
            .eq('is_published', true).eq('is_chapter_summary', false);
          if (subjectSlug) query = query.eq('subject_slug', subjectSlug);
          const { data } = await query.limit(1).single();
          if (data) {
            matchedVideos.push({
              bunny_video_id: data.bunny_video_id,
              title: data.title,
              problem_number: p.problem_number,
              raw_text: p.raw_text,
            });
          }
        }

        // parsed_problems를 PDF 블록에 저장
        await sc.from('session_blocks').update({
          content: { ...pdfContent, parsed_problems: problems },
        }).eq('id', (pdfBlock as { id: string }).id);

        // 매칭된 영상이 있으면 PDF 바로 다음 위치에 video_group 블록 삽입
        if (matchedVideos.length > 0) {
          const videoOrderIndex = pdfOrderIndex + 1;

          // video 자리 확보: 이후 블록들 1칸씩 밀기
          const { data: laterBlocks } = await sc
            .from('session_blocks')
            .select('id, order_index')
            .eq('curriculum_item_id', curriculumItemId)
            .gte('order_index', videoOrderIndex)
            .neq('id', (pdfBlock as { id: string }).id)
            .order('order_index', { ascending: false });

          if (laterBlocks && laterBlocks.length > 0) {
            for (const b of laterBlocks) {
              await sc.from('session_blocks').update({ order_index: b.order_index + 1 }).eq('id', b.id);
            }
          }

          const { data: videoBlock } = await sc
            .from('session_blocks')
            .insert({
              curriculum_item_id: curriculumItemId,
              block_type: 'video_group',
              order_index: videoOrderIndex,
              content: { videos: matchedVideos, linked_pdf_block_id: (pdfBlock as { id: string }).id },
            })
            .select('*')
            .single();

          if (videoBlock) createdBlocks.push(videoBlock);
        }
      }
    } catch (err) {
      console.error('Auto-match error:', err);
    }
  }

  return NextResponse.json({ blocks: createdBlocks });
}
