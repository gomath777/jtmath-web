import Link from 'next/link';
import { Download, PlayCircle, MessageCircle, ChevronLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function CourseViewerPage({ params, searchParams }: { params: { id: string }, searchParams: { lesson?: string } }) {
  const supabase = await createClient();

  // 1. Check Auth & Enrollment
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Fetch Course Details
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.id)
    .single();

  if (courseError || !course) {
    // Fallback to placeholder if DB is empty for UI testing
    // In production, this might redirect to a 404 or dashboard
  }

  const courseTitle = course?.title || "[공수1] 중간기말 전반전";
  const courseProgress = "12"; // Placeholder until progress tracking is built

  // 3. Fetch Lessons
  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', params.id)
    .order('week_number', { ascending: true })
    .order('lesson_number', { ascending: true });

  // Group lessons by week
  type LessonType = { id: string, title: string, lesson_number: number, week_number: number, bunny_video_id: string | null, pdf_level_1_url: string | null, pdf_level_2_url: string | null, description: string | null };
  const lessons = (lessonsData || []) as LessonType[];
  
  const weeksMap = new Map<number, LessonType[]>();
  lessons.forEach(lesson => {
    if (!weeksMap.has(lesson.week_number)) {
      weeksMap.set(lesson.week_number, []);
    }
    weeksMap.get(lesson.week_number)!.push(lesson);
  });

  const weeks = Array.from(weeksMap.entries()).sort((a, b) => a[0] - b[0]);

  // Use selected lesson or first available
  const currentLessonId = searchParams.lesson || (lessons.length > 0 ? lessons[0].id : null);
  const currentLesson = lessons.find(l => l.id === currentLessonId) || {
    title: "1주차 1차시 다항식과 나머지정리 (샘플)",
    description: "교육청 기출 레벨 1, 2 (스킵가능)",
    bunny_video_id: null,
    pdf_level_1_url: "#",
    pdf_level_2_url: "#",
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-8rem)]">
      
      {/* Curriculum Sidebar */}
      <div className="w-full lg:w-80 border border-slate-200 bg-white rounded-2xl overflow-hidden flex flex-col shrink-0 shadow-sm">
        <div className="p-5 border-b border-slate-100 bg-slate-50">
          <Link href="/dashboard" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-red-600 mb-3 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            내 강의실로 돌아가기
          </Link>
          <h2 className="font-bold text-lg text-slate-900 line-clamp-2">{courseTitle}</h2>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">진도율</span>
            <span className="font-bold text-red-600">{courseProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
            <div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${courseProgress}%` }}></div>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-3 space-y-6">
          {weeks.length > 0 ? weeks.map(([weekNum, weekLessons]) => (
            <div key={`week-${weekNum}`}>
              <h3 className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {weekNum}주차
              </h3>
              <div className="space-y-1">
                {weekLessons.map((lesson) => (
                  <Link 
                    key={lesson.id}
                    href={`/dashboard/courses/${params.id}?lesson=${lesson.id}`}
                    className={`w-full text-left flex items-start gap-3 px-3 py-3 text-sm font-semibold rounded-xl transition-colors ${
                      currentLessonId === lesson.id 
                        ? 'bg-red-50 text-red-700' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <PlayCircle className={`w-5 h-5 shrink-0 mt-0.5 ${currentLessonId === lesson.id ? 'text-red-600' : 'text-slate-400'}`} />
                    <span className="leading-snug">{lesson.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )) : (
            // Fallback UI if database is empty
            <div>
              <h3 className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg mb-2">
                1주차 샘플 커리큘럼
              </h3>
              <div className="space-y-1">
                <button className="w-full text-left flex items-start gap-3 px-3 py-3 text-sm font-semibold bg-red-50 text-red-700 rounded-xl">
                  <PlayCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">1주차 1차시: 샘플 영상</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content (Video & Materials) */}
      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pb-20 lg:pb-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 shadow-sm-text">{currentLesson.title}</h1>
          {currentLesson.description && (
            <p className="text-slate-500 font-medium mt-2 text-sm">{currentLesson.description}</p>
          )}
        </div>

        {/* Video Player Embed (Bunny.net) */}
        <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative shadow-lg ring-1 ring-slate-900/5">
          {currentLesson.bunny_video_id ? (
            <iframe 
               src={`https://video.bunnycdn.com/embed/YOUR_LIBRARY_ID/${currentLesson.bunny_video_id}`}
               className="w-full h-full border-0 absolute inset-0" 
               allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" 
               allowFullScreen
            ></iframe>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <PlayCircle className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-semibold text-sm">등록된 강의 영상이 없습니다.</p>
            </div>
          )}
        </div>

        {/* Material Downloads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Download className="w-4 h-4 text-red-600" />
              강의 자료 다운로드
            </h3>
            <div className="space-y-3">
              <a 
                href={currentLesson.pdf_level_1_url || "#"} 
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-red-200 hover:shadow-sm transition-all group"
              >
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 group-hover:text-red-600 group-hover:border-red-200 transition-colors">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{currentLesson.pdf_level_1_url ? '레벨 1 자료 다운로드' : '자료 준비 중'}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">PDF 형식</p>
                </div>
              </a>
              {currentLesson.pdf_level_2_url && (
                <a 
                  href={currentLesson.pdf_level_2_url} 
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-red-200 hover:shadow-sm transition-all group"
                >
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 group-hover:text-red-600 group-hover:border-red-200 transition-colors">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">레벨 2 자료 다운로드</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">PDF 형식</p>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* On-page Q&A Prompt */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col justify-center gap-4 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-100 rounded-full opacity-50 blur-2xl"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full mb-3">
                1:1 밀착 관리
              </div>
              <h4 className="font-bold text-amber-900 text-lg">모르는 문제는 캡처해서 질문하세요!</h4>
              <p className="text-sm text-amber-700/80 mt-1 mb-5 font-medium leading-relaxed">
                어디까지 생각했고 어느 부분에서 막혔는지 함께 보내주시면, 강사가 직접 정확한 피드백을 남겨드립니다.
              </p>
              <a 
                href="https://open.kakao.com/o/YOUR_LINK_HERE" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-[#FEE500] hover:bg-[#FDD800] text-[#371D1E] font-bold px-6 py-4 rounded-xl transition-all shadow-sm"
              >
                <MessageCircle className="w-5 h-5" />
                카톡으로 질문하기
              </a>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
