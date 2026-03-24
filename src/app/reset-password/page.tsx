'use client';

import { useState } from 'react';
import MainHeader from '@/components/MainHeader';
import { updatePassword } from './actions';
import { KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setErrorMessage('');

    const result = await updatePassword(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-lg border border-white/[0.08] bg-brand-elevated text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all";

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark">
      <MainHeader />

      <main className="flex-1 container mx-auto px-4 py-12 flex justify-center items-center">
        <div className="w-full max-w-md brand-card p-8 md:p-10">
          <div className="mb-8 text-center">
            <div className="w-14 h-14 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white">새 비밀번호 설정</h1>
            <p className="mt-2 text-sm text-white/40">새로운 비밀번호를 입력해주세요.</p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-brand-orange/10 text-brand-orange rounded-lg text-sm font-semibold border border-brand-orange/20">
              {errorMessage}
            </div>
          )}

          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/60">새 비밀번호 (6자 이상)</label>
              <input
                type="password"
                name="password"
                className={inputClass}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-white/60">새 비밀번호 확인</label>
              <input
                type="password"
                name="passwordConfirm"
                className={inputClass}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-blue hover:bg-blue-600 disabled:bg-brand-blue/50 text-white font-bold py-4 rounded-xl transition-all text-lg mt-4 shadow-lg shadow-brand-blue/20"
            >
              {isLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
