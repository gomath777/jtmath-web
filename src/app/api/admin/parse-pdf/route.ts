import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ParsedProblem {
  problem_number: number;   // PDF에서의 순서 (01, 02...)
  year: number | null;      // 2025
  month: number | null;     // 6
  grade: number | null;     // 1
  problem: number | null;   // 17
  raw_text: string;         // "[2025년 6월 고1 17번/4점]" 원본
  matched_video: MatchedVideo | null;
}

export interface MatchedVideo {
  id: string;
  bunny_video_id: string;
  title: string;
  subject_slug: string;
}

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

    // PDF → base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Claude API로 PDF 분석
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `이 PDF의 각 문제 상단에 "[YYYY년 MM월 고N NN번/XX점]" 형식의 출처 정보가 있습니다.
문제 번호(01, 02, 03...)와 각 문제의 출처 정보를 모두 찾아서 JSON 배열로만 응답해주세요.

응답 형식 (JSON만, 설명 없이):
[
  {"problem_number": 1, "year": 2025, "month": 6, "grade": 1, "problem": 17, "raw_text": "[2025년 6월 고1 17번/4점]"},
  {"problem_number": 2, "year": 2025, "month": 9, "grade": 1, "problem": 15, "raw_text": "[2025년 9월 고1 15번/3점]"}
]

출처를 찾을 수 없는 문제는 year, month, grade, problem을 null로:
{"problem_number": 3, "year": null, "month": null, "grade": null, "problem": null, "raw_text": ""}`,
            },
          ],
        },
      ],
    });

    // Claude 응답 파싱
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    let problems: Omit<ParsedProblem, 'matched_video'>[] = [];

    try {
      // JSON 블록 추출
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        problems = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json({ error: 'PDF 분석 실패: ' + responseText }, { status: 500 });
    }

    // exam_videos에서 매칭
    const matchedProblems: ParsedProblem[] = await Promise.all(
      problems.map(async (p) => {
        if (!p.year || !p.month || !p.grade || !p.problem) {
          return { ...p, matched_video: null };
        }

        let query = supabase
          .from('exam_videos')
          .select('id, bunny_video_id, title, subject_slug')
          .eq('year', p.year)
          .eq('month', p.month)
          .eq('grade', p.grade)
          .eq('problem', p.problem)
          .eq('is_published', true)
          .eq('is_chapter_summary', false);

        if (subjectSlug) query = query.eq('subject_slug', subjectSlug);

        const { data } = await query.limit(1).single();

        return {
          ...p,
          matched_video: data ? {
            id: data.id,
            bunny_video_id: data.bunny_video_id,
            title: data.title,
            subject_slug: data.subject_slug,
          } : null,
        };
      })
    );

    const matchedCount = matchedProblems.filter(p => p.matched_video).length;

    return NextResponse.json({
      total: problems.length,
      matched: matchedCount,
      unmatched: problems.length - matchedCount,
      problems: matchedProblems,
    });

  } catch (err) {
    console.error('parse-pdf error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
