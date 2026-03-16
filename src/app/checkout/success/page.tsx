import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { paymentKey: string; orderId: string; amount: string };
}) {
  const { paymentKey, orderId, amount } = searchParams;
  
  if (!paymentKey || !orderId || !amount) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. 보안을 위한 서버 to 서버 Toss 페이먼츠 결제 승인 API 호출
  const secretKey = process.env.TOSS_SECRET_KEY || "test_gsk_docs_Ovk5rk1EwkEbP0W43n07xlzm";
  const encryptedSecretKey = Buffer.from(`${secretKey}:`).toString("base64");

  let tossResponse;
  try {
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    });

    tossResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(tossResponse.message || "결제 승인 실패");
    }
  } catch (error: any) {
    console.error("Toss Error:", error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4 text-center">
        <XCircle className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">결제 승인에 실패했습니다.</h1>
        <p className="text-slate-500 mb-8">{error.message}</p>
        <Link href="/courses" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">전체 강의로 돌아가기</Link>
      </div>
    );
  }

  // 2. Order ID 파싱하여 Course ID 추출 (MATHGO-{courseId}-{uuid})
  const parts = orderId.split('-');
  const courseId = parts[1];

  // 3. Purchases 테이블에 결제 내역 기록
  const { error: purchaseError } = await supabase.from('purchases').insert([
    {
      user_id: user.id,
      course_id: courseId,
      toss_order_id: orderId,
      toss_payment_key: paymentKey,
      amount: Number(amount),
      status: 'DONE',
    }
  ]);

  if (purchaseError) {
    console.error("Purchase DB Error:", purchaseError);
    // 슬랙 알림이나 로깅 필요
  }

  // 4. Enrollments 테이블에 수강 권한 부여 (1년 기한)
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const { error: enrollError } = await supabase.from('enrollments').insert([
    {
      user_id: user.id,
      course_id: courseId,
      source: 'toss_payment',
      valid_until: validUntil.toISOString(),
    }
  ]);

  if (enrollError) {
    console.error("Enrollment DB Error:", enrollError);
  }

  // 성공 화면 노출
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4 text-center">
      <CheckCircle2 className="w-24 h-24 text-red-600 mb-6" />
      <h1 className="text-3xl font-bold text-slate-900 mb-2">결제가 성공적으로 완료되었습니다!</h1>
      <p className="text-slate-500 mb-8 max-w-md font-medium leading-relaxed">
        신청하신 {tossResponse.orderName} 과정의 수강 권한이 즉시 부여되었습니다. 지금 바로 내 강의실에서 학습을 시작해 보세요.
      </p>

      <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm mb-8 text-left shadow-sm">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-slate-500">결제 금액</span>
          <span className="font-bold">{Number(amount).toLocaleString()}원</span>
        </div>
        <div className="flex justify-between text-sm mb-3">
          <span className="text-slate-500">결제 수단</span>
          <span className="font-bold">{tossResponse.method}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">주문 번호</span>
          <span className="font-mono text-xs">{orderId}</span>
        </div>
      </div>

      <Link href="/dashboard" className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 px-8 py-4 rounded-xl font-bold transition-all text-lg w-full max-w-sm">
        내 강의실로 이동하기
      </Link>
    </div>
  );
}
