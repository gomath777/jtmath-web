import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '고T수학 · 학습 포탈',
  description: '상위권의 시간은 다르게 흐른다.',
};

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-parchment">
      {/* Editorial top bar */}
      <header className="border-b border-border-cream bg-parchment/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <a href="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-serif text-[18px] text-ink tracking-tight">
              고<span className="text-terracotta">T</span>수학
            </span>
            <span className="text-[12px] font-medium text-stone tracking-tight lowercase">
              jtmath
            </span>
          </a>
          <p className="tagline-italic text-[13px] text-olive hidden sm:block truncate">
            상위권의 시간은 다르게 흐른다
          </p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10">{children}</main>
    </div>
  );
}
