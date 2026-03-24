import Link from 'next/link';
import { BookOpen, Home, LogOut, Compass, MessageCircle, User } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-brand-dark">
      {/* Sidebar Navigation */}
      <aside className="hidden w-64 border-r border-white/[0.06] bg-brand-surface flex-col md:flex">
        <div className="flex h-16 items-center px-6 border-b border-white/[0.06]">
          <Link href="/dashboard" className="text-xl font-black tracking-tight text-white hover:opacity-80 transition-opacity">
            jt<span className="brand-gradient-text">math</span><span className="text-brand-blue">.</span>
          </Link>
        </div>
        
        <nav className="flex-1 space-y-1 p-4">
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest px-3 pb-2 pt-2">학습 공간</div>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl bg-brand-blue/10 px-3 py-3 text-brand-blue transition-all hover:bg-brand-blue/20 font-bold"
          >
            <Home className="h-4 w-4" />
            <span className="text-sm">대시보드 홈</span>
          </Link>
          <Link
            href="/courses"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-white/50 transition-all hover:bg-white/[0.04] hover:text-white font-medium mb-4"
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-sm">모든 교육과정</span>
          </Link>
          
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest px-3 pb-2 pt-4">지원 및 설정</div>
          <a
            href="https://open.kakao.com/o/YOUR_LINK_HERE"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-white/50 transition-all hover:bg-white/[0.04] hover:text-white font-medium"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">1:1 질의응답</span>
          </a>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-white/50 transition-all hover:bg-white/[0.04] hover:text-white font-medium"
          >
            <User className="h-4 w-4" />
            <span className="text-sm">마이페이지</span>
          </Link>
        </nav>
        
        <div className="mt-auto border-t border-white/[0.06] p-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-white/30 transition-all hover:bg-white/[0.04] hover:text-white/60 text-left font-medium">
            <LogOut className="h-4 w-4" />
            <span className="text-sm">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-white/[0.06] bg-brand-surface px-6 md:hidden">
          <Link href="/dashboard" className="text-xl font-black tracking-tight text-white">
            jt<span className="brand-gradient-text">math</span><span className="text-brand-blue">.</span>
          </Link>
          <div className="ml-auto">
            <button className="text-sm font-medium text-white/40">메뉴</button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
