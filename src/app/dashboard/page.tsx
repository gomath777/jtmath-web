import Link from 'next/link';
import { BookOpen, PlayCircle, Clock, ChevronRight, BookMarked } from 'lucide-react';
// PlayCircle은 기출 영상 섹션에서 사용
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


      {/* 기출 영상 */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white/50 tracking-wider uppercase flex items-center gap-2 font-mono">
          <BookMarked className="w-4 h-4 text-brand-mint" />
          EXAM VIDEOS
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { slug: 'gs1', name: '공통수학1' },
            { slug: 'ds2', name: '대수' },
          ].map(subject => (
            <Link
              key={subject.slug}
              href={`/dashboard/practice/${subject.slug}`}
              className="brand-card p-4 flex flex-col gap-2 hover:border-brand-mint/30 transition-all group"
            >
              <span className="text-[10px] font-mono text-brand-mint/60 uppercase tracking-widest">기출 해설</span>
              <span className="font-bold text-white text-sm group-hover:text-brand-mint transition-colors">{subject.name}</span>
              <span className="text-xs text-white/20 flex items-center gap-1 mt-auto">
                <PlayCircle className="w-3.5 h-3.5" />
                영상 보기
              </span>
            </Link>
          ))}
        </div>
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
