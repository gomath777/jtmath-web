'use client';

import { LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-white/30 transition-all hover:bg-white/[0.04] hover:text-white/60 text-left"
    >
      <LogOut className="h-4 w-4" />
      <span className="text-sm font-medium">로그아웃</span>
    </button>
  );
}
