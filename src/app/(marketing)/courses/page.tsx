import Link from 'next/link';
import MainHeader from '@/components/MainHeader';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export default async function CoursesPage() {
  const supabase = await createClient();
  
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });

  const displayCourses = courses && courses.length > 0 ? courses : [
    {
      id: "1",
      title: "Δ0 기초 빌드업",
      subtitle: "Delta Zero",
      description: "수학의 핵심 개념을 데이터 기반으로 완벽하게 빌드업합니다. 기초부터 탄탄하게.",
      price: 50000,
      original_price: 80000,
      level: "FOUNDATION",
      features: ["총 24강", "단계별 PDF 교재", "1:1 카톡 질문"]
    },
    {
      id: "2",
      title: "Δ1 핵심 실전",
      subtitle: "Delta One",
      description: "실전 문제 풀이 알고리즘을 체화합니다. 오답률 높은 유형을 집중 공략.",
      price: 65000,
      original_price: 90000,
      level: "CORE",
      features: ["총 30강", "심화 문제 풀이집", "1:1 카톡 질문"]
    }
  ];

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <MainHeader />
      
      <main className="flex-1 container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-surface border border-white/[0.06] text-xs font-mono text-white/40">
            CURRICULUM v2.0
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">수강 신청</h1>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            jtmath의 모든 정규 커리큘럼을 만나보세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCourses.map((course: any) => (
            <div key={course.id} className="brand-card overflow-hidden flex flex-col group hover:border-brand-blue/30 transition-all duration-300">
              {/* Top accent line */}
              <div className="h-1 w-full bg-gradient-to-r from-brand-blue to-brand-mint" />
              
              <div className="p-8 flex flex-col flex-1">
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 bg-brand-blue/10 text-brand-blue font-mono text-xs rounded-md mb-4">
                    {course.subtitle || course.level || "COURSE"}
                  </span>
                  <h2 className="text-xl font-bold text-white line-clamp-2 group-hover:text-brand-blue transition-colors">
                    {course.title}
                  </h2>
                  <p className="mt-3 text-white/40 text-sm leading-relaxed line-clamp-3">
                    {course.description}
                  </p>
                </div>

                <div className="space-y-2.5 mb-8">
                  {(course.features || ["무제한 반복 수강", "PDF 교재", "카톡 질의응답"]).map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-white/50">
                      <span className="text-brand-mint text-xs">✓</span>
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6 border-t border-white/[0.06]">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      {course.original_price && (
                        <span className="text-sm text-white/25 line-through block mb-1">
                          {Number(course.original_price).toLocaleString()}원
                        </span>
                      )}
                      <span className="text-2xl font-extrabold text-white">
                        {Number(course.price).toLocaleString()}<span className="text-sm font-normal text-white/40">원</span>
                      </span>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/checkout/${course.id}`}
                    className="flex justify-center items-center gap-2 w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40"
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
