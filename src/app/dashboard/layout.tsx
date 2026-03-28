import Link from 'next/link';
import { LogOut, PlayCircle, Calendar, FileText } from 'lucide-react';

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
          <Link href="/dashboard/learning" className="text-xl font-black tracking-tight text-white hover:opacity-80 transition-opacity">
            jt<span className="brand-gradient-text">math</span><span className="text-brand-blue">.</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {/* OT */}
          <Link
            href="/dashboard/ot"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-brand-orange transition-all hover:bg-brand-orange/10"
          >
            <PlayCircle className="h-4 w-4" />
            <span className="text-sm font-medium">오리엔테이션</span>
            <span className="ml-auto text-[10px] font-bold bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded">필수</span>
          </Link>

          <div className="h-px bg-white/[0.06] my-2" />

          <Link
            href="/dashboard/learning"
            className="flex items-center gap-3 rounded-lg bg-brand-blue/10 px-3 py-2.5 text-brand-blue transition-all hover:bg-brand-blue/20"
          >
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">내 학습</span>
          </Link>
          <Link
            href="/dashboard/supplements"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-white/40 transition-all hover:bg-white/[0.04] hover:text-white/70"
          >
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">보충자료</span>
          </Link>
        </nav>

        <div className="mt-auto border-t border-white/[0.06] p-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-white/30 transition-all hover:bg-white/[0.04] hover:text-white/60 text-left">
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-white/[0.06] bg-brand-surface px-6 md:hidden">
          <Link href="/dashboard/learning" className="text-xl font-black tracking-tight text-white">
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
