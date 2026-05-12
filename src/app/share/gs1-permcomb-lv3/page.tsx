import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';

export const metadata = {
  title: '공수1 · 경우의 수 레벨3',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const PDF_URL =
  'https://mathgo-pdfs.b-cdn.net/sessions/share/gs1-permcomb-lv3/%EA%B2%BD%EC%9A%B0%EC%9D%98%EC%88%98_%EB%A0%88%EB%B2%A83_%EC%9D%B8%EC%97%AC1_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf';

type Problem = {
  num: number;
  source: string | null;
  videoId: string | null;
};

const PROBLEMS: Problem[] = [
  { num: 1,  source: '2019년 9월 고3 4번',        videoId: null },
  { num: 2,  source: '2025년 9월 고1 26번',        videoId: null },
  { num: 3,  source: null,                          videoId: null },
  { num: 4,  source: '2021년 3월 고2 24번',        videoId: null },
  { num: 5,  source: null,                          videoId: null },
  { num: 6,  source: null,                          videoId: null },
  { num: 7,  source: '2023년 10월 고1 25번',       videoId: null },
  { num: 8,  source: '2023년 3월 고2 12번',        videoId: null },
  { num: 9,  source: '2019년 3월 이과 10번',       videoId: null },
  { num: 10, source: '2016년 3월 고3 17번',        videoId: null },
  { num: 11, source: null,                          videoId: null },
  { num: 12, source: null,                          videoId: null },
  { num: 13, source: '2026년 3월 고2 16번',        videoId: null },
  { num: 14, source: null,                          videoId: null },
  { num: 15, source: '2026년 3월 고2 16번 변형',   videoId: null },
  { num: 16, source: '2025년 3월 고2 16번',        videoId: null },
  { num: 17, source: null,                          videoId: null },
  { num: 18, source: '2025년 3월 고2 16번 변형',   videoId: null },
  { num: 19, source: '2019년 3월 이과 8번',        videoId: null },
  { num: 20, source: null,                          videoId: null },
  { num: 21, source: '2017년 6월 고3 13번',        videoId: null },
  { num: 22, source: '2020년 3월 고2 15번',        videoId: null },
  { num: 23, source: null,                          videoId: null },
  { num: 24, source: null,                          videoId: null },
  { num: 25, source: '2017년 11월 고3 18번',       videoId: null },
  { num: 26, source: '2017년 11월 고3 18번 변형',  videoId: null },
  { num: 27, source: '2017년 7월 고3 26번',        videoId: null },
  { num: 28, source: '2017년 7월 고3 26번 변형',   videoId: null },
];

export default function Gs1PermCombLv3Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            공통수학1 · 기출 유형 학습지
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            경우의 수 · 레벨3
          </h1>
          <p className="text-[11px] text-stone font-mono mt-1">
            고1 25년 10월 ~ 고3 14년 3월 · 28문항
          </p>
          <p className="text-[13px] text-olive mt-2">
            학습지 먼저 받고, 문제 번호 맞춰서 해설강의 보세요.
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
              <p className="font-medium text-[13px] truncate">경우의 수 레벨3 인여1</p>
              <p className="text-[11px] text-stone mt-0.5">28문항 · 4.4 MB</p>
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
                {/* 번호 뱃지 */}
                <span className="inline-flex items-center justify-center min-w-[36px] h-6 px-2 rounded-md bg-terracotta/10 text-terracotta text-[11px] font-semibold shrink-0 tabular-nums">
                  {p.num}번
                </span>

                {/* 출처 */}
                <p className="flex-1 text-[13px] text-stone min-w-0">
                  {p.source ?? <span className="text-stone/50 italic text-[12px]">창작</span>}
                </p>

                {/* 영상 버튼 (있을 때만) */}
                {p.videoId && (
                  <a
                    href={EMBED(p.videoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-olive/10 hover:bg-olive/20 text-olive transition-colors text-[11px] font-medium shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" fill="currentColor" />
                    영상
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
