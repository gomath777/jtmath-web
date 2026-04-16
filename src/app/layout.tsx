import type { Metadata } from 'next';
import { Gowun_Batang } from 'next/font/google';
import './globals.css';

// Headline serif — 고운 바탕 (modern, elegant Korean serif)
const gowunBatang = Gowun_Batang({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '고T수학 · 상위권의 시간은 다르게 흐른다',
  description:
    '출제자 출신 고T 선생님의 1대1 내신대비. 누적 수강생 200명+, 네이버 스토어 4.97점.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${gowunBatang.variable} font-sans bg-parchment text-ink`}>
        {children}
      </body>
    </html>
  );
}
