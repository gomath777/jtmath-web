'use client';

import { useState } from 'react';
import Link from 'next/link';
import MainHeader from '@/components/MainHeader';
import { sendPasswordReset } from './actions';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setErrorMessage('');

    const result = await sendPasswordReset(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    } else {
      setIsSent(true);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark">
      <MainHeader />

      <main className="flex-1 container mx-auto px-4 py-12 flex justify-center items-center">
        <div className="w-full max-w-md brand-card p-8 md:p-10">

          {isSent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-mint/10 text-brand-mint rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">이메일을 확인해주세요</h1>
              <p className="text-white/50 mb-8 text-sm leading-relaxed">
                입력하신 이메일로 비밀번호 재설정 링크를 발송했습니다.<br/>
                이메일이 도착하지 않으면 스팸함을 확인해주세요.
              </p>
              <Link
                href="/login"
                className="block w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-brand-blue/20 text-center"
              >
                로그인 페이지로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-white">비밀번호 찾기</h1>
                <p className="mt-2 text-sm text-white/40">가입하신 이메일로 재설정 링크를 보내드립니다.</p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 bg-brand-orange/10 text-brand-orange rounded-lg text-sm font-semibold border border-brand-orange/20">
                  {errorMessage}
                </div>
              )}

              <form action={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-white/60">가입하신 이메일</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 rounded-lg border border-white/[0.08] bg-brand-elevated text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-brand-blue hover:bg-blue-600 disabled:bg-brand-blue/50 text-white font-bold py-4 rounded-xl transition-all text-lg mt-4 shadow-lg shadow-brand-blue/20"
                >
                  {isLoading ? '전송 중...' : '재설정 링크 전송'}
                </button>

                <div className="text-center pt-4">
                  <Link href="/login" className="text-sm text-white/30 hover:text-white/60 transition-colors">
                    ← 로그인으로 돌아가기
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
