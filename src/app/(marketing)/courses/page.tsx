import Link from 'next/link';
import MainHeader from '@/components/MainHeader';
import { ChevronRight, ShieldCheck, Download, Clock } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export default async function CoursesPage() {
  const supabase = await createClient();
  
  // Fetch active courses from DB
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });

  // Use DB data or fallback for UI
  const displayCourses = courses && courses.length > 0 ? courses : [
    {
      id: "1",
      title: "기하학 마스터 클래스",
      subtitle: "중등 기하 완벽 대비반",
      description: "피타고라스 정리부터 원의 성질까지, 중등 기하의 모든 것을 한 방에 끝냅니다.",
      price: 50000,
      original_price: 80000,
      thumbnailColor: "bg-blue-600",
      features: ["총 24강", "단계별 PDF 교재", "1:1 카톡 질문"]
    },
    {
      id: "2",
      title: "대수학 기초 완성",
      subtitle: "방정식과 함수 총정리",
      description: "고등 수학의 핵심이 되는 기본 대수학의 개념을 완벽하게 다집니다.",
      price: 65000,
      original_price: 90000,
      thumbnailColor: "bg-emerald-600",
      features: ["총 30강", "심화 문제 풀이집", "1:1 카톡 질문"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <MainHeader />
      
      <main className="flex-1 container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">수강 신청</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            jtmath의 모든 정규 커리큘럼을 만나보세요. 네이버 스마트스토어 혹은 본 사이트(토스페이먼츠)에서 바로 결제 가능합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayCourses.map((course: any) => (
            <div key={course.id} className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col group">
              <div className={`h-3 w-full ${course.thumbnailColor || 'bg-slate-900'}`}></div>
              
              <div className="p-8 flex flex-col flex-1">
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded-full mb-4">
                    {course.subtitle}
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 line-clamp-2 group-hover:text-red-600 transition-colors">
                    {course.title}
                  </h2>
                  <p className="mt-3 text-slate-500 text-sm leading-relaxed line-clamp-3">
                    {course.description}
                  </p>
                </div>

                <div className="space-y-3 mb-8">
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">과정 혜택</h4>
                  {(course.features || ["무제한 반복 수강", "PDF 교재", "카톡 질의응답"]).map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      {course.original_price && (
                        <span className="text-sm text-slate-400 line-through block mb-1">
                          {Number(course.original_price).toLocaleString()}원
                        </span>
                      )}
                      <span className="text-2xl font-extrabold text-slate-900">
                        {Number(course.price).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/checkout/${course.id}`}
                    className="flex justify-center items-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all group-hover:bg-red-600 group-hover:shadow-lg group-hover:shadow-red-600/20"
                  >
                    수강 신청하기
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
