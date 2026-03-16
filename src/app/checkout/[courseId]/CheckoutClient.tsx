'use client';

import { useEffect, useRef, useState } from "react";
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

export default function CheckoutClient({ 
  course, 
  user 
}: { 
  course: any, 
  user: any 
}) {
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const paymentMethodsWidgetRef = useRef<ReturnType<
    PaymentWidgetInstance["renderPaymentMethods"]
  > | null>(null);
  const [price, setPrice] = useState(course.price || 50000);

  useEffect(() => {
    (async () => {
      // Create Payment Widget instance
      const paymentWidget = await loadPaymentWidget(clientKey, user.id); // customerKey as user.id

      // Render Payment Methods
      const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
        "#payment-widget",
        { value: price },
        { variantKey: "DEFAULT" }
      );

      // Render Agreement Terms
      paymentWidget.renderAgreement("#agreement", {
        variantKey: "AGREEMENT",
      });

      paymentWidgetRef.current = paymentWidget;
      paymentMethodsWidgetRef.current = paymentMethodsWidget;
    })();
  }, [user.id, price]);

  const handlePayment = async () => {
    const paymentWidget = paymentWidgetRef.current;

    try {
      // Trigger payment request
      await paymentWidget?.requestPayment({
        orderId: `MATHGO-${course.id}-${crypto.randomUUID().slice(0,8)}`, // Custom Order ID
        orderName: course.title,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
        customerEmail: user.email,
        customerName: user.name,
        customerMobilePhone: user.phone_parent || user.phone_student || "01012341234",
      });
    } catch (err: any) {
      console.error(err);
      if (err.code === "USER_CANCEL") {
        alert("결제를 취소하셨습니다.");
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-100 bg-slate-50">
        <h2 className="text-xl font-bold text-slate-900 mb-2">결제 상세 정보</h2>
        <div className="block lg:flex justify-between items-end">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">{course.subtitle}</p>
            <h3 className="text-2xl font-bold text-slate-900">{course.title}</h3>
          </div>
          <div className="mt-4 lg:mt-0 text-right">
            <span className="text-sm text-slate-500 line-through mr-2">
              {course.original_price ? `${course.original_price.toLocaleString()}원` : ''}
            </span>
            <span className="text-3xl font-extrabold text-red-600">
              {price.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {/* 결제위젯 영역 */}
        <div id="payment-widget" />
        
        {/* 이용약관 영역 */}
        <div id="agreement" className="mt-4" />

        <div className="mt-8">
          <button
            onClick={handlePayment}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/20 transition-all text-lg"
          >
            {price.toLocaleString()}원 결제하기
          </button>
          
          <p className="text-center text-xs text-slate-500 mt-4 leading-relaxed">
            토스페이먼츠의 안전한 결제 시스템을 통해 진행됩니다.<br />
            무이자 할부 및 카드 혜택은 결제창에서 확인 가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
