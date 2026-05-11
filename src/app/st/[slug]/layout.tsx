import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '고T수학',
  description: '학습 페이지',
};

export default function StPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-parchment">
      <header className="border-b border-border-cream bg-parchment/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center">
          <a href="/" className="font-serif text-[18px] text-ink tracking-tight">
            고<span className="text-terracotta">T</span>수학
          </a>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10">{children}</main>
    </div>
  );
}
