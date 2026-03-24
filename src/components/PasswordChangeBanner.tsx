'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { KeyRound, X } from 'lucide-react';

export default function PasswordChangeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pw-banner-dismissed');
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('pw-banner-dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-4 bg-brand-blue/10 border border-brand-blue/20 rounded-xl px-5 py-4">
      <div className="flex items-center gap-3">
        <KeyRound className="w-5 h-5 text-brand-blue shrink-0" />
        <p className="text-sm text-white/70">
          초기 비밀번호(생년월일)를 사용 중입니다.{' '}
          <Link href="/reset-password" className="text-brand-blue font-bold hover:underline">
            지금 변경하기 →
          </Link>
        </p>
      </div>
      <button onClick={dismiss} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
