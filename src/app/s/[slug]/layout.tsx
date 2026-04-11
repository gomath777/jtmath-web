import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '고T수학 학습 포탈',
  description: '개인 학습 대시보드',
};

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Minimal top bar */}
      <header className="border-b border-white/[0.06] bg-brand-dark/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center">
          <span className="text-sm font-black text-white tracking-tight">
            jtmath<span className="text-brand-blue">.</span>
          </span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
