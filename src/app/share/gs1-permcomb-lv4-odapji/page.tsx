import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';

export const metadata = {
  title: '공수1 · 경우의 수 레벨4 오답 보강',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const PDF_URL =
  'https://mathgo-pdfs.b-cdn.net/sessions/share/gs1-permcomb-lv4-odapji/%EA%B2%BD%EC%9A%B0%EC%9D%98%EC%88%98_%EB%A0%88%EB%B2%A84_%EC%98%A4%EB%8B%B5_%EC%9D%B8%EC%97%AC1_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf';

type Problem = {
  num: number;
  source: string;
  videoId: string;
};

const PROBLEMS: Problem[] = [
  { num: 1,  source: '26년 3월 고2 27번',      videoId: '8a4078b0-f594-4993-b832-0ba9910a9628' },
  { num: 3,  source: '25년 10월 고1 16번',      videoId: 'fcbc03d9-7f92-4dc3-9019-8337e95731f2' },
  { num: 5,  source: '25년 3월 고2 18번',       videoId: 'de064751-17f1-4019-881c-631a81e35b4e' },
  { num: 7,  source: '24년 3월 고2 18번',       videoId: '9cb3eff3-f5a9-4dc2-89f1-9da5464e5b31' },
  { num: 9,  source: '23년 3월 고2 27번',       videoId: '7d5feb19-e0dc-4416-890c-f7c16915c7af' },
  { num: 11, source: '22년 3월 고2 28번',       videoId: '57214e10-0af0-4893-a83e-8f102e659846' },
  { num: 13, source: '20년 3월 고2 17번',       videoId: '9975d6b7-8a83-4a97-bc67-7c40f763dbf3' },
  { num: 15, source: '20년 3월 고2 29번',       videoId: 'd5919cb1-4da2-4aa6-8ae0-b236065e1427' },
  { num: 19, source: '19년 4월 고3 이과 28번',  videoId: '3daaa663-f263-4159-9f79-0d75839c894a' },
  { num: 21, source: '18년 10월 고3 문과 27번', videoId: '7ef2f2a6-5c6d-40ae-bb21-ef7af67db04f' },
  { num: 23, source: '16년 10월 고3 문과 28번', videoId: '3a0e587b-a09e-442e-947d-a77f5e63c203' },
];

export default function Gs1PermCombLv4OdapjiPage() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            공통수학1 · 오답 보강
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            경우의 수 · 레벨4 오답
          </h1>
          <p className="text-[11px] text-stone font-mono mt-1">
            해설강의 11개
          </p>
          <p className="text-[13px] text-olive mt-2">
            오답지 받고, 막힌 번호 해설강의 확인하세요.
          </p>
        </div>

        {/* 오답지 PDF */}
        <section className="mb-10">
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
            오답지
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
              <p className="font-medium text-[13px] truncate">경우의 수 레벨4 오답 인여1</p>
              <p className="text-[11px] text-stone mt-0.5">홀수번 12문항 (원본+변형 각 12)</p>
            </div>
            <Download className="w-4 h-4 text-stone shrink-0" />
          </a>
        </section>

        {/* 해설강의 */}
        <section>
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
            해설강의
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
                <a
                  href={EMBED(p.videoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-olive/10 hover:bg-olive/20 text-olive transition-colors text-[11px] font-medium shrink-0"
                >
                  <Play className="w-3.5 h-3.5" fill="currentColor" />
                  영상
                </a>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
