import MainHeader from '@/components/MainHeader';
import FooterDisclosure from '@/components/FooterDisclosure';
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

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.15]">
            상위권의 시간은<br />
            <span className="brand-gradient-text">다르게 흐릅니다.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 font-medium max-w-2xl mx-auto">
            출제자가 만든 1대1 온라인 수학 내신대비
          </p>

          {/* 신뢰 지표 */}
          <div className="flex items-center justify-center gap-8 md:gap-12 pt-2">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-black text-white">200명<span className="text-brand-mint">+</span></p>
              <p className="text-xs text-white/30 mt-1">누적 수강생</p>
            </div>
            <div className="w-px h-10 bg-white/[0.08]" />
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-black text-white">50회<span className="text-brand-mint">+</span></p>
              <p className="text-xs text-white/30 mt-1">내신 출제 경험</p>
            </div>
            <div className="w-px h-10 bg-white/[0.08]" />
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-black text-white">4.97<span className="text-brand-mint">점</span></p>
              <p className="text-xs text-white/30 mt-1">네이버 스토어</p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-xl transition-all w-full sm:w-auto text-lg shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40 hover:scale-[1.02]"
            >
              로그인하기 →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-dark border-t border-white/[0.06] text-white/40 py-8 px-6">
        <div className="container mx-auto max-w-5xl">
          <FooterDisclosure />
          <div className="text-xs text-white/25 space-y-1 font-mono mt-4">
            <p>상호: 제이티매쓰 | 학원등록명: 제이티매쓰원격학원 | 대표: 고창언</p>
            <p>사업자등록번호: 662-91-01993 | 통신판매업신고: 제 2025-인천서구-2807 호</p>
            <p>주소: 인천광역시 서구 보석로 32 | 개인정보보호책임자: 고창언</p>
            <p className="pt-2">© 2024 jtmath. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
