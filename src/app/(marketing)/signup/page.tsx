'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MainHeader from '@/components/MainHeader';
import { signupUser } from './actions';

function SignupFormContent() {
  const [useSameEmail, setUseSameEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('check_email') === 'true') {
      setIsSuccess(true);
    }
  }, [searchParams]);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setErrorMessage('');
    
    const result = await signupUser(formData);
    
    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md brand-card p-8 md:p-12 text-center">
        <div className="w-16 h-16 bg-brand-mint/10 text-brand-mint rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">이메일을 확인해주세요!</h1>
        <p className="text-white/50 mb-8">
          입력하신 가입용 이메일로 인증 링크를 발송했습니다.<br/>
          링크를 클릭하시면 가입이 최종 완료됩니다.
        </p>
        <Link 
          href="/login"
          className="w-full block bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-brand-blue/20"
        >
          로그인 페이지로 가기
        </Link>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 rounded-lg border border-white/[0.08] bg-brand-elevated text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all";

  return (
    <div className="w-full max-w-xl brand-card p-8 md:p-12">
      
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold text-white">회원가입</h1>
        <p className="mt-2 text-sm text-white/40">jtmath에서 상위 1%로 도약하세요.</p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-brand-orange/10 text-brand-orange rounded-lg text-sm font-semibold border border-brand-orange/20">
          {errorMessage}
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-4 border-b border-white/[0.06] pb-8">
          <h2 className="font-bold text-white/80 text-sm tracking-wider uppercase">기본 정보</h2>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-white/60">이메일 (아이디) *</label>
            <input type="email" name="email" placeholder="name@example.com" className={inputClass} required />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-white/60">비밀번호 입력 *</label>
            <input type="password" name="password" className={inputClass} required minLength={6} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-white/60">비밀번호 재입력 *</label>
            <input type="password" name="passwordConfirm" className={inputClass} required />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h2 className="font-bold text-white/80 text-sm tracking-wider uppercase">학생 추가 정보</h2>
          <p className="text-xs text-white/30 mb-4">(주의) 정확한 학생 관리를 위해 모든 항목을 입력해주세요.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/60">이름 *</label>
              <input type="text" name="name" className={inputClass} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/60">생년월일 (6자리) *</label>
              <input type="text" name="birth_date" placeholder="예: 050101" className={inputClass} required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-white/60">학교 *</label>
            <input type="text" name="school" placeholder="예: 경기고등학교" className={inputClass} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/60">본인 연락처 *</label>
              <input type="tel" name="phone_student" placeholder="010-0000-0000" className={inputClass} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/60">학부모 연락처 *</label>
              <input type="tel" name="phone_parent" placeholder="010-0000-0000" className={inputClass} required />
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/60">과제 수신 이메일 *</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" name="useSameEmail"
                  className="rounded text-brand-blue focus:ring-brand-blue bg-brand-elevated border-white/10"
                  checked={useSameEmail} onChange={(e) => setUseSameEmail(e.target.checked)}
                />
                <span className="text-xs font-medium text-white/30 hover:text-white/60">가입용 이메일과 동일</span>
              </label>
            </div>
            {!useSameEmail && (
              <input type="email" name="assignment_email" placeholder="과제를 받을 이메일 주소" className={inputClass} required={!useSameEmail} />
            )}
          </div>
        </div>

        <div className="pt-6">
          <label className="flex items-start gap-3 p-4 rounded-lg bg-brand-elevated border border-white/[0.06] cursor-pointer">
            <input type="checkbox" className="mt-1 rounded text-brand-blue focus:ring-brand-blue bg-brand-surface border-white/10" required />
            <span className="text-sm text-white/50">
              <Link href="/terms" className="font-bold text-brand-blue hover:underline">이용약관</Link> 및 <Link href="/privacy" className="font-bold text-brand-blue hover:underline">개인정보처리방침</Link>에 모두 동의합니다.
            </span>
          </label>
        </div>

        <button type="submit" disabled={isLoading}
          className="w-full bg-brand-blue hover:bg-blue-600 disabled:bg-brand-blue/50 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-blue/20 transition-all text-lg"
        >
          {isLoading ? '가입 처리 중...' : '가입완료'}
        </button>

        <div className="text-center mt-6">
          <p className="text-sm text-white/30">
            이미 수강생이신가요? <Link href="/login" className="font-bold text-white hover:text-brand-blue transition-colors">로그인하기</Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-dark">
      <MainHeader />
      <main className="flex-1 container mx-auto px-4 py-12 flex justify-center items-center">
        <Suspense fallback={<div className="text-center text-white/30">로딩 중...</div>}>
          <SignupFormContent />
        </Suspense>
      </main>
    </div>
  );
}
