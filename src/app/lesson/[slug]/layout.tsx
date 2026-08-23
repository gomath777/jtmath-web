import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { verifyToken } from '@/utils/student-auth';

export const metadata: Metadata = {
  title: '고T수학',
  description: '학습 페이지',
  robots: { index: false, follow: false },
};

export default async function LessonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('student_session')?.value;
  const student = token ? await verifyToken(token) : null;

  return (
    <div className="min-h-screen bg-parchment">
      <header className="border-b border-border-cream bg-parchment/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="font-serif text-[18px] text-ink tracking-tight shrink-0">
            고<span className="text-terracotta">T</span>수학
          </Link>
          {student && (
            <a
              href={`/s/${student.slug}`}
              className="text-[12px] text-stone hover:text-terracotta tracking-tight transition-colors shrink-0"
            >
              내 대시보드 →
            </a>
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10">{children}</main>
    </div>
  );
}
