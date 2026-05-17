import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';

export const metadata = {
  title: '대수 · 등차수열 레벨4 보강',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const PDF_URL =
  'https://mathgo-pdfs.b-cdn.net/sessions/share/ds2-arithseq-lv4/%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4_%EB%A0%88%EB%B2%A84_%EC%9D%B8%EC%97%AC2_%EB%B3%B5%EC%8A%B5_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf';

type Problem = {
  num: number;
  source: string;
  videoId: string | null;
};

const PROBLEMS: Problem[] = [
  { num: 1,  source: '25년 10월 고2 17번',      videoId: 'f317a41a-69bd-49d8-985f-91faa31803a2' },
  { num: 3,  source: '20년 3월 고3 문과 17번',   videoId: null },
  { num: 5,  source: '24년 10월 고2 28번',      videoId: '405d62bd-d93a-41cf-8759-415ce4809b26' },
  { num: 7,  source: '17년 9월 고2 이과 14번',   videoId: 'a7617efd-2846-4392-8020-69db87a57247' },
  { num: 9,  source: '15년 9월 고2 문과 14번',   videoId: '6cf4a868-207f-4367-8808-0df4532b18dd' },
  { num: 11, source: '17년 6월 고2 문과 29번',   videoId: 'e19fa029-538b-4f90-ab84-1ca353215f62' },
  { num: 13, source: '13년 3월 고3 이과 29번',   videoId: null },
  { num: 15, source: '15년 3월 고2 이과 28번',   videoId: '137716b8-6c9f-4712-a150-4f050697c556' },
];

export default function Ds2ArithSeqLv4Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            대수 · 레벨4 보강
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            등차수열 · 레벨4
          </h1>
          <p className="text-[11px] text-stone font-mono mt-1">
            홀수번 8문항 · 해설강의 6개
          </p>
          <p className="text-[13px] text-olive mt-2">
            학습지 받고, 홀수번 번호 맞춰서 해설강의 보세요.
          </p>
        </div>

        {/* 학습지 PDF */}
        <section className="mb-10">
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
            학습지
          </p>
          <a
            href={PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-terracotta" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[13px] truncate">등차수열 레벨4 인여2</p>
              <p className="text-[11px] text-stone mt-0.5">홀수번 8문항 (원본+변형 각 8)</p>
            </div>
            <Download className="w-4 h-4 text-stone shrink-0" />
          </a>
        </section>

        {/* 해설강의 */}
        <section>
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
            해설강의 (홀수번만)
          </p>
          <div className="space-y-1.5">
            {PROBLEMS.map((p) => (
              <div
                key={p.num}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-ivory border border-border-cream"
              >
                <span className="inline-flex items-center justify-center min-w-[36px] h-6 px-2 rounded-md bg-terracotta/10 text-terracotta text-[11px] font-semibold shrink-0 tabular-nums">
                  {p.num}번
                </span>
                <p className="flex-1 text-[13px] text-stone min-w-0">{p.source}</p>
                {p.videoId ? (
                  <a
                    href={EMBED(p.videoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-olive/10 hover:bg-olive/20 text-olive transition-colors text-[11px] font-medium shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" fill="currentColor" />
                    영상
                  </a>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-stone/10 text-stone/50 text-[11px] font-medium shrink-0">
                    준비중
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
