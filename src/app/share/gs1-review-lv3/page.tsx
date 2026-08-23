import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const metadata = {
  title: '공수1 · 기출 레벨3 보강',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const PDF_BASE = 'https://mathgo-pdfs.b-cdn.net/sessions/gs1/review_level3_final';

type Video = { num: number; label: string; id: string };

type Section = {
  title: string;
  pdfName: string;
  videos: Video[];
};

const SECTIONS: Section[] = [
  {
    title: '여러가지 방정식',
    pdfName: '여러가지 방정식 레벨3.pdf',
    videos: [
      { num: 1,  label: '25년 10월 고1 13번', id: 'fe8706d6-12c4-4238-9612-a9838faa24c9' },
      { num: 3,  label: '25년 6월 고1 18번',  id: 'e5239a00-697a-499e-8a95-91b6da8c5d25' },
      { num: 5,  label: '25년 6월 고1 26번',  id: '7f06f805-6708-4c19-9134-a03073caa231' },
      { num: 7,  label: '24년 9월 고1 15번',  id: '17a6db6c-ffee-4c53-94c2-7a7491c16284' },
      { num: 8,  label: '22년 6월 고1 28번',  id: '05f52efc-de32-4c5c-b825-869e9540f958' },
      { num: 12, label: '22년 6월 고1 15번',  id: '1e2ef30b-06b2-4548-88a1-c8f8760afcfa' },
    ],
  },
  {
    title: '경우의 수',
    pdfName: '경우의 수 레벨3.pdf',
    videos: [
      { num: 1,  label: '26년 3월 고2 16번',      id: 'ce34bfab-3eed-481b-95a2-d815d507ff71' },
      { num: 3,  label: '25년 9월 고1 26번',      id: 'af1afa2b-080a-4b1a-83be-c4f5121e0440' },
      { num: 4,  label: '25년 3월 고2 16번',      id: 'c807cd90-b888-427d-8455-f0a114ad84f2' },
      { num: 5,  label: '23년 3월 고2 12번',      id: 'e46cdf7a-1703-4030-95d4-97225b30a092' },
      { num: 10, label: '17년 11월 고3 이과 18번', id: '0c5d61f5-07ea-42c5-b6ef-0573175f41c5' },
      { num: 11, label: '17년 7월 고3 이과 26번',  id: '09d5efda-c5f3-4a82-93f2-4e1adf70c760' },
      { num: 12, label: '17년 6월 고3 이과 13번',  id: '87fce330-5198-40ee-820e-48cdd3fa7be2' },
      { num: 13, label: '16년 3월 고3 이과 17번',  id: 'fd2123c0-666d-4c32-8e80-0892d625fb0e' },
    ],
  },
  {
    title: '행렬',
    pdfName: '행렬 레벨3.pdf',
    videos: [
      { num: 1,  label: '25년 9월 고1 12번',      id: 'a44a9708-0736-4323-a92f-24c902f6540a' },
      { num: 4,  label: '14년 9월 고2 이과 24번',  id: '4bf5b6ad-c2de-4f05-9504-00859b7ce2aa' },
      { num: 5,  label: '14년 6월 고2 문과 6번',   id: 'cc303534-2bd2-4b35-a5b1-80b6a696bbf6' },
      { num: 6,  label: '14년 6월 고2 문과 11번',  id: '862ea558-5365-4643-92c2-b9c148615f2f' },
      { num: 8,  label: '13년 11월 고2 문과 10번', id: 'a28885cc-ee3d-4a47-9005-aa21b1696781' },
      { num: 10, label: '12년 11월 고2 문과 13번', id: 'e25916cc-ccf1-4d86-b60e-878c614fa0bf' },
      { num: 14, label: '11년 6월 고2 문과 16번',  id: '47ad8302-3b6b-4384-a0f8-465ca9c392e3' },
      { num: 15, label: '11년 6월 고2 문과 24번',  id: '8bf2baf3-1efe-48ac-8ddb-554d578ff9e8' },
    ],
  },
];

export default function Gs1ReviewLv3Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            공수1 · 기출 레벨3 보강
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            여러가지 방정식 · 경우의 수 · 행렬
          </h1>
          <p className="text-[11px] text-stone font-mono mt-1">
            해설강의 22개
          </p>
          <p className="text-[13px] text-olive mt-2">
            학습지 먼저 받고, 막힌 번호 해설강의 확인하세요.
          </p>
        </div>

        {/* 단원별 섹션 */}
        <div className="space-y-12">
          {SECTIONS.map((sec, i) => (
            <section key={i}>
              {/* 단원 헤더 */}
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-terracotta/15 text-terracotta text-[11px] font-bold shrink-0">
                  {i + 1}
                </span>
                <h2 className="font-serif text-[18px] tracking-tight">{sec.title}</h2>
              </div>

              {/* 학습지 */}
              <div className="mb-3">
                <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2">
                  학습지
                </p>
                <a
                  href={getPdfDownloadHref(`${PDF_BASE}/${encodeURIComponent(sec.pdfName)}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-terracotta" />
                  </div>
                  <p className="flex-1 font-medium text-[13px] truncate">{sec.pdfName.replace('.pdf', '')}</p>
                  <Download className="w-4 h-4 text-stone shrink-0" />
                </a>
              </div>

              {/* 해설강의 */}
              <div>
                <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2">
                  해설강의
                </p>
                <div className="space-y-1.5">
                  {sec.videos.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-ivory border border-border-cream"
                    >
                      <span className="inline-flex items-center justify-center min-w-[36px] h-6 px-2 rounded-md bg-terracotta/10 text-terracotta text-[11px] font-semibold shrink-0 tabular-nums">
                        {v.num}번
                      </span>
                      <p className="flex-1 text-[13px] text-stone min-w-0">{v.label}</p>
                      <a
                        href={EMBED(v.id)}
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
              </div>

              {/* 섹션 구분선 (마지막 제외) */}
              {i < SECTIONS.length - 1 && (
                <div className="mt-12 border-t border-border-cream" />
              )}
            </section>
          ))}
        </div>

      </main>
    </div>
  );
}
