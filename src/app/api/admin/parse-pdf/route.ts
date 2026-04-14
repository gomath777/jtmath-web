import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parsePdfWithClaude } from '@/lib/parse-pdf';
import { matchProblemsToVideos } from '@/lib/match-videos';

export async function POST(req: NextRequest) {
  // 어드민 인증 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File;
    const subjectSlug = formData.get('subject_slug') as string | null;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDF 파일이 필요합니다' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const problems = await parsePdfWithClaude(bytes);
    const matched = await matchProblemsToVideos(problems, subjectSlug);
    const matchedCount = matched.filter(p => p.matched_video).length;

    return NextResponse.json({
      total: problems.length,
      matched: matchedCount,
      unmatched: problems.length - matchedCount,
      problems: matched,
    });
  } catch (err) {
    console.error('parse-pdf error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
