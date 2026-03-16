import Link from 'next/link';
import { BookOpen, Home, LogOut } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar Navigation */}
      <aside className="hidden w-64 border-r border-border bg-card flex-col md:flex">
        <div className="flex h-16 items-center px-6 border-b border-border">
          <Link href="/dashboard" className="text-xl font-black tracking-tight text-red-600 hover:opacity-80 transition-opacity">
            jtmath<span className="text-red-600">▶</span>
          </Link>
        </div>
        
        <nav className="flex-1 space-y-2 p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-primary transition-all hover:bg-primary/20"
          >
            <Home className="h-4 w-4" />
            <span className="text-sm font-medium">내 강의실 (대시보드)</span>
          </Link>
          <Link
            href="/dashboard/courses"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-sm font-medium">전체 강의 목록</span>
          </Link>
        </nav>
        
        <div className="mt-auto border-t border-border p-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground text-left">
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 md:hidden">
          <Link href="/dashboard" className="text-xl font-black tracking-tight text-red-600">
            jtmath<span className="text-red-600">▶</span>
          </Link>
          <div className="ml-auto">
            {/* Mobile menu button could go here */}
            <button className="text-sm font-medium text-muted-foreground">메뉴</button>
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
