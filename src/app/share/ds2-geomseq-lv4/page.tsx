import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const metadata = {
  title: '대수 · 등비수열 레벨4 보강',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const PDF_BASE = 'https://mathgo-pdfs.b-cdn.net/sessions/share/ds2-geomseq-lv4';
const PDF_URL = `${PDF_BASE}/${encodeURIComponent('등비수열_레벨4_인여2.pdf')}`;

type Problem = {
  num: number;
  source: string;
  videoId: string;
};

const PROBLEMS: Problem[] = [
  { num: 1, source: '19년 11월 고2 이과 27번', videoId: '586114e0-f768-4756-8918-16c42af645ec' },
  { num: 4, source: '16년 3월 고2 이과 28번',  videoId: 'feeebcc8-cc78-490d-98ac-6aec8c3f2d4b' },
  { num: 5, source: '15년 9월 고2 이과 29번',  videoId: '4d3494df-4ec9-42c1-9c78-cc979d39dc37' },
  { num: 6, source: '15년 6월 고2 이과 28번',  videoId: '7c4e19ac-22f4-4abd-8586-550511c887d9' },
];

export default function Ds2GeomSeqLv4Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            대수 · 레벨4 보강
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            등비수열 · 레벨4
          </h1>
          <p className="text-[11px] text-stone font-mono mt-1">
            해설강의 4개
          </p>
          <p className="text-[13px] text-olive mt-2">
            학습지 받고, 막힌 번호 해설강의 확인하세요.
          </p>
        </div>

        {/* 학습지 PDF */}
        <section className="mb-10">
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
            학습지
          </p>
          <a
            href={getPdfDownloadHref(PDF_URL)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-terracotta" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[13px] truncate">등비수열 레벨4 인여2</p>
              <p className="text-[11px] text-stone mt-0.5">6문항 · 2.5 MB</p>
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
