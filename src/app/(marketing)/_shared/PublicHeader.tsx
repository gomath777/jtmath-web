import Link from 'next/link';

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-cream bg-parchment/90 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="font-serif text-[18px] text-ink tracking-tight">
            고<span className="text-terracotta">T</span>수학
          </span>
          <span className="text-[12px] font-medium text-stone tracking-tight lowercase">
            jtmath
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-[13px] font-medium">
          <Link
            href="/register"
            className="text-charcoal hover:text-terracotta transition-colors"
          >
            등록안내
          </Link>
          <Link
            href="/midterm-front"
            className="text-stone hover:text-ink transition-colors"
          >
            로그인
          </Link>
        </nav>
      </div>
    </header>
  );
}
