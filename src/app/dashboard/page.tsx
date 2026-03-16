import Link from 'next/link';
import { BookOpen, PlayCircle, Clock, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. 유저 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. 유저 프로필 정보 가져오기 (이름 표시용)
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();

  const userName = profile?.name || '학생';

  // 3. (추후 구현) 유저가 수강 중인 강의 목록 가져오기 로직이 들어갈 자리
  // const enrolledCourses = await getEnrolledCourses(user.id);
  const enrolledCourses = [
    {
      id: "1",
      title: "기하학 마스터 클래스",
      subtitle: "중등 기하 완벽 대비반",
      progress: 45,
      nextLesson: "3주차 2차시: 삼각형의 외심",
      thumbnailColor: "bg-blue-600",
      validUntil: "2024년 12월 31일"
    },
    {
      id: "2",
      title: "대수학 기초 완성",
      subtitle: "방정식과 함수 총정리",
      progress: 0,
      nextLesson: "1주차 1차시: 문자와 식",
      thumbnailColor: "bg-emerald-600",
      validUntil: "2024년 10월 15일"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* 환영 메시지 */}
      <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          환영합니다, <span className="text-red-600">{userName}</span>님! 🚀
        </h1>
        <p className="mt-2 text-slate-500">
          오늘도 jtmath와 함께 힘차게 달려볼까요?
        </p>
      </div>

      {/* 필수 시청: OT 자료 (Lesson 0) */}
      <div className="bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-800 text-white relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/20 text-red-400 text-xs font-bold rounded-full mb-1 border border-red-500/20">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              필수 시청
            </div>
            <h2 className="text-2xl font-bold">Lesson 0: 수강 전 오리엔테이션</h2>
            <p className="text-slate-400 text-sm max-w-xl">
              매스플랫(MathFlat) 앱 설치부터 과제 제출 방법까지, 원활한 수강을 위해 반드시 시청해주세요.
            </p>
          </div>
          <Link 
            href="/dashboard/ot"
            className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-red-600/30"
          >
            <PlayCircle className="w-5 h-5" />
            OT 시청하기
          </Link>
        </div>
        {/* 장식용 배경 요소 */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-red-600/20 transition-all duration-700"></div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-red-600" />
          수강 중인 강의
        </h2>

        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrolledCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer flex flex-col h-full">
                <div className={`h-2 w-full ${course.thumbnailColor}`}></div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">{course.subtitle}</span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1 line-clamp-1 group-hover:text-red-600 transition-colors">{course.title}</h3>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-500">진도율</span>
                        <span className="font-bold text-red-600">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-red-600 h-2 rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }}></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Clock className="w-4 h-4" />
                        수강기한: {course.validUntil}
                      </div>
                      <Link 
                        href={`/dashboard/courses/${course.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-red-600 flex items-center gap-1 transition-colors"
                      >
                        강의실 입장
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">등록된 강의가 없습니다.</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
              아직 수강 신청한 강의가 없거나, 결제 승인 대기 중입니다. 네이버 스마트스토어에서 결제하셨다면 잠시만 기다려주세요!
            </p>
            <Link 
              href="/courses"
              className="inline-flex font-bold justify-center items-center px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all hover:shadow-lg"
            >
              전체 강의 둘러보기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
