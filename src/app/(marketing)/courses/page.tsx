import Link from 'next/link';
import MainHeader from '@/components/MainHeader';
import { ChevronRight } from 'lucide-react';

// Curriculum Data based on curr.md specification
const subjects = [
  { id: "common-math-1", name: "공통수학 1", icon: "01" },
  { id: "common-math-2", name: "공통수학 2", icon: "02" },
  { id: "algebra", name: "대수", icon: "03" },
  { id: "calculus-1", name: "미적분 1", icon: "04" },
  { id: "geometry", name: "기하", icon: "05" },
  { id: "calculus-2", name: "미적분 2", icon: "06" },
  { id: "probability", name: "확률과 통계", icon: "07" },
];

const deltaModules = [
  {
    key: "delta-0",
    label: "Δ0",
    name: "기초",
    fullName: "Delta Zero",
    description: "실전 개념 탑재 및 기본기 완성",
    color: "text-brand-mint",
    bgColor: "bg-brand-mint/10",
    borderColor: "border-brand-mint/20",
    dotColor: "bg-brand-mint",
  },
  {
    key: "delta-1",
    label: "Δ1",
    name: "실전",
    fullName: "Delta One",
    description: "필수 기출 및 빈출 유형 패턴 분석",
    color: "text-brand-blue",
    bgColor: "bg-brand-blue/10",
    borderColor: "border-brand-blue/20",
    dotColor: "bg-brand-blue",
  },
  {
    key: "delta-2",
    label: "Δ2",
    name: "심화",
    fullName: "Delta Two",
    description: "킬러 문항 및 최상위권 고난도 딥다이브",
    color: "text-brand-orange",
    bgColor: "bg-brand-orange/10",
    borderColor: "border-brand-orange/20",
    dotColor: "bg-brand-orange",
  },
  {
    key: "delta-final",
    label: "Δ F",
    name: "FINAL",
    fullName: "Delta Final",
    description: "실전 모의고사 및 최종 점검",
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    borderColor: "border-purple-400/20",
    dotColor: "bg-purple-400",
  },
];

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <MainHeader />
      
      <main className="flex-1 container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-surface border border-white/[0.06] text-xs font-mono text-white/40">
            CURRICULUM v2.0
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">교육과정</h1>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            7개 과목 × 4단계 Delta 모듈. 본인의 수준에 맞춰 선택 수강하세요.
          </p>
        </div>

        {/* Delta Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {deltaModules.map((delta) => (
            <div key={delta.key} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${delta.bgColor} border ${delta.borderColor}`}>
              <span className={`w-2 h-2 rounded-full ${delta.dotColor}`} />
              <span className={`text-xs font-mono font-bold ${delta.color}`}>{delta.label}</span>
              <span className="text-xs text-white/40">{delta.name}</span>
            </div>
          ))}
        </div>

        {/* Subject Grid */}
        <div className="space-y-6">
          {subjects.map((subject) => (
            <div key={subject.id} className="brand-card overflow-hidden group hover:border-white/[0.12] transition-all duration-300">
              <div className="p-6 md:p-8">
                {/* Subject Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center">
                    <span className="text-xs font-mono font-bold text-brand-blue">{subject.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-white">{subject.name}</h2>
                    <p className="text-xs font-mono text-white/30 mt-0.5">/{subject.id}/</p>
                  </div>
                </div>

                {/* Delta Modules - Roadmap Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {deltaModules.map((delta, idx) => (
                    <Link
                      key={delta.key}
                      href={`/courses/${subject.id}/${delta.key}`}
                      className={`relative p-4 rounded-xl bg-brand-elevated border border-white/[0.04] hover:border-white/[0.12] transition-all duration-200 group/card hover:scale-[1.02]`}
                    >
                      {/* Connection line between cards (desktop only) */}
                      {idx < deltaModules.length - 1 && (
                        <div className="hidden lg:block absolute top-1/2 -right-3 w-3 h-px bg-white/[0.08]" />
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2 h-2 rounded-full ${delta.dotColor}`} />
                        <span className={`text-xs font-mono font-bold ${delta.color}`}>{delta.label}</span>
                        <span className="text-[10px] text-white/20 font-mono">{delta.fullName}</span>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-1 group-hover/card:text-brand-blue transition-colors">
                        {subject.name} — {delta.name}
                      </h3>
                      <p className="text-xs text-white/30 leading-relaxed">
                        {delta.description}
                      </p>

                      <div className="mt-3 flex items-center gap-1 text-[10px] font-mono text-white/20 group-hover/card:text-brand-blue/60 transition-colors">
                        상세보기 <ChevronRight className="w-3 h-3" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center brand-card p-8 md:p-12">
          <h3 className="text-xl font-bold text-white mb-2">어떤 과목부터 시작할지 고민되시나요?</h3>
          <p className="text-white/40 text-sm mb-6">카카오톡으로 상담하시면 맞춤 커리큘럼을 추천해드립니다.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FEE500] hover:bg-[#FDD800] text-[#371D1E] font-bold rounded-xl transition-colors text-sm"
            >
              카카오톡 상담하기
            </a>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-blue/20 text-sm"
            >
              회원가입 후 수강신청
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
