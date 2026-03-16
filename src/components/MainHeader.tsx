import Link from 'next/link';

export default function MainHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-brand-dark/95 backdrop-blur-xl supports-[backdrop-filter]:bg-brand-dark/80">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-white">
              jt<span className="brand-gradient-text">math</span><span className="text-brand-blue">.</span>
            </span>
          </Link>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/50">
            <Link href="/" className="hover:text-white transition-colors duration-200">HOME</Link>
            <Link href="/courses" className="hover:text-white transition-colors duration-200">교육과정</Link>
            <Link href="/about" className="hover:text-white transition-colors duration-200">ABOUT</Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link 
            href="/login" 
            className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
          >
            로그인
          </Link>
          <Link 
            href="/signup" 
            className="text-sm font-semibold bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
          >
            시작하기
          </Link>
        </div>

      </div>
    </header>
  );
}
