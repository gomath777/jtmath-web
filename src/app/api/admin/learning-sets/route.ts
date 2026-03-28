import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET: 콘텐츠 라이브러리 목록
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('learning_sets')
    .select(`
      id, title, description, subject_slug, pdf_url, pdf_filename, created_at,
      learning_set_videos (
        id, problem_number, bunny_video_id, title, is_matched, order_index
      )
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 새 learning set 저장 (PDF 업로드 후 매칭 결과 확정)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;
  const subjectSlug = formData.get('subject_slug') as string | null;
  const problemsJson = formData.get('problems') as string;
  const pdfFile = formData.get('pdf') as File | null;

  if (!title || !problemsJson) {
    return NextResponse.json({ error: '제목과 문제 목록이 필요합니다' }, { status: 400 });
  }

  const problems = JSON.parse(problemsJson);

  // PDF Supabase Storage 업로드
  let pdfUrl: string | null = null;
  let pdfFilename: string | null = null;
  if (pdfFile) {
    pdfFilename = pdfFile.name;
    const bytes = await pdfFile.arrayBuffer();
    const path = `learning-sets/${Date.now()}_${pdfFilename}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(path, bytes, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: 'PDF 업로드 실패: ' + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('pdfs').getPublicUrl(uploadData.path);
    pdfUrl = urlData.publicUrl;
  }

  // learning_sets 생성
  const { data: setData, error: setError } = await supabase
    .from('learning_sets')
    .insert({
      title,
      description: description || null,
      subject_slug: subjectSlug || null,
      pdf_url: pdfUrl,
      pdf_filename: pdfFilename,
    })
    .select('id')
    .single();

  if (setError) return NextResponse.json({ error: setError.message }, { status: 500 });

  // learning_set_videos 저장
  const videos = problems
    .filter((p: { matched_video?: { bunny_video_id: string; id: string; title: string } }) => p.matched_video)
    .map((p: {
      problem_number: number;
      matched_video: { id: string; bunny_video_id: string; title: string };
    }, idx: number) => ({
      set_id: setData.id,
      problem_number: p.problem_number,
      exam_video_id: p.matched_video.id,
      bunny_video_id: p.matched_video.bunny_video_id,
      title: p.matched_video.title,
      is_matched: true,
      order_index: idx,
    }));

  if (videos.length > 0) {
    const { error: vidError } = await supabase
      .from('learning_set_videos')
      .insert(videos);

    if (vidError) return NextResponse.json({ error: vidError.message }, { status: 500 });
  }

  return NextResponse.json({ id: setData.id, videos_saved: videos.length });
}
