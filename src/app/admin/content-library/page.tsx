import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, CreditCard, BookOpen } from 'lucide-react';
import ContentLibraryClient from './ContentLibraryClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map((e) => e.trim());

export default async function ContentLibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  const { data: sets } = await supabase
    .from('learning_sets')
    .select(`
      id, title, description, subject_slug, pdf_filename, created_at,
      learning_set_videos ( id )
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-extrabold text-xl tracking-tight text-white hover:text-red-400 transition-colors">
            jtmath <span className="text-red-500 text-base font-bold bg-white/10 px-2 py-0.5 rounded ml-1">ADMIN</span>
          </Link>
          <div className="flex items-center gap-3 text-sm font-medium">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              {user.email}
            </div>
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-xs">대시보드 →</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl flex gap-8">
        {/* 사이드바 */}
        <div className="w-56 shrink-0 hidden md:block">
          <nav className="space-y-1 sticky top-24">
            <Link href="/admin?tab=users"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100">
              <Users className="w-5 h-5" />수강생 관리
            </Link>
            <Link href="/admin?tab=payments"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100">
              <CreditCard className="w-5 h-5" />결제 내역
            </Link>
            <Link href="/admin/content-library"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors bg-white text-red-600 shadow-sm border border-slate-100">
              <BookOpen className="w-5 h-5" />콘텐츠 라이브러리
            </Link>
          </nav>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <ContentLibraryClient initialSets={sets || []} />
        </div>
      </main>
    </div>
  );
}
