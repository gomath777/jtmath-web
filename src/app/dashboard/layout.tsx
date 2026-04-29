import Link from 'next/link';
import SidebarNav from './SidebarNav';
import LogoutButton from './LogoutButton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-parchment">
      {/* Sidebar Navigation */}
      <aside className="hidden w-64 border-r border-border-cream bg-ivory flex-col md:flex">
        <div className="flex h-16 items-center px-6 border-b border-border-cream">
          <Link href="/dashboard/learning" className="text-xl font-black tracking-tight text-ink hover:opacity-80 transition-opacity">
            jt<span className="brand-gradient-text">math</span><span className="text-terracotta">.</span>
          </Link>
        </div>

        <SidebarNav />

        <div className="mt-auto border-t border-border-cream p-4">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border-cream bg-ivory px-6 md:hidden">
          <Link href="/dashboard/learning" className="text-xl font-black tracking-tight text-ink">
            jt<span className="brand-gradient-text">math</span><span className="text-terracotta">.</span>
          </Link>
          <div className="ml-auto">
            <button className="text-sm font-medium text-charcoal">메뉴</button>
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
