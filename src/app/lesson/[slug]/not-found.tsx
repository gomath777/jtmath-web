import Link from 'next/link';

export default function LessonNotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="font-serif text-[24px] text-ink mb-3">학습 페이지를 찾을 수 없습니다</h1>
      <p className="text-[14px] text-stone mb-8">
        링크가 잘못됐거나 페이지가 아직 준비되지 않았어요.
      </p>
      <Link
        href="/"
        className="inline-block text-[13px] text-terracotta hover:underline"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
