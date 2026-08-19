'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, LockKeyhole } from 'lucide-react';
import { loginAdmin, loginUser } from './actions';

function LoginFormContent() {
  const [errorMessage, setErrorMessage] = useState('');
  const [adminErrorMessage, setAdminErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('registered') === 'true') {
      setSuccessMessage('회원가입이 완료되었습니다! 가입하신 정보로 로그인해주세요.');
    }
    if (searchParams?.get('reset') === 'true') {
      setSuccessMessage('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const formData = new FormData(e.currentTarget);
    const result = await loginUser(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
  }

  async function handleAdminSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsAdminLoading(true);
    setAdminErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const result = await loginAdmin(formData);

    if (result?.error) {
      setAdminErrorMessage(result.error);
      setIsAdminLoading(false);
    }
  }

  return (
    <>
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <h1 className="font-serif text-[28px] leading-tight tracking-tight text-ink">
          관리자 로그인
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-olive">
          관리자 비밀번호로 캘린더와 콘텐츠 대시보드에 들어갑니다.
        </p>
      </div>

      <form onSubmit={handleAdminSubmit} className="rounded-2xl border border-border-cream bg-ivory p-5 shadow-whisper">
        <label className="block">
          <span className="mb-2 block text-[13px] font-semibold text-charcoal">
            관리자 비밀번호
          </span>
          <input
            type="password"
            name="admin_passcode"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="off"
            disabled={isAdminLoading}
            placeholder="6자리"
            className="h-12 w-full rounded-xl border border-border-warm bg-parchment px-4 text-center font-mono text-[20px] tracking-[0.28em] text-ink outline-none placeholder:text-[14px] placeholder:tracking-normal placeholder:text-stone/60 focus:border-terracotta focus:shadow-ring-terracotta disabled:opacity-50"
          />
        </label>
        {adminErrorMessage && (
          <p className="mt-3 rounded-xl border border-terracotta/30 bg-terracotta/10 px-3 py-2 text-center text-[13px] font-medium text-terracotta">
            {adminErrorMessage}
          </p>
        )}
        <button
          type="submit"
          disabled={isAdminLoading}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-terracotta text-[14px] font-semibold text-ivory shadow-ring-terracotta transition-colors hover:bg-terracotta-light disabled:opacity-50"
        >
          {isAdminLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '관리자 페이지 열기'}
        </button>
      </form>

      <div className="my-7 flex items-center gap-3">
        <div className="h-px flex-1 bg-border-cream" />
        <span className="text-[12px] font-medium text-stone">기존 이메일 로그인</span>
        <div className="h-px flex-1 bg-border-cream" />
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-terracotta/30 bg-terracotta/10 p-3 text-[13px] font-semibold text-terracotta">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl border border-olive/30 bg-olive/10 p-3 text-[13px] font-semibold text-olive">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[13px] font-medium text-charcoal">이메일</label>
          <input
            type="email"
            name="email"
            placeholder="name@example.com"
            disabled={isLoading}
            className="w-full rounded-xl border border-border-warm bg-parchment px-4 py-3 text-ink outline-none placeholder:text-stone/60 focus:border-terracotta focus:shadow-ring-terracotta disabled:opacity-40"
            required
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[13px] font-medium text-charcoal">비밀번호</label>
            <Link href="/forgot-password" className="text-xs font-medium text-stone transition-colors hover:text-terracotta">
              비밀번호를 잊으셨나요?
            </Link>
          </div>
          <input
            type="password"
            name="password"
            disabled={isLoading}
            className="w-full rounded-xl border border-border-warm bg-parchment px-4 py-3 text-ink outline-none focus:border-terracotta focus:shadow-ring-terracotta disabled:opacity-40"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border-warm bg-parchment py-3 text-[14px] font-semibold text-charcoal transition-colors hover:bg-border-cream/30 disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              로그인 중...
            </>
          ) : '로그인'}
        </button>

        <div className="pt-5 border-t border-border-cream text-center space-y-3">
          <p className="text-[13px] text-stone">학생은 중간 4주 입구로 들어갑니다.</p>
          <Link
            href="/midterm-front"
            className="block w-full rounded-xl bg-olive/10 py-3 text-[14px] font-semibold text-olive transition-colors hover:bg-olive/15"
          >
            학생 입구로 이동
          </Link>
        </div>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-12">
        <div className="w-full rounded-2xl border border-border-cream bg-white/55 p-5 shadow-whisper md:p-6">
          <Suspense fallback={<div className="text-center text-stone">로딩 중...</div>}>
            <LoginFormContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
