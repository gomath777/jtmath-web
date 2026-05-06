import { createClient as createServiceClient } from '@supabase/supabase-js';
import SearchClient from './SearchClient';
import type { ExamVideoRow } from './types';

export const metadata = {
  title: '기출 해설강의 검색',
  robots: { index: false, follow: false },
};

async function loadVideos(): Promise<ExamVideoRow[]> {
  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data } = await sc
    .from('exam_videos')
    .select('bunny_video_id, title, subject_slug, year, month, grade, problem, chapter_folder')
    .not('bunny_video_id', 'is', null)
    .order('year', { ascending: false, nullsFirst: false })
    .order('month', { ascending: false, nullsFirst: false })
    .order('grade', { ascending: true, nullsFirst: false })
    .order('problem', { ascending: true, nullsFirst: false });

  return (data || []) as ExamVideoRow[];
}

export default async function ExamSearchPage() {
  const videos = await loadVideos();
  return <SearchClient initialVideos={videos} />;
}
