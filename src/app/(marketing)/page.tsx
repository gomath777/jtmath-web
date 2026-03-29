import MainHeader from '@/components/MainHeader';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-dark">
      <MainHeader />
      
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(41,121,255,0.08)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(0,230,118,0.05)_0%,_transparent_50%)]" />
        
        <div className="max-w-4xl w-full py-24 text-center space-y-8 relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-surface border border-white/[0.06] text-xs font-medium text-white/60">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse" />
            Data-Driven Mathematics Platform
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.1]">
            수학, 외우지 말고<br />
            <span className="brand-gradient-text">알고리즘으로 풀어라.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 font-medium max-w-2xl mx-auto leading-relaxed">
            오답 데이터 기반 개인별 학습 시스템.<br />
            상위 1% 도약을 위한 압도적 효율의 선택, <span className="text-white font-semibold">jtmath.</span>
          </p>
          
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-xl transition-all w-full sm:w-auto text-lg shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40 hover:scale-[1.02]"
            >
              내 수강현황 →
            </Link>
          </div>

          {/* Tech Stack Badges */}
          <div className="pt-12 flex items-center justify-center gap-6 text-white/30 text-xs font-mono">
            <span>Δ0 기초</span>
            <span className="w-px h-3 bg-white/10" />
            <span>Δ1 실전</span>
            <span className="w-px h-3 bg-white/10" />
            <span>Δ2 심화</span>
            <span className="w-px h-3 bg-white/10" />
            <span>Δ FINAL</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-dark border-t border-white/[0.06] text-white/40 py-8 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-xs text-white/25 space-y-1 font-mono">
            <p>상호: 제이티매쓰 | 학원등록명: 제이티매쓰원격학원 | 대표: 고창언</p>
            <p>사업자등록번호: 662-91-01993 | 통신판매업신고: 제 2025-인천서구-2807 호</p>
            <p>주소: 인천광역시 서구 보석로 32 | 개인정보보호책임자: 고창언</p>
            <p className="pt-2">© 2025 jtmath. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
