import Link from 'next/link';
import { PlayCircle, ChevronLeft, BookMarked } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import BunnyVideoPlayer from '@/components/BunnyVideoPlayer';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';

const SUBJECT_NAMES: Record<string, string> = {
  gs1: '공통수학1',
  gs2: '공통수학2',
  ds2: '대수',
  ms1: '미적분1',
  gs:  '기하',
};

type ExamVideo = {
  id: string;
  bunny_video_id: string;
  file_code: string;
  title: string;
  subject_slug: string;
  chapter_folder: string;
  year: number | null;
  month: number | null;
  grade: number | null;
  problem: number | null;
  sequence: number | null;
};

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ subject: string }>;
  searchParams: Promise<{ video?: string }>;
}) {
  const { subject } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const subjectSlug = subject;
  const subjectName = SUBJECT_NAMES[subjectSlug] ?? subjectSlug;

  const { data: videosData } = await supabase
    .from('exam_videos')
    .select('id, bunny_video_id, file_code, title, subject_slug, chapter_folder, year, month, grade, problem, sequence')
    .eq('subject_slug', subjectSlug)
    .eq('is_published', true)
    .not('bunny_video_id', 'is', null)
    .order('chapter_folder', { ascending: true })
    .order('sequence', { ascending: true });

  const videos = (videosData ?? []) as ExamVideo[];

  // chapter_folder 기준으로 그룹핑
  const chaptersMap = new Map<string, ExamVideo[]>();
  for (const v of videos) {
    if (!chaptersMap.has(v.chapter_folder)) chaptersMap.set(v.chapter_folder, []);
    chaptersMap.get(v.chapter_folder)!.push(v);
  }
  const chapters = Array.from(chaptersMap.entries());

  const currentVideoId = resolvedSearchParams.video ?? (videos.length > 0 ? videos[0].bunny_video_id : null);
  const currentVideo = videos.find(v => v.bunny_video_id === currentVideoId) ?? videos[0] ?? null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-5rem)]">

      {/* ── Sidebar ── */}
      <div className="w-full lg:w-72 xl:w-80 bg-brand-surface border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col shrink-0">
        <div className="p-5 border-b border-white/[0.06]">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-mono text-white/30 hover:text-brand-blue mb-4 transition-colors gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            내 강의실
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <BookMarked className="w-4 h-4 text-brand-mint" />
            <span className="text-[10px] font-mono text-brand-mint uppercase tracking-widest">기출 영상</span>
          </div>
          <h2 className="font-bold text-base text-white">{subjectName}</h2>
          <p className="text-xs text-white/30 mt-1 font-mono">{videos.length}개 영상</p>
        </div>

        <div className="overflow-y-auto flex-1 p-3">
          {chapters.map(([chapter, chapterVideos]) => (
            <div key={chapter} className="mb-4">
              <p className="px-3 py-1.5 text-[10px] font-mono font-bold text-white/25 tracking-wide leading-tight">
                {chapter}
              </p>
              <div className="space-y-0.5">
                {chapterVideos.map(video => {
                  const isActive = currentVideoId === video.bunny_video_id;
                  return (
                    <Link
                      key={video.id}
                      href={`/dashboard/practice/${subjectSlug}?video=${video.bunny_video_id}`}
                      className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 text-xs rounded-lg transition-all ${
                        isActive
                          ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                          : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                      }`}
                    >
                      <PlayCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-brand-blue' : 'text-white/15'}`} />
                      <span className="leading-snug font-medium">{video.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {chapters.length === 0 && (
            <div className="text-center py-12 text-white/20 text-xs font-mono">
              업로드된 영상이 없습니다
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-20 lg:pb-0 min-w-0">
        {currentVideo && (
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-brand-mint bg-brand-mint/10 px-2.5 py-1 rounded-md border border-brand-mint/20 mb-3">
              <BookMarked className="w-3 h-3" />
              기출 해설
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-white">{currentVideo.title}</h1>
            {currentVideo.year && (
              <p className="text-white/40 text-sm mt-1.5 font-mono">
                {currentVideo.year}년 {currentVideo.month}월 · 고{currentVideo.grade} {currentVideo.problem}번
              </p>
            )}
          </div>
        )}

        <BunnyVideoPlayer
          libraryId={EXAM_LIBRARY_ID}
          videoId={currentVideo?.bunny_video_id ?? ''}
          lessonId=""
          startPositionSecs={0}
        />
      </div>
    </div>
  );
}
