'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import MainHeader from '@/components/MainHeader';
import { loginUser } from './actions';

export default function LoginPage() {
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
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <MainHeader />
      
      <main className="flex-1 container mx-auto px-4 py-12 flex justify-center items-center">
        <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-100">
          
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
            <p className="mt-2 text-sm text-slate-500">내 강의실에 입장하세요.</p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-semibold border border-red-100">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg text-sm font-semibold border border-green-200">
              {successMessage}
            </div>
          )}

          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">이메일</label>
              <input 
                type="email"
                name="email"
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
                required 
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">비밀번호</label>
                <Link href="#" className="text-xs text-slate-500 hover:text-red-600 font-semibold">비밀번호를 잊으셨나요?</Link>
              </div>
              <input 
                type="password"
                name="password"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
                required 
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white font-bold py-4 rounded-xl transition-all text-lg mt-4"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>

            <div className="pt-6 border-t border-slate-100 text-center space-y-4">
              <p className="text-sm text-slate-500">아직 등록하지 않으셨나요?</p>
              <Link 
                href="/signup" 
                className="block w-full bg-white hover:bg-slate-50 text-red-600 font-bold py-4 rounded-xl border border-red-200 transition-all flex items-center justify-center text-center"
              >
                1분만에 수강 신청하기 (회원가입)
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
