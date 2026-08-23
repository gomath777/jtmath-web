import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default async function CheckoutFailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; code?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4 text-center">
      <XCircle className="w-20 h-20 text-slate-300 mb-6" />
      <h1 className="text-3xl font-bold text-slate-900 mb-2">결제에 실패했습니다.</h1>
      <p className="text-slate-500 mb-8 font-medium">
        {resolvedSearchParams.message || "결제 도중 오류가 발생했거나 취소되었습니다."}
        <br/>
        <span className="text-xs mt-2 block opacity-50">에러 코드: {resolvedSearchParams.code}</span>
      </p>

      <Link href="/courses" className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-md">
        이전 페이지로 돌아가기
      </Link>
    </div>
  );
}
