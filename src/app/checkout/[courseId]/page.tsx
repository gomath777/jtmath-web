import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MainHeader from '@/components/MainHeader';
import CheckoutClient from './CheckoutClient';
import { ShieldCheck, Clock, Download } from 'lucide-react';

export default async function CheckoutPage({ params }: { params: { courseId: string } }) {
  const supabase = await createClient();

  // 1. 로그인 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/login?redirect=/checkout/${params.courseId}`);
  }

  // 2. 유저 프로필 조회 (결제 정보에 필요)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 3. 상품 정보 조회
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.courseId)
    .single();

  if (courseError || !course) {
    // 상품이 없으면 404로 보내거나 목록으로 리다이렉트
    // 테스트 환경용 가짜 데이터
    var fallbackCourse = {
      id: params.courseId,
      title: "기하학 마스터 클래스",
      subtitle: "중등 기하 완벽 대비반",
      price: 50000,
      original_price: 80000,
    };
  }

  const finalCourse = course || fallbackCourse;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <MainHeader />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">수강 신청 & 결제</h1>
          <p className="mt-2 text-slate-500">결제가 완료되면 카카오톡 알림과 함께 즉시 수강이 가능합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: 결제 위젯 */}
          <div className="lg:col-span-2 space-y-6">
            <CheckoutClient course={finalCourse} user={{ ...user, ...profile }} />
          </div>

          {/* Right Column: 결제 안내 & 혜택 */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4">제공 혜택 및 수강 환경</h3>
              
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">무제한 반복 수강</h4>
                    <p className="text-xs text-slate-500 mt-1">수강 기간 내 모든 강의를 PC/모바일 상관없이 무제한으로 시청하실 수 있습니다.</p>
                  </div>
                </li>
                
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">PDF 교재 무료 제공</h4>
                    <p className="text-xs text-slate-500 mt-1">별도의 교재비 없이 퀄리티 높은 단계별 자체 제작 교재가 PDF로 제공됩니다.</p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">1:1 카톡 질문 답변</h4>
                    <p className="text-xs text-slate-500 mt-1">강의 수강 중 모르는 문제는 카톡으로 원장님께 바로 질문하고 피드백을 받으세요.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 text-white text-sm">
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                네이버 스마트스토어 결제자 안내
              </h4>
              <p className="text-slate-400 font-medium leading-relaxed mb-4">
                이미 네이버 쇼핑 스토어에서 강의를 결제하셨나요?
              </p>
              <p className="text-slate-500 text-xs mb-4">
                이 페이지에서 중복 결제하지 마시고, 우측 상단의 '내 강의실' 이나 카카오톡 안내를 통해 권한 부여 상태를 확인해주세요.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
