export default function OTPage() {
  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-8">
      <h1 className="text-2xl font-black text-white">오답 어플 다운 및 이용법, 카톡 질문 방법</h1>

      {/* Section 1: 오답관리 어플 사용 안내 */}
      <section className="rounded-xl overflow-hidden border border-white/[0.08]">
        <div className="bg-[#3a2e1a] px-5 py-3">
          <h2 className="text-base font-black text-[#d4a853]">오답관리 어플 사용 안내</h2>
        </div>

        <div className="bg-brand-dark p-6 space-y-6">
          {/* 1단계 */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-white/60">[1단계]</p>
            <div className="space-y-2 text-sm text-white/80 leading-relaxed">
              <p>앱스토어, 구글플레이 스토어에서 <strong className="text-white">&apos;매쓰플랫&apos;</strong> 학생용 앱을 받아주세요. (핸드폰 태블릿 모두 가능)</p>
              <p className="text-white font-bold">
                등록 완료 후 학생 본인 <span className="underline decoration-brand-blue">&apos;핸드폰번호&apos;만 입력</span>하면 자동 로그인 됩니다. <span className="text-brand-blue">(기본 비번 123456)</span>
              </p>
            </div>

            {/* 앱 이미지 */}
            <div className="flex gap-3 pt-2">
              <div className="w-1/3 rounded-lg overflow-hidden" style={{ maxHeight: '200px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/docs/app-mathflat-android.png"
                  alt="매쓰플랫 안드로이드 앱"
                  className="w-full object-cover object-top"
                />
              </div>
              <div className="w-1/3 rounded-lg overflow-hidden" style={{ maxHeight: '200px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/docs/app-mathflat-ios.png"
                  alt="매쓰플랫 iOS 앱"
                  className="w-full object-cover object-top"
                />
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div className="h-px bg-white/[0.06]" />

          {/* 2단계 */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-white/60">[2단계]</p>
            <p className="text-sm text-white/80">📺🎬 어플 사용법 영상을 시청해 주세요! 🎬📺</p>

            {/* 로컬 영상 */}
            <video
              src="/docs/ot-app-vid.mp4"
              controls
              className="w-full rounded-lg"
            />

            <div className="space-y-1 text-sm text-white/80 leading-relaxed">
              <p>PDF파일을 다운 받아 문제를 풀고, 위에서 받은 <strong className="text-white">어플에 접속하여 답을 채점</strong>해 주세요.</p>
              <p>채점 후 카톡으로 메세지를 보내야 피드백이 진행됩니다.</p>
            </div>

            {/* 중요 안내 박스 */}
            <div className="bg-[#1a1a0a] border border-[#d4a853]/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-black text-white flex items-center gap-2">
                <span>💡</span> 가장 중요합니다.
              </p>
              <div className="text-sm text-white/70 space-y-1 leading-relaxed">
                <p>채점을 정확하게 해야, 채점 데이터를 근거로 제가 다음 방향을 제시할 수 있습니다.</p>
                <p className="text-brand-blue">모르는 문제는 찍지말고 &apos;모름&apos; 선택해 주세요.</p>
                <p className="text-brand-blue">풀어서 맞았지만, 쌍둥이 유사문제를 더 풀어보고 싶을 때도 &apos;모름&apos; 선택해 주세요.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: 카톡으로 질문하는 법 */}
      <section className="rounded-xl overflow-hidden border border-white/[0.08]">
        <div className="bg-[#3a2e1a] px-5 py-3">
          <h2 className="text-base font-black text-[#d4a853]">카톡으로 질문하는 법</h2>
        </div>

        <div className="bg-brand-dark p-6 space-y-4">
          <div className="space-y-2 text-sm text-white/80 leading-relaxed">
            <p className="font-bold text-white">
              🔴🔴 정확히 본인이 어느 과정에서 막혔는지 파악한 다음에 질문해야합니다!
            </p>
            <p>그래야 사고 단계 빈틈을 찾을 수 있습니다.</p>
            <p className="text-brand-blue font-medium">
              어디까지 생각했고, 어느 부분에서 모르겠는지 문제를 캡처해서 보내주세요
            </p>
          </div>

          {/* 카톡 질문 이미지 */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/docs/katalk-asking1.jpg"
              alt="카톡 질문 예시 1"
              className="w-full rounded-lg"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/docs/katalk-asking2.jpg"
              alt="카톡 질문 예시 2"
              className="w-full rounded-lg"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
