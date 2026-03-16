import MainHeader from '@/components/MainHeader';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <MainHeader />
      
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-white border-b border-border">
        <div className="max-w-4xl w-full py-20 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            수학, 외우지 말고<br />
            <span className="text-red-600">본질을 꿰뚫어라.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto">
            개념부터 심화 기출까지 완벽하게.<br />
            상위 1% 도약을 위한 가장 확실한 선택, jtmath입니다.
          </p>
          
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/courses"
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-colors w-full sm:w-auto text-lg shadow-lg shadow-red-600/20"
            >
              전체 코스 보기
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full transition-colors w-full sm:w-auto text-lg border border-slate-200"
            >
              내 수강현황
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1D212A] text-slate-400 py-12 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row justify-between gap-8 border-b border-slate-700 pb-8">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-200">ABOUT</h3>
              <div className="text-sm space-y-1">
                <p>📞 (09:00~20:00) 빠른 상담은 카톡 플러스친구 jtmath</p>
                <p>✉️ admin@jtmath.com</p>
                <p>📄 이용약관, 개인정보처리방침</p>
                <p>© jtmath, 강의 예제, 영상 복제 금지</p>
              </div>
            </div>
            <div>
              <a href="#" className="inline-flex py-3 px-6 bg-[#FEE500] hover:bg-[#FDD800] text-[#371D1E] font-bold rounded transition-colors text-sm items-center gap-2">
                <span>문의, 상담은 카톡 플러스친구 jtmath</span>
              </a>
            </div>
          </div>
          
          <div className="pt-8 text-xs text-slate-500 space-y-1">
            <p>상호: 제이티매쓰 | 학원등록명: 제이티매쓰원격학원 | 대표: 고창언</p>
            <p>사업자등록번호: 662-91-01993 | 통신판매업신고: 제 2025-인천서구-2807 호</p>
            <p>주소: 인천광역시 서구 보석로 32, 216동 401호 (청라동, 청라파크자이더테라스) | 개인정보보호책임자: 고창언</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
