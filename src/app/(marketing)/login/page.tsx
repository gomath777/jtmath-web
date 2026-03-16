'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MainHeader from '@/components/MainHeader';
import { loginUser } from './actions';

function LoginFormContent() {
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('registered') === 'true') {
      setSuccessMessage('회원가입이 완료되었습니다! 가입하신 정보로 로그인해주세요.');
    }
  }, [searchParams]);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    const result = await loginUser(formData);
    
    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">로그인</h1>
        <p className="mt-2 text-sm text-white/40">내 강의실에 입장하세요.</p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-brand-orange/10 text-brand-orange rounded-lg text-sm font-semibold border border-brand-orange/20">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-brand-mint/10 text-brand-mint rounded-lg text-sm font-semibold border border-brand-mint/20">
          {successMessage}
        </div>
      )}

      <form action={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-white/60">이메일</label>
          <input 
            type="email"
            name="email"
            placeholder="name@example.com"
            className="w-full px-4 py-3 rounded-lg border border-white/[0.08] bg-brand-elevated text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
            required 
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-white/60">비밀번호</label>
            <Link href="#" className="text-xs text-white/30 hover:text-brand-blue font-medium transition-colors">비밀번호를 잊으셨나요?</Link>
          </div>
          <input 
            type="password"
            name="password"
            className="w-full px-4 py-3 rounded-lg border border-white/[0.08] bg-brand-elevated text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
            required 
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-blue hover:bg-blue-600 disabled:bg-brand-blue/50 text-white font-bold py-4 rounded-xl transition-all text-lg mt-4 shadow-lg shadow-brand-blue/20"
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>

        <div className="pt-6 border-t border-white/[0.06] text-center space-y-4">
          <p className="text-sm text-white/30">아직 등록하지 않으셨나요?</p>
          <Link 
            href="/signup" 
            className="block w-full bg-brand-surface hover:bg-brand-elevated text-white/80 font-bold py-4 rounded-xl border border-white/[0.08] transition-all"
          >
            시작하기 (회원가입)
          </Link>
        </div>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-dark">
      <MainHeader />
      
      <main className="flex-1 container mx-auto px-4 py-12 flex justify-center items-center">
        <div className="w-full max-w-md brand-card p-8 md:p-10">
          <Suspense fallback={<div className="text-center text-white/30">로딩 중...</div>}>
            <LoginFormContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
