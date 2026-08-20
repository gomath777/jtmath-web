import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '고T수학 · 학습자료',
  description: '학원 학습자료',
};

/**
 * 오프라인 학원생용 미니멀 layout.
 * 온라인 포탈(`/s/<slug>`) layout과 비교 시:
 *   - jtmath 작은 텍스트 제거
 *   - 슬로건 "상위권의 시간은 다르게 흐른다" 제거
 *   - 푸터 그대로 없음 (온라인도 원래 푸터 없음)
 */
export default function ClassroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-parchment">
      <header className="border-b border-border-cream bg-parchment/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-start">
          <span className="font-serif text-[18px] text-ink tracking-tight">
            고<span className="text-terracotta">T</span>수학
          </span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10">{children}</main>
    </div>
  );
}
