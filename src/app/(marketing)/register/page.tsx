import type { Metadata } from 'next';
import { ArrowRight, MessageCircle } from 'lucide-react';
import PublicHeader from '../_shared/PublicHeader';
import PublicFooter from '../_shared/PublicFooter';

const REGISTRATION_FORM_URL = 'https://forms.gle/NCdLAFx2E8MBzPBx6';
const KAKAO_CONTACT = '010 2914 1156';

export const metadata: Metadata = {
  title: '등록 안내 · 고T수학',
  description:
    '두 단계로 끝나는 등록 절차 — 등록신청서 작성 후 1:1 카톡메세지를 보내주세요.',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-parchment flex flex-col">
      <PublicHeader />

      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-12 sm:py-16">
        {/* Hero */}
        <header className="mb-10 sm:mb-12">
          <p className="text-[11px] tracking-[0.18em] uppercase text-stone font-medium mb-3">
            Registration
          </p>
          <h1 className="font-serif text-[30px] sm:text-[38px] text-ink tracking-tight leading-[1.2] break-keep">
            등록 안내
          </h1>
          <p className="tagline-italic text-[15px] sm:text-[16px] text-olive mt-3 break-keep">
            두 단계만 거치면 등록이 완료됩니다.
          </p>
        </header>

        <div className="space-y-6">
          {/* STEP 1 */}
          <section className="bg-ivory border border-border-cream rounded-2xl px-6 py-7 sm:px-8 sm:py-8 shadow-whisper">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] tracking-[0.18em] uppercase text-terracotta font-semibold">
                Step 1
              </span>
              <span className="h-px flex-1 bg-border-cream" />
            </div>
            <h2 className="font-serif text-[22px] sm:text-[24px] text-ink leading-snug break-keep mb-3">
              등록신청서 작성
            </h2>
            <p className="text-[15px] text-charcoal leading-relaxed break-keep mb-6">
              아래 버튼으로 등록신청서를 작성·전송해 주세요. 학생 정보와 희망 과목을
              한 페이지에 입력하면 됩니다.
            </p>
            <a
              href={REGISTRATION_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-terracotta text-ivory text-[14px] font-medium rounded-xl shadow-ring-terracotta hover:bg-terracotta-light transition-colors"
            >
              등록신청서 작성하기
              <ArrowRight className="w-4 h-4" />
            </a>
          </section>

          {/* STEP 2 */}
          <section className="bg-ivory border border-border-cream rounded-2xl px-6 py-7 sm:px-8 sm:py-8 shadow-whisper">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] tracking-[0.18em] uppercase text-terracotta font-semibold">
                Step 2
              </span>
              <span className="h-px flex-1 bg-border-cream" />
            </div>
            <h2 className="font-serif text-[22px] sm:text-[24px] text-ink leading-snug break-keep mb-3">
              1:1 카톡메세지
            </h2>
            <p className="text-[15px] text-charcoal leading-relaxed break-keep mb-5">
              신청서 전송 후 아래 연락처를 카카오톡 친구추가한 뒤 등록완료 메세지를 보내주세요.
            </p>

            <div className="bg-sand border border-border-warm rounded-xl px-5 py-4 mb-6">
              <p className="text-[13px] text-charcoal leading-relaxed break-keep">
                <span className="text-terracotta font-medium">
                  본인(학생) 이름으로 입장해 주세요.
                </span>
                <br />
                예) <strong className="text-ink">손흥민 고1 등록완료</strong>
                {' · '}
                <strong className="text-ink">홍길동 고2 등록완료</strong>
              </p>
            </div>

            <div className="inline-flex flex-col gap-2 rounded-xl bg-terracotta px-5 py-4 text-ivory shadow-ring-terracotta sm:flex-row sm:items-center sm:gap-4">
              <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                <MessageCircle className="h-4 w-4" />
                카카오톡 친구추가
              </span>
              <span className="text-[20px] font-semibold tracking-normal">
                {KAKAO_CONTACT}
              </span>
            </div>

            <div className="mt-5 pt-5 border-t border-border-cream">
              <p className="text-[15px] text-charcoal leading-relaxed break-keep">
                <strong className="text-ink">{KAKAO_CONTACT}</strong> 친구추가 후
                1:1 카톡으로 등록완료 메세지를 보내주세요.
              </p>
            </div>
          </section>
        </div>

        {/* After */}
        <p className="text-[14px] text-stone leading-relaxed break-keep mt-10 text-center">
          등록이 완료되면 OT 자료를 카톡으로 함께 안내해드립니다.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
