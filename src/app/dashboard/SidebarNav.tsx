'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlayCircle, Calendar, FileText } from 'lucide-react';

export default function SidebarNav() {
  const pathname = usePathname();

  const isLearning = pathname.startsWith('/dashboard/learning') || pathname === '/dashboard';
  const isSupplements = pathname.startsWith('/dashboard/supplements');
  const isOT = pathname.startsWith('/dashboard/ot');

  return (
    <nav className="flex-1 space-y-1 p-4">
      <Link
        href="/dashboard/ot"
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-crimson transition-all hover:bg-crimson/10 ${isOT ? 'bg-crimson/10' : ''}`}
      >
        <PlayCircle className="h-4 w-4" />
        <span className="text-sm font-medium">오리엔테이션</span>
        <span className="ml-auto text-[10px] font-bold bg-crimson/20 text-crimson px-1.5 py-0.5 rounded">필수</span>
      </Link>

      <div className="h-px bg-border-cream my-2" />

      <Link
        href="/dashboard/learning"
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
          isLearning
            ? 'bg-terracotta/10 text-terracotta hover:bg-terracotta/20'
            : 'text-olive hover:bg-sand/60 hover:text-ink'
        }`}
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">내 학습</span>
      </Link>
      <Link
        href="/dashboard/supplements"
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
          isSupplements
            ? 'bg-olive/10 text-olive hover:bg-olive/20'
            : 'text-olive hover:bg-sand/60 hover:text-ink'
        }`}
      >
        <FileText className="h-4 w-4" />
        <span className="text-sm font-medium">보충자료</span>
      </Link>
    </nav>
  );
}
