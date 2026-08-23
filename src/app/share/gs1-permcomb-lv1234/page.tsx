import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const metadata = {
  title: '공수1 · 경우의 수 레벨1~4',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const PDF_BASE =
  'https://mathgo-pdfs.b-cdn.net/sessions/gs1/05_%EC%88%9C%EC%97%B4%EA%B3%BC%20%EC%A1%B0%ED%95%A9/%EA%B8%B0%EC%B6%9C';
const pdf = (file: string) => `${PDF_BASE}/${encodeURIComponent(file)}`;

const SECTIONS: Array<{
  level: string;
  pdf: { url: string; name: string; size: string };
  videos: Array<{ id: string; label: string; num: number }>;
}> = [
  {
    level: '레벨1',
    pdf: { url: pdf('경우의 수 레벨1.pdf'), name: '경우의 수 레벨1', size: '2.0 MB' },
    videos: [],
  },
  {
    level: '레벨2',
    pdf: { url: pdf('경우의 수 레벨2.pdf'), name: '경우의 수 레벨2', size: '2.2 MB' },
    videos: [],
  },
  {
    level: '레벨3',
    pdf: { url: pdf('경우의 수 레벨3.pdf'), name: '경우의 수 레벨3', size: '3.0 MB' },
    videos: [
      { id: 'ce34bfab-bf0b-4bc1-9157-e8d5fee703e9', label: '26년 3월 고2 16번', num: 1 },
      { id: 'af1afa2b-080a-4b1a-83be-c4f5121e0440', label: '25년 9월 고1 26번', num: 2 },
      { id: 'c807cd90-b888-427d-8455-f0a114ad84f2', label: '25년 3월 고2 16번', num: 3 },
      { id: 'e46cdf7a-1703-4030-95d4-97225b30a092', label: '23년 3월 고2 12번', num: 4 },
      { id: '72a09332-d460-4f51-a3db-00a13c149637', label: '20년 3월 고2 15번', num: 5 },
      { id: '0c5d61f5-07ea-42c5-b6ef-0573175f41c5', label: '17년 11월 고3 18번', num: 6 },
      { id: '09d5efda-c5f3-4a82-93f2-4e1adf70c760', label: '17년 7월 고3 26번',  num: 7 },
      { id: '87fce330-5198-40ee-820e-48cdd3fa7be2', label: '17년 6월 고3 13번',  num: 8 },
      { id: 'fd2123c0-666d-4c32-8e80-0892d625fb0e', label: '16년 3월 고3 17번',  num: 9 },
    ],
  },
  {
    level: '레벨4-1',
    pdf: { url: pdf('경우의 수 레벨4-1.pdf'), name: '경우의 수 레벨4-1', size: '4.0 MB' },
    videos: [],
  },
  {
    level: '레벨4-2',
    pdf: { url: pdf('경우의 수 레벨4-2.pdf'), name: '경우의 수 레벨4-2', size: '3.4 MB' },
    videos: [],
  },
];

export default function Gs1PermCombLv1234Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            공수1 · 기출 해설강의
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            경우의 수
          </h1>
          <p className="text-[13px] text-olive mt-2">
            학습지 먼저 받고, 문제 번호 맞춰서 해설강의 보세요.
          </p>
        </div>

        <div className="space-y-12">
          {SECTIONS.map((sec) => (
            <section key={sec.level}>
              <h2 className="font-serif text-[20px] tracking-tight mb-4">{sec.level}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 학습지 */}
                <div>
                  <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
                    학습지
                  </p>
                  <a
                    href={getPdfDownloadHref(sec.pdf.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-terracotta" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px] truncate">{sec.pdf.name}</p>
                      <p className="text-[11px] text-stone mt-0.5">{sec.pdf.size}</p>
                    </div>
                    <Download className="w-4 h-4 text-stone shrink-0" />
                  </a>
                </div>

                {/* 해설강의 */}
                <div>
                  <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
                    해설강의
                  </p>
                  {sec.videos.length > 0 ? (
                    <div className="space-y-2">
                      {sec.videos.map((v) => (
                        <a
                          key={v.id}
                          href={EMBED(v.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-olive/10 flex items-center justify-center shrink-0 group-hover:bg-olive/20 transition-colors">
                            <Play className="w-4 h-4 text-olive ml-0.5" fill="currentColor" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[13px]">
                              <span className="text-terracotta mr-1.5">{v.num}번</span>
                              {v.label}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-stone italic px-1">학습지만</p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
