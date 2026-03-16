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
      <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">이메일을 확인해주세요!</h1>
        <p className="text-slate-600 mb-8">
          입력하신 가입용 이메일로 인증 링크를 발송했습니다.<br/>
          링크를 클릭하시면 가입이 최종 완료됩니다.
        </p>
        <Link 
          href="/login"
          className="w-full block bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all"
        >
          로그인 페이지로 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100">
      
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold text-slate-900">회원가입</h1>
        <p className="mt-2 text-sm text-slate-500">jtmath에서 상위 1%로 도약하세요.</p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-semibold border border-red-100">
          {errorMessage}
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-4 border-b border-slate-100 pb-8">
          <h2 className="font-bold text-slate-900">기본 정보</h2>
          
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">이메일 (아이디) *</label>
            <input 
              type="email"
              name="email"
              placeholder="name@example.com"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
              required 
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">비밀번호 입력 *</label>
            <input 
              type="password"
              name="password"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
              required 
              minLength={6}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">비밀번호 재입력 *</label>
            <input 
              type="password"
              name="passwordConfirm"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
              required 
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h2 className="font-bold text-slate-900">학생 추가 정보 (필수)</h2>
          <p className="text-xs text-slate-500 mb-4">(주의) 정확한 학생 관리를 위해 모든 항목을 입력해주세요.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">이름 *</label>
              <input 
                type="text"
                name="name"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">생년월일 (6자리) *</label>
              <input 
                type="text"
                name="birth_date"
                placeholder="예: 050101"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">학교 *</label>
            <input 
              type="text"
              name="school"
              placeholder="예: 경기고등학교"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">본인 연락처 *</label>
              <input 
                type="tel"
                name="phone_student"
                placeholder="010-0000-0000"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">학부모 연락처 *</label>
              <input 
                type="tel"
                name="phone_parent"
                placeholder="010-0000-0000"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
                required 
              />
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">과제 수신 이메일 (PDF 발송용) *</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  name="useSameEmail"
                  className="rounded text-red-600 focus:ring-red-600"
                  checked={useSameEmail}
                  onChange={(e) => setUseSameEmail(e.target.checked)}
                />
                <span className="text-xs font-semibold text-slate-500 hover:text-slate-800">가입용 이메일과 동일</span>
              </label>
            </div>
            {!useSameEmail && (
              <input 
                type="email"
                name="assignment_email"
                placeholder="과제를 받을 이메일 주소 직접 입력"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
                required={!useSameEmail}
              />
            )}
          </div>
        </div>

        <div className="pt-6">
          <label className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
            <input 
              type="checkbox" 
              className="mt-1 rounded text-red-600 focus:ring-red-600"
              required 
            />
            <span className="text-sm text-slate-700">
              <Link href="/terms" className="font-bold text-red-600 hover:underline">이용약관</Link> 및 <Link href="/privacy" className="font-bold text-red-600 hover:underline">개인정보처리방침</Link>에 모두 동의합니다.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/20 transition-all text-lg"
        >
          {isLoading ? '가입 처리 중...' : '가입완료'}
        </button>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            이미 수강생이신가요? <Link href="/login" className="font-bold text-slate-900 hover:text-red-600">로그인하기</Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <MainHeader />
      <main className="flex-1 container mx-auto px-4 py-12 flex justify-center items-center">
        <Suspense fallback={<div className="text-center text-slate-500">로딩 중...</div>}>
          <SignupFormContent />
        </Suspense>
      </main>
    </div>
  );
}
