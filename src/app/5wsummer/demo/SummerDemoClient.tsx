'use client';

import type { FormEvent, ReactNode } from 'react';
import { useId, useState } from 'react';

type SummerDemoClientProps = {
  readonly children: ReactNode;
};

const BIRTHDATE_PATTERN = /^\d{6}$/;
const FORMAT_ERROR = '생년월일 6자리를 숫자로 입력해 주세요.';

export function SummerDemoClient({ children }: SummerDemoClientProps) {
  const inputId = useId();
  const [birthdate, setBirthdate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedBirthdate = new FormData(event.currentTarget).get('birthdate');
    const parsedBirthdate = typeof submittedBirthdate === 'string' ? submittedBirthdate.trim() : '';
    setBirthdate(parsedBirthdate);
    if (!BIRTHDATE_PATTERN.test(parsedBirthdate)) {
      setError(FORMAT_ERROR);
      return;
    }
    setError(null);
    setUnlocked(true);
  }

  if (unlocked) return children;

  return (
    <main className="min-h-screen bg-parchment text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
        <div className="border-b border-border-cream pb-7">
          <p className="text-[11px] font-medium uppercase tracking-normal text-stone">2026 여름 데모</p>
          <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-normal md:text-[38px]">
            공수2 5주 특강 미리보기
          </h1>
          <p className="mt-3 break-keep text-[14px] leading-relaxed text-olive">
            생년월일 6자리를 입력하면 공통수학2 학습 달력을 확인할 수 있습니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-7 rounded-lg border border-border-cream bg-ivory p-5 shadow-whisper">
          <label htmlFor={inputId} className="block text-[13px] font-bold text-ink">
            생년월일 6자리
          </label>
            <input
              id={inputId}
              name="birthdate"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="예: 100101"
              autoComplete="off"
              value={birthdate}
              onChange={(event) => {
                setBirthdate(event.currentTarget.value);
                if (error) setError(null);
              }}
              className="mt-2 h-12 w-full rounded-lg border border-border-warm bg-parchment px-4 text-[18px] font-semibold tracking-normal text-ink outline-none transition placeholder:text-stone/40 focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${inputId}-error` : undefined}
            />

          {error ? (
            <p id={`${inputId}-error`} className="mt-2 text-[13px] font-semibold text-crimson">
              {error}
            </p>
          ) : (
            <p className="mt-2 break-keep text-[12px] leading-relaxed text-stone">
              데모용 화면입니다. 입력값은 이 화면을 벗어나 저장되지 않습니다.
            </p>
          )}

          <button
            type="submit"
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg bg-terracotta px-5 text-[14px] font-bold text-white transition hover:bg-terracotta-light focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:ring-offset-2 focus:ring-offset-ivory"
          >
            달력 보기
          </button>
        </form>
      </section>
    </main>
  );
}
