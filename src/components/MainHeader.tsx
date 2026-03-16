import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function MainHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-red-600">jtmath<span className="text-red-600">▶</span></span>
          </Link>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">HOME</Link>
            <Link href="/courses" className="hover:text-foreground transition-colors">교육과정</Link>
            <Link href="/about" className="hover:text-foreground transition-colors">ABOUT</Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold hover:text-red-600 transition-colors">
            로그인
          </Link>
          <Link href="/cart" className="relative text-muted-foreground hover:text-foreground transition-colors flex items-center">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              0
            </span>
          </Link>
        </div>

      </div>
    </header>
  );
}
