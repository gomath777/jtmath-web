import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, CreditCard, LayoutDashboard, BookOpen, Calendar, GraduationCap, MessageSquare, FileText, Send, CalendarDays, ClipboardCheck } from 'lucide-react';
import AdminUserRow from './AdminUserRow';
import { isSimpleAdminUnlocked } from '@/utils/admin-auth';

// 관리자 이메일 목록 (환경 변수로 관리 가능)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map((e) => e.trim());

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const simpleAdmin = await isSimpleAdminUnlocked();
  if (!simpleAdmin && !user) redirect('/login');
  if (!simpleAdmin && !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/dashboard');
  }

  const activeTab = searchParams.tab || 'users';

  // 수강생 목록 (프로필 + 수강 정보)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // 강의 목록
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .order('created_at', { ascending: true });

  // 수강 권한 목록 (수강생 관리 탭용)
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, user_id, course_id, valid_until, source, created_at, courses(title)')
    .order('created_at', { ascending: false });

  // 결제 내역 (결제 탭용)
  const { data: purchases } = await supabase
    .from('purchases')
    .select('id, user_id, amount, status, toss_order_id, created_at, products(name), profiles(name, phone_student)')
    .order('created_at', { ascending: false })
    .limit(100);

  // 수강생별 enrollment 맵
  const enrollmentsByUser: Record<string, typeof enrollments> = {};
  (enrollments || []).forEach((e) => {
    if (!enrollmentsByUser[e.user_id]) enrollmentsByUser[e.user_id] = [];
    enrollmentsByUser[e.user_id]!.push(e);
  });

  // 통계
  const totalUsers = profiles?.length || 0;
  const totalEnrollments = enrollments?.length || 0;
  const totalRevenue = (purchases || [])
    .filter((p: any) => p.status === 'DONE')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col">
      {/* 어드민 헤더 */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-extrabold text-xl tracking-tight text-white hover:text-red-400 transition-colors">
              jtmath <span className="text-red-500 text-base font-bold bg-white/10 px-2 py-0.5 rounded ml-1">ADMIN</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              {simpleAdmin ? 'simple admin' : user?.email}
            </div>
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-xs">대시보드 →</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl flex gap-8">

        {/* 사이드바 */}
        <div className="w-56 shrink-0 hidden md:block">
          <nav className="space-y-1 sticky top-24">
            <Link
              href="/admin?tab=users"
              className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${activeTab === 'users' ? 'bg-white text-red-600 shadow-sm border border-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Users className="w-5 h-5" />
              수강생 관리
            </Link>
            <Link
              href="/admin?tab=payments"
              className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${activeTab === 'payments' ? 'bg-white text-red-600 shadow-sm border border-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <CreditCard className="w-5 h-5" />
              결제 내역
            </Link>
            <Link
              href="/admin?tab=stats"
              className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${activeTab === 'stats' ? 'bg-white text-red-600 shadow-sm border border-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              현황 요약
            </Link>
            <Link
              href="/admin/lessons"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <FileText className="w-5 h-5" />
              학습 페이지 (신)
            </Link>
            <Link
              href="/admin/content-readiness"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <ClipboardCheck className="w-5 h-5" />
              콘텐츠 준비 현황
            </Link>
            <Link
              href="/admin/seasons"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <Calendar className="w-5 h-5" />
              시즌 관리
            </Link>
            <Link
              href="/admin/content-library"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <BookOpen className="w-5 h-5" />
              보충자료
            </Link>
            <Link
              href="/admin/curriculum"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <Calendar className="w-5 h-5" />
              커리큘럼
            </Link>
            <Link
              href="/admin/chat"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <MessageSquare className="w-5 h-5" />
              어드민 채팅
            </Link>
            <Link
              href="/admin/kakao-ops"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <Send className="w-5 h-5" />
              카카오 운영
            </Link>
            <Link
              href="/admin/students"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <GraduationCap className="w-5 h-5" />
              학생 현황판
            </Link>
            <Link
              href="/admin/calendars"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <Calendar className="w-5 h-5" />
              학생 캘린더
            </Link>
            <Link
              href="/admin/5wsummer"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <CalendarDays className="w-5 h-5" />
              5주 달력
            </Link>
            <Link
              href="/admin/portal"
              className="flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors text-slate-600 hover:bg-slate-100"
            >
              <Users className="w-5 h-5" />
              학생 포탈
            </Link>
          </nav>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 space-y-6">

          {/* 모바일 탭 */}
          <div className="flex md:hidden gap-2 overflow-x-auto">
            {[
              { key: 'users', label: '수강생 관리', href: '/admin?tab=users' },
              { key: 'payments', label: '결제 내역', href: '/admin?tab=payments' },
              { key: 'stats', label: '현황 요약', href: '/admin?tab=stats' },
              { key: 'kakao-ops', label: '카카오 운영', href: '/admin/kakao-ops' },
            ].map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === tab.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* ── 수강생 관리 탭 ── */}
          {activeTab === 'users' && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">수강생 관리</h1>
                <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                  총 {totalUsers}명
                </span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">이름 / 학교</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">연락처</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">수강 중인 강의</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">가입일</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-right">권한 관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profiles?.map((profile) => (
                        <AdminUserRow
                          key={profile.id}
                          profile={profile}
                          courses={courses || []}
                          userEnrollments={enrollmentsByUser[profile.id] || []}
                        />
                      ))}
                      {(!profiles || profiles.length === 0) && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            아직 가입한 수강생이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-slate-100 text-sm text-slate-500">
                  총 {totalUsers}명
                </div>
              </div>
            </>
          )}

          {/* ── 결제 내역 탭 ── */}
          {activeTab === 'payments' && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">결제 내역</h1>
                <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  누적 매출 {totalRevenue.toLocaleString()}원
                </span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">수강생</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">상품</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">금액</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">상태</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">주문번호</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">결제일</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(purchases || []).map((purchase: any) => (
                        <tr key={purchase.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{purchase.profiles?.name || '-'}</div>
                            <div className="text-xs text-slate-500">{purchase.profiles?.phone_student || ''}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            {purchase.products?.name || '-'}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {(purchase.amount || 0).toLocaleString()}원
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              purchase.status === 'DONE'
                                ? 'bg-green-100 text-green-700'
                                : purchase.status === 'CANCELED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {purchase.status === 'DONE' ? '결제완료' : purchase.status === 'CANCELED' ? '취소' : '대기'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                            {purchase.toss_order_id?.slice(0, 20)}...
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs">
                            {new Date(purchase.created_at).toLocaleDateString('ko-KR')}
                          </td>
                        </tr>
                      ))}
                      {(!purchases || purchases.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                            결제 내역이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-slate-100 text-sm text-slate-500">
                  총 {purchases?.length || 0}건 · 결제완료 {(purchases || []).filter((p: any) => p.status === 'DONE').length}건
                </div>
              </div>
            </>
          )}

          {/* ── 현황 요약 탭 ── */}
          {activeTab === 'stats' && (
            <>
              <h1 className="text-2xl font-bold text-slate-900">현황 요약</h1>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                  <p className="text-sm text-slate-500 font-medium mb-1">총 회원수</p>
                  <p className="text-3xl font-extrabold text-slate-900">{totalUsers}</p>
                  <p className="text-xs text-slate-400 mt-1">가입 완료 회원</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                  <p className="text-sm text-slate-500 font-medium mb-1">총 수강 권한</p>
                  <p className="text-3xl font-extrabold text-slate-900">{totalEnrollments}</p>
                  <p className="text-xs text-slate-400 mt-1">전체 기간 포함</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                  <p className="text-sm text-slate-500 font-medium mb-1">누적 결제액</p>
                  <p className="text-3xl font-extrabold text-green-600">{totalRevenue.toLocaleString()}원</p>
                  <p className="text-xs text-slate-400 mt-1">결제완료 기준</p>
                </div>
              </div>

              {/* 강의별 수강생 현황 */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">강의별 수강생 현황</h2>
                <div className="space-y-3">
                  {(courses || []).map((course: any) => {
                    const count = (enrollments || []).filter((e) => e.course_id === course.id).length;
                    const activeCount = (enrollments || []).filter(
                      (e) => e.course_id === course.id && new Date(e.valid_until) > new Date()
                    ).length;
                    return (
                      <div key={course.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                        <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{course.title}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">활성 {activeCount}명</span>
                          <span className="text-xs text-slate-400">전체 {count}명</span>
                        </div>
                      </div>
                    );
                  })}
                  {(!courses || courses.length === 0) && (
                    <p className="text-slate-500 text-sm">강의 데이터가 없습니다.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
