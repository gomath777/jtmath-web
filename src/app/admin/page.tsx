import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MainHeader from '@/components/MainHeader';
import { Users, BookOpen, Settings, Search, UserPlus } from 'lucide-react';
import Link from 'next/link';
import AdminUserRow from './AdminUserRow';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. 관리자 권한 확인 (여기서는 데모를 위해 로그인한 유저면 통과, 실제로는 role이나 email 검사 필요)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 실제 운영에서는 특정 이메일만 관리자로 허용 (대표님 이메일 하드코딩 등)
  // if (user.email !== 'admin@jtmath.com') { redirect('/'); }

  // 2. 최근 가입 유저 목록 가져오기
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  // 3. 강의 목록 (수동 등록용)
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .order('created_at', { ascending: true });

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* 어드민 전용 헤더바 */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-extrabold text-xl tracking-tight text-white hover:text-red-400 transition-colors">
              jtmath <span className="text-red-500 text-base font-bold bg-white/10 px-2 py-0.5 rounded ml-1">ADMIN</span>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              운영 모드
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl flex gap-8">
        
        {/* LNB (사이드바) */}
        <div className="w-64 shrink-0 hidden md:block">
          <nav className="space-y-1 sticky top-24">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-white text-red-600 font-bold rounded-xl shadow-sm border border-slate-100">
              <Users className="w-5 h-5" />
              수강생 관리
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-colors">
              <BookOpen className="w-5 h-5" />
              강의 및 영상 연동
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-colors shrink-0">
              <Settings className="w-5 h-5" />
              환경 설정
            </a>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">수강생 관리</h1>
            <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors">
              <UserPlus className="w-4 h-4" />
              수동 가입자 등록
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            {/* 검색바 */}
            <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="이름, 학교, 연락처로 검색..." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-shadow"
                />
              </div>
              <select className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none">
                <option>전체 강의</option>
                {courses?.map(course => (
                  <option key={course.id}>{course.title}</option>
                ))}
              </select>
            </div>

            {/* 수강생 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">이름 (학교)</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">연락처</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">가입일</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles?.map((profile) => (
                    <AdminUserRow key={profile.id} profile={profile} courses={courses || []} />
                  ))}
                  {(!profiles || profiles.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                        아직 가입한 수강생이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Placeholder */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
              <span>총 {profiles?.length || 0} 명</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 border border-slate-200 rounded text-slate-400 bg-slate-50 cursor-not-allowed">이전</button>
                <button className="px-3 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-50">다음</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
