import Link from 'next/link';
import { Download, PlayCircle, MessageCircle, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || '566809';

export default async function CourseViewerPage({ params, searchParams }: { params: { id: string }, searchParams: { lesson?: string } }) {
  const supabase = await createClient();

  // 1. Check Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2. Fetch Course Details
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.id)
    .single();

  const courseTitle = course?.title || '대수 Δ0 실전 개념 완성';

  // 3. Fetch Lessons ordered by week → lesson
  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', params.id)
    .order('week_number', { ascending: true })
    .order('lesson_number', { ascending: true });

  type LessonType = {
    id: string;
    title: string;
    lesson_number: number;
    week_number: number;
    bunny_video_id: string | null;
    pdf_level_1_url: string | null;
    pdf_level_2_url: string | null;
    description: string | null;
  };

  const lessons = (lessonsData || []) as LessonType[];

  // Group by week
  const weeksMap = new Map<number, LessonType[]>();
  lessons.forEach(l => {
    if (!weeksMap.has(l.week_number)) weeksMap.set(l.week_number, []);
    weeksMap.get(l.week_number)!.push(l);
  });
  const weeks = Array.from(weeksMap.entries()).sort((a, b) => a[0] - b[0]);

  const currentLessonId = searchParams.lesson || (lessons.length > 0 ? lessons[0].id : null);
  const currentLesson = lessons.find(l => l.id === currentLessonId) || (lessons.length > 0 ? lessons[0] : null);

  const totalLessons = lessons.length;
  const completedLessons = 0; // placeholder — will add progress tracking later

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-5rem)]">
      
      {/* ── Sidebar ── */}
      <div className="w-full lg:w-72 xl:w-80 bg-brand-surface border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col shrink-0">
        {/* Course Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <Link href="/dashboard" className="inline-flex items-center text-xs font-mono text-white/30 hover:text-brand-blue mb-4 transition-colors gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            내 강의실
          </Link>
          <h2 className="font-bold text-base text-white leading-snug">{courseTitle}</h2>
          <div className="mt-4">
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-white/30">진도율</span>
              <span className="text-brand-mint">{totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-1">
              <div
                className="bg-gradient-to-r from-brand-blue to-brand-mint h-1 rounded-full transition-all"
                style={{ width: `${totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-white/20 mt-1.5">{completedLessons}/{totalLessons}강 완료</p>
          </div>
        </div>

        {/* Lesson List */}
        <div className="overflow-y-auto flex-1 p-3">
          {weeks.length > 0 ? weeks.map(([weekNum, weekLessons]) => (
            <div key={`week-${weekNum}`} className="mb-4">
              <p className="px-3 py-1.5 text-[10px] font-mono font-bold text-white/25 uppercase tracking-widest">
                {weekNum}주차
              </p>
              <div className="space-y-0.5">
                {weekLessons.map(lesson => {
                  const isActive = currentLessonId === lesson.id;
                  return (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/courses/${params.id}?lesson=${lesson.id}`}
                      className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 text-xs rounded-lg transition-all ${
                        isActive
                          ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                          : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                      }`}
                    >
                      {isActive
                        ? <PlayCircle className="w-4 h-4 shrink-0 mt-0.5 text-brand-blue" />
                        : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-white/15" />
                      }
                      <span className="leading-snug font-medium">{lesson.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )) : (
            <div className="p-4 text-center">
              <p className="text-xs text-white/30 font-mono">강의 준비 중입니다</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-20 lg:pb-0 min-w-0">
        
        {/* Lesson Title */}
        {currentLesson && (
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-brand-blue bg-brand-blue/10 px-2.5 py-1 rounded-md border border-brand-blue/20 mb-3">
              <PlayCircle className="w-3 h-3" />
              재생 중
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-white">{currentLesson.title}</h1>
            {currentLesson.description && (
              <p className="text-white/40 text-sm mt-1.5">{currentLesson.description}</p>
            )}
          </div>
        )}

        {/* Video Player */}
        <div className="aspect-video bg-black rounded-2xl overflow-hidden relative ring-1 ring-white/[0.06]">
          {currentLesson?.bunny_video_id ? (
            <iframe
              src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${currentLesson.bunny_video_id}?autoplay=false&loop=false&muted=false&preload=true`}
              className="w-full h-full border-0 absolute inset-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/20">
              <PlayCircle className="w-14 h-14" />
              <p className="text-sm font-mono">등록된 영상이 없습니다</p>
            </div>
          )}
        </div>

        {/* Materials + Q&A */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PDF Downloads */}
          <div className="brand-card p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Download className="w-4 h-4 text-brand-blue" />
              강의 자료 다운로드
            </h3>
            <div className="space-y-2.5">
              {currentLesson?.pdf_level_1_url ? (
                <a
                  href={currentLesson.pdf_level_1_url}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-brand-elevated border border-white/[0.04] hover:border-brand-blue/30 hover:text-brand-blue text-white/50 transition-all group text-sm font-medium"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  레벨 1 자료 (PDF)
                </a>
              ) : (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-brand-elevated border border-white/[0.04] text-white/20 text-sm font-mono">
                  자료 준비 중
                </div>
              )}
              {currentLesson?.pdf_level_2_url && (
                <a
                  href={currentLesson.pdf_level_2_url}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-brand-elevated border border-white/[0.04] hover:border-brand-blue/30 hover:text-brand-blue text-white/50 transition-all text-sm font-medium"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  레벨 2 자료 (PDF)
                </a>
              )}
            </div>
          </div>

          {/* Q&A */}
          <div className="brand-card p-6 border-yellow-400/10 hover:border-yellow-400/20 transition-all">
            <div className="text-[10px] font-mono text-yellow-400/60 uppercase tracking-wider mb-3">1:1 밀착 관리</div>
            <h4 className="font-bold text-white text-base mb-1">모르는 문제는 캡처해서 질문하세요!</h4>
            <p className="text-xs text-white/30 mb-5 leading-relaxed">
              어디까지 생각했고, 어느 부분에서 막혔는지 함께 보내주시면 직접 피드백 드립니다.
            </p>
            <a
              href="https://open.kakao.com/o/YOUR_LINK_HERE"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full bg-[#FEE500] hover:bg-[#FDD800] text-[#371D1E] font-bold px-5 py-3.5 rounded-xl transition-all text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              카카오로 질문하기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
