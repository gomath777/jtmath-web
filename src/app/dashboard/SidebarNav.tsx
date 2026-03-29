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
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-brand-orange transition-all hover:bg-brand-orange/10 ${isOT ? 'bg-brand-orange/10' : ''}`}
      >
        <PlayCircle className="h-4 w-4" />
        <span className="text-sm font-medium">오리엔테이션</span>
        <span className="ml-auto text-[10px] font-bold bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded">필수</span>
      </Link>

      <div className="h-px bg-white/[0.06] my-2" />

      <Link
        href="/dashboard/learning"
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
          isLearning
            ? 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20'
            : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
        }`}
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">내 학습</span>
      </Link>
      <Link
        href="/dashboard/supplements"
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
          isSupplements
            ? 'bg-brand-mint/10 text-brand-mint hover:bg-brand-mint/20'
            : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
        }`}
      >
        <FileText className="h-4 w-4" />
        <span className="text-sm font-medium">보충자료</span>
      </Link>
    </nav>
  );
}
