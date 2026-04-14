/**
 * exam_videos 테이블에서 문제 메타데이터 기반으로 해설강의 영상 매칭
 *
 * API 라우트와 CLI 스크립트 모두에서 재사용.
 * SUPABASE_SERVICE_KEY로 RLS 우회.
 */

import { createClient } from '@supabase/supabase-js';
import type { ParsedProblem } from './parse-pdf';

export interface MatchedVideo {
  id: string;
  bunny_video_id: string;
  title: string;
  subject_slug: string;
}

export interface ProblemWithMatch extends ParsedProblem {
  matched_video: MatchedVideo | null;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY 환경변수가 필요합니다');
  }
  return createClient(url, key);
}

/**
 * 문제 메타데이터 배열을 받아 exam_videos 테이블에서 매칭되는 영상 찾기
 */
export async function matchProblemsToVideos(
  problems: ParsedProblem[],
  subjectSlug?: string | null,
): Promise<ProblemWithMatch[]> {
  const sc = getServiceClient();

  const results = await Promise.all(
    problems.map(async (p): Promise<ProblemWithMatch> => {
      if (!p.year || !p.month || !p.grade || !p.problem) {
        return { ...p, matched_video: null };
      }

      let query = sc
        .from('exam_videos')
        .select('id, bunny_video_id, title, subject_slug')
        .eq('year', p.year)
        .eq('month', p.month)
        .eq('grade', p.grade)
        .eq('problem', p.problem)
        .eq('is_published', true)
        .eq('is_chapter_summary', false);

      if (subjectSlug) query = query.eq('subject_slug', subjectSlug);

      const { data } = await query.limit(1).maybeSingle();

      return {
        ...p,
        matched_video: data ? {
          id: data.id,
          bunny_video_id: data.bunny_video_id,
          title: data.title,
          subject_slug: data.subject_slug,
        } : null,
      };
    }),
  );

  return results;
}

/**
 * 매칭된 문제를 content_group.videos 형식으로 변환
 */
export function toContentGroupVideos(matched: ProblemWithMatch[]): Array<{
  bunny_video_id: string;
  title: string;
  problem_number: number;
  raw_text: string;
}> {
  return matched
    .filter((p): p is ProblemWithMatch & { matched_video: MatchedVideo } => p.matched_video !== null)
    .map(p => ({
      bunny_video_id: p.matched_video.bunny_video_id,
      title: p.matched_video.title,
      problem_number: p.problem_number,
      raw_text: p.raw_text,
    }));
}
