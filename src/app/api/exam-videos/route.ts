import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const subjectSlug = searchParams.get('subject_slug');
  const chapterFolder = searchParams.get('chapter_folder');

  let query = supabase
    .from('exam_videos')
    .select('id, bunny_video_id, file_code, title, subject_slug, chapter_folder, year, month, grade, problem, sequence')
    .eq('is_published', true)
    .not('bunny_video_id', 'is', null)
    .order('chapter_folder', { ascending: true })
    .order('sequence', { ascending: true });

  if (subjectSlug) query = query.eq('subject_slug', subjectSlug);
  if (chapterFolder) query = query.eq('chapter_folder', chapterFolder);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
