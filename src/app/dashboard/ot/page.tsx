import Link from 'next/link';
import { ArrowLeft, CheckCircle2, MonitorPlay, Smartphone, PlayCircle } from 'lucide-react';

export default function OTPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        내 강의실로 돌아가기
      </Link>
      
      <div>
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors mb-4">
          Lesson 0
        </div>
        <h1 className="text-3xl font-bold tracking-tight">수강 전 필수 OT 가이드</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          강의 시청과 과제 제출을 위한 매스플랫 앱 세팅 방법입니다.
        </p>
      </div>

      <div className="space-y-6 pt-6">
        
        {/* Step 1 */}
        <section className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border bg-muted/30 p-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
              매스플랫 학생용 앱 다운로드
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="font-medium">앱스토어 또는 구글플레이에서 '매스플랫' 학생용 앱을 설치해주세요. (핸드폰/태블릿 모두 가능)</p>
            <div className="flex gap-4">
              <div className="flex-1 bg-muted rounded-lg p-6 flex flex-col items-center justify-center border border-border">
                <Smartphone className="w-10 h-10 text-muted-foreground mb-3" />
                <span className="font-semibold text-sm">App Store (iOS)</span>
              </div>
              <div className="flex-1 bg-muted rounded-lg p-6 flex flex-col items-center justify-center border border-border">
                <MonitorPlay className="w-10 h-10 text-muted-foreground mb-3" />
                <span className="font-semibold text-sm">Google Play (Android)</span>
              </div>
            </div>
            <div className="bg-primary/5 text-primary-foreground p-4 rounded-lg mt-4 border border-primary/20">
              <h4 className="font-bold text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                자동 로그인 방법
              </h4>
              <p className="text-sm mt-1 text-foreground/80">앱 설치 후 본인의 <strong className="text-primary">핸드폰 번호</strong>만 입력하시면 가입 절차 없이 즉시 자동 로그인됩니다. (기본 비밀번호: 123456)</p>
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border bg-muted/30 p-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
              앱 사용법 및 과제 제출 방법
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="font-medium">웹사이트에서 다운받은 PDF 파일을 풀고, 매스플랫 앱에서 답을 채점해주세요.</p>
            <div className="aspect-video bg-black rounded-lg w-full flex items-center justify-center border border-border relative overflow-hidden">
               {/* YouTube or Bunny Video Embed Placeholder */}
               <div className="absolute inset-0 flex items-center justify-center text-white/50 flex-col">
                  <PlayCircle className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">매스플랫 사용법 영상 시청</p>
                </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
