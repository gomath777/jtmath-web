import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import PublicHeader from '../_shared/PublicHeader';
import PublicFooter from '../_shared/PublicFooter';

const YOUTUBE_BACKUP_URL = 'https://youtu.be/4ObLI1aK6m0';

export const metadata: Metadata = {
  title: 'OT 자료 · 고T수학',
  description:
    '오답관리 어플(매쓰플랫) 설치·사용법, 그리고 카톡으로 질문하는 방법을 안내합니다.',
};

export default function OTPage() {
  return (
    <div className="min-h-screen bg-parchment flex flex-col">
      <PublicHeader />

      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-12 sm:py-16">
        {/* Hero */}
        <header className="mb-10 sm:mb-12">
          <p className="text-[11px] tracking-[0.18em] uppercase text-stone font-medium mb-3">
            Orientation
          </p>
          <h1 className="font-serif text-[30px] sm:text-[38px] text-ink tracking-tight leading-[1.2] break-keep">
            오답 어플 사용 & 카톡 질문 안내
          </h1>
          <p className="tagline-italic text-[15px] sm:text-[16px] text-olive mt-3 break-keep">
            채점 데이터가 다음 학습의 방향을 정합니다.
          </p>
        </header>

        <div className="space-y-6">
          {/* Section 1: 어플 */}
          <section className="bg-ivory border border-border-cream rounded-2xl px-6 py-7 sm:px-8 sm:py-8 shadow-whisper">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] tracking-[0.18em] uppercase text-terracotta font-semibold">
                오답관리 어플
              </span>
              <span className="h-px flex-1 bg-border-cream" />
            </div>
            <h2 className="font-serif text-[22px] sm:text-[24px] text-ink leading-snug break-keep mb-6">
              매쓰플랫 학생용 앱 설치 & 사용법
            </h2>

            {/* 1단계 */}
            <div className="space-y-4">
              <p className="text-[12px] tracking-[0.12em] uppercase text-stone font-medium">
                Step 1 · 앱 설치
              </p>
              <div className="text-[15px] text-charcoal leading-relaxed break-keep space-y-2">
                <p>
                  앱스토어 또는 구글플레이에서{' '}
                  <strong className="text-ink">&apos;매쓰플랫&apos;</strong> 학생용
                  앱을 설치해 주세요. (핸드폰·태블릿 모두 가능)
                </p>
                <p>
                  등록 완료 후 학생 본인{' '}
                  <span className="text-terracotta font-medium">
                    &apos;핸드폰번호&apos;만 입력
                  </span>
                  하면 자동 로그인 됩니다.{' '}
                  <span className="text-stone">(기본 비번 123456)</span>
                </p>
              </div>

              {/* 앱 스크린샷 */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/docs/app-mathflat-android.png"
                  alt="매쓰플랫 안드로이드 앱 스크린샷"
                  className="w-full rounded-xl border border-border-cream object-cover object-top max-h-64"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/docs/app-mathflat-ios.png"
                  alt="매쓰플랫 iOS 앱 스크린샷"
                  className="w-full rounded-xl border border-border-cream object-cover object-top max-h-64"
                />
              </div>
            </div>

            <hr className="my-8 border-border-cream" />

            {/* 2단계 */}
            <div className="space-y-4">
              <p className="text-[12px] tracking-[0.12em] uppercase text-stone font-medium">
                Step 2 · 사용법 영상
              </p>
              <p className="text-[15px] text-charcoal leading-relaxed break-keep">
                아래 영상으로 어플 사용법을 먼저 시청해 주세요.
              </p>

              <video
                src="/docs/ot-app-vid.mp4"
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-xl border border-border-cream bg-ink"
              />

              <p className="text-[13px] text-stone break-keep">
                재생이 안 되시면{' '}
                <a
                  href={YOUTUBE_BACKUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-terracotta hover:text-terracotta-light underline underline-offset-2 inline-flex items-center gap-1"
                >
                  YouTube에서 보기
                  <ExternalLink className="w-3 h-3" />
                </a>
                .
              </p>

              <div className="text-[15px] text-charcoal leading-relaxed break-keep space-y-2 pt-2">
                <p>
                  PDF 파일을 다운받아 문제를 풀고, 위에서 받은{' '}
                  <strong className="text-ink">어플에 접속해 답을 채점</strong>해
                  주세요.
                </p>
                <p>
                  채점 후{' '}
                  <span className="text-terracotta font-medium">
                    카톡으로 메세지를 보내야 피드백이 진행
                  </span>
                  됩니다.
                </p>
              </div>

              {/* 가장 중요합니다 콜아웃 */}
              <div className="bg-sand border border-border-warm rounded-xl px-5 py-4 mt-4">
                <p className="text-[14px] font-semibold text-ink break-keep mb-2">
                  💡 가장 중요합니다.
                </p>
                <div className="text-[13.5px] text-charcoal leading-relaxed break-keep space-y-1.5">
                  <p>
                    채점을 정확하게 해야,{' '}
                    <span className="text-ink font-medium">
                      채점 데이터를 근거로 다음 방향을 제시
                    </span>
                    할 수 있습니다.
                  </p>
                  <p className="text-terracotta">
                    모르는 문제는 찍지 말고 &apos;모름&apos; 선택해 주세요.
                  </p>
                  <p className="text-terracotta">
                    풀어서 맞았어도 쌍둥이 유사문제를 더 풀어보고 싶을 때도
                    &apos;모름&apos;을 선택해 주세요.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: 카톡 질문 */}
          <section className="bg-ivory border border-border-cream rounded-2xl px-6 py-7 sm:px-8 sm:py-8 shadow-whisper">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] tracking-[0.18em] uppercase text-terracotta font-semibold">
                질문하기
              </span>
              <span className="h-px flex-1 bg-border-cream" />
            </div>
            <h2 className="font-serif text-[22px] sm:text-[24px] text-ink leading-snug break-keep mb-3">
              카톡으로 질문하는 법
            </h2>

            <div className="text-[15px] text-charcoal leading-relaxed break-keep space-y-2 mb-5">
              <p className="text-ink font-medium break-keep">
                🔴 정확히 본인이 어느 과정에서 막혔는지 파악한 다음에 질문해야
                합니다.
              </p>
              <p>그래야 사고 단계의 빈틈을 채울 수 있습니다.</p>
              <p className="text-terracotta">
                어디까지 생각했고, 어느 부분에서 모르겠는지 문제를 캡쳐해서
                보내주세요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/docs/katalk-asking1.jpg"
                alt="카톡 질문 예시 1 — 막힌 지점 메모와 문제 캡쳐"
                className="w-full rounded-xl border border-border-cream"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/docs/katalk-asking2.jpg"
                alt="카톡 질문 예시 2 — 사고 과정 설명"
                className="w-full rounded-xl border border-border-cream"
              />
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
