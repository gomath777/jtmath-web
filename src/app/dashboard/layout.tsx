import Link from 'next/link';
import { LogOut } from 'lucide-react';
import SidebarNav from './SidebarNav';

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

        <SidebarNav />

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
