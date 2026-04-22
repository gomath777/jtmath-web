import FooterDisclosure from '@/components/FooterDisclosure';

export default function PublicFooter() {
  return (
    <footer className="border-t border-border-cream bg-parchment py-10 px-5 mt-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <FooterDisclosure />
        <div className="text-[11px] text-stone font-mono leading-relaxed space-y-1">
          <p>
            상호: 제이티매쓰 · 학원등록명: 제이티매쓰원격학원 · 대표: 고창언
          </p>
          <p>
            사업자등록번호: 662-91-01993 · 통신판매업신고: 제 2025-인천서구-2807
            호
          </p>
          <p>
            주소: 인천광역시 서구 보석로 32 · 개인정보보호책임자: 고창언
          </p>
          <p className="pt-2">© 2024 jtmath. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
