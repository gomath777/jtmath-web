import type { Metadata } from 'next';
import { CalendarDays, LockKeyhole, UserRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '2학기 중간고사 대비 4주 전반전',
  description: '학생 생년월일로 개인 학습 캘린더에 입장합니다.',
  robots: { index: false, follow: false },
};

type PageProps = {
  readonly searchParams?: {
    readonly error?: string | readonly string[];
  };
};

const ERROR_MESSAGE: Record<string, string> = {
  format: '생년월일 6자리를 숫자로 입력해 주세요.',
  invalid: '등록된 학생 정보를 찾지 못했습니다. 생년월일을 다시 확인해 주세요.',
  name: '같은 생년월일 학생이 있어 이름을 함께 입력해 주세요.',
  server: '잠시 후 다시 시도해 주세요.',
};

function firstParam(value: string | readonly string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function MidtermFrontLoginPage({ searchParams }: PageProps) {
  const errorKey = firstParam(searchParams?.error);
  const errorMessage = errorKey ? ERROR_MESSAGE[errorKey] : null;
  const shouldRequestName = errorKey === 'name';

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="mx-auto flex min-h-screen max-w-5xl items-center px-5 py-12 md:px-8">
        <div className="grid w-full gap-8 md:grid-cols-[1fr_380px] md:items-center">
          <section className="border-b border-border-cream pb-8 md:border-b-0 md:pb-0 md:pr-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone">
              jtmath · 2026 2학기
            </p>
            <h1 className="mt-3 font-serif text-[32px] leading-tight tracking-tight md:text-[42px]">
              중간고사 대비
              <br />
              4주 전반전
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-olive">
              생년월일 6자리를 입력하면 개인 학습 캘린더로 바로 이동합니다.
              목금 1차시, 월화 2차시 흐름에 맞춰 공개된 자료부터 확인할 수 있습니다.
            </p>
            <div className="mt-7 grid gap-3 text-[13px] text-charcoal sm:grid-cols-3">
              <div className="rounded-xl border border-border-cream bg-ivory px-4 py-3">
                <CalendarDays className="mb-2 h-4 w-4 text-terracotta" />
                개인 캘린더
              </div>
              <div className="rounded-xl border border-border-cream bg-ivory px-4 py-3">
                <LockKeyhole className="mb-2 h-4 w-4 text-terracotta" />
                일정별 공개
              </div>
              <div className="rounded-xl border border-border-cream bg-ivory px-4 py-3">
                <UserRound className="mb-2 h-4 w-4 text-terracotta" />
                본인 확인
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border-cream bg-ivory p-5 shadow-whisper">
            <div className="mb-5">
              <h2 className="font-serif text-[24px] leading-tight tracking-tight">입장하기</h2>
              <p className="mt-1.5 text-[13px] text-olive">생년월일 6자리</p>
            </div>

            {errorMessage && (
              <p className="mb-4 rounded-xl border border-terracotta/30 bg-terracotta/10 px-3 py-2 text-[13px] font-medium text-terracotta">
                {errorMessage}
              </p>
            )}

            <form action="/api/public/midterm-front-login" method="post" className="space-y-4">
              {shouldRequestName && (
                <label className="block">
                  <span className="mb-2 block text-[13px] font-semibold text-olive">이름</span>
                  <input
                    name="name"
                    type="text"
                    autoComplete="name"
                    className="h-12 w-full rounded-xl border border-border-warm bg-parchment px-4 text-[16px] text-ink outline-none placeholder:text-stone/60 focus:border-terracotta focus:shadow-ring-terracotta"
                    placeholder="학생 이름"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-[13px] font-semibold text-olive">
                  생년월일 6자리
                </span>
                <input
                  name="birth_pin"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-border-warm bg-parchment px-4 text-center font-mono text-[20px] tracking-[0.28em] text-ink outline-none placeholder:text-[14px] placeholder:tracking-normal placeholder:text-stone/60 focus:border-terracotta focus:shadow-ring-terracotta"
                  placeholder="YYMMDD"
                />
              </label>

              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-terracotta text-[14px] font-semibold text-ivory shadow-ring-terracotta transition-colors hover:bg-terracotta-light"
              >
                내 학습 캘린더 보기
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
