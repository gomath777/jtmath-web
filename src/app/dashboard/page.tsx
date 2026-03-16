import Link from 'next/link';
import { BookOpen, PlayCircle, Clock, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();

  const userName = profile?.name || '학생';

  const enrolledCourses = [
    {
      id: "1",
      title: "Δ0 기초 빌드업",
      subtitle: "Delta Zero",
      progress: 45,
      nextLesson: "3주차 2차시: 삼각형의 외심",
      validUntil: "2025년 12월 31일"
    },
    {
      id: "2",
      title: "Δ1 핵심 실전",
      subtitle: "Delta One",
      progress: 0,
      nextLesson: "1주차 1차시: 문자와 식",
      validUntil: "2025년 10월 15일"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="brand-card p-8">
        <h1 className="text-2xl font-bold text-white">
          환영합니다, <span className="text-brand-blue">{userName}</span>님
        </h1>
        <p className="mt-2 text-white/40">
          오늘도 알고리즘을 돌리러 온 당신, 화이팅.
        </p>
      </div>

      {/* OT Banner */}
      <div className="brand-card p-8 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-orange/10 text-brand-orange text-xs font-bold rounded-md mb-1 border border-brand-orange/20 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
              REQUIRED
            </div>
            <h2 className="text-2xl font-bold text-white">Lesson 0: 수강 전 오리엔테이션</h2>
            <p className="text-white/40 text-sm max-w-xl">
              매스플랫(MathFlat) 앱 설치부터 과제 제출 방법까지, 원활한 수강을 위해 반드시 시청해주세요.
            </p>
          </div>
          <Link 
            href="/dashboard/ot"
            className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-blue/20"
          >
            <PlayCircle className="w-5 h-5" />
            OT 시청하기
          </Link>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-brand-blue/10 transition-all duration-700" />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white/50 tracking-wider uppercase flex items-center gap-2 font-mono">
          <BookOpen className="w-4 h-4 text-brand-blue" />
          ENROLLED COURSES
        </h2>

        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrolledCourses.map((course) => (
              <div key={course.id} className="brand-card overflow-hidden group cursor-pointer flex flex-col h-full hover:border-brand-blue/30 transition-all duration-300">
                <div className="h-1 w-full bg-gradient-to-r from-brand-blue to-brand-mint" />
                <div className="p-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <span className="text-xs font-mono text-brand-blue/70 tracking-wide">{course.subtitle}</span>
                    <h3 className="text-lg font-bold text-white mt-1 line-clamp-1 group-hover:text-brand-blue transition-colors">{course.title}</h3>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-white/40">진도율</span>
                        <span className="font-bold text-brand-blue font-mono">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-brand-blue to-brand-mint h-1.5 rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2 text-xs text-white/30 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {course.validUntil}
                      </div>
                      <Link 
                        href={`/dashboard/courses/${course.id}`}
                        className="text-sm font-bold text-brand-blue hover:text-blue-400 flex items-center gap-1 transition-colors"
                      >
                        입장
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="brand-card p-12 text-center">
            <div className="w-16 h-16 bg-white/[0.04] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.06]">
              <BookOpen className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">등록된 강의가 없습니다.</h3>
            <p className="text-white/40 text-sm max-w-sm mx-auto mb-6">
              아직 수강 신청한 강의가 없거나, 결제 승인 대기 중입니다.
            </p>
            <Link 
              href="/courses"
              className="inline-flex font-bold justify-center items-center px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-brand-blue/20"
            >
              전체 강의 둘러보기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
