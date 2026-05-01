/**
 * 어드민 페이지 공용 레이아웃 (헤더 + 사이드바 + 콘텐츠).
 *
 * 사용:
 *   <AdminLayout activeNav="concept">...</AdminLayout>
 *
 * navItems는 한 곳에서 관리. 새 어드민 페이지 추가 시 여기 한 군데만 수정.
 */

import Link from 'next/link';
import {
  Users,
  CreditCard,
  LayoutDashboard,
  BookOpen,
  Video,
  Calendar,
  Sparkles,
} from 'lucide-react';

export type AdminNavKey =
  | 'users'
  | 'payments'
  | 'stats'
  | 'content'
  | 'concept'
  | 'concept-assign'
  | 'curriculum';

interface NavItem {
  key: AdminNavKey;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'users', href: '/admin?tab=users', icon: Users, label: '수강생 관리' },
  { key: 'payments', href: '/admin?tab=payments', icon: CreditCard, label: '결제 내역' },
  { key: 'stats', href: '/admin?tab=stats', icon: LayoutDashboard, label: '현황 요약' },
  { key: 'content', href: '/admin/content-library', icon: BookOpen, label: '보충자료' },
  { key: 'concept', href: '/admin/concept-lectures', icon: Video, label: '개념강의' },
  { key: 'concept-assign', href: '/admin/concept-assign', icon: Sparkles, label: '자연어 배정' },
  { key: 'curriculum', href: '/admin/curriculum', icon: Calendar, label: '커리큘럼' },
];

export default function AdminLayout({
  children,
  activeNav,
}: {
  children: React.ReactNode;
  activeNav: AdminNavKey;
}) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-extrabold text-xl tracking-tight text-white hover:text-red-400 transition-colors">
            jtmath <span className="text-red-500 text-base font-bold bg-white/10 px-2 py-0.5 rounded ml-1">ADMIN</span>
          </Link>
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-xs">
            대시보드 &rarr;
          </Link>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl flex gap-8">
        <div className="w-56 shrink-0 hidden md:block">
          <nav className="space-y-1 sticky top-24">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${
                  activeNav === item.key
                    ? 'bg-white text-red-600 shadow-sm border border-slate-100'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}
