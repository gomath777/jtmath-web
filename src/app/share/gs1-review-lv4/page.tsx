import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const metadata = {
  title: '공수1 · 기출 레벨4 보강',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const GS1_BASE = 'https://mathgo-pdfs.b-cdn.net/gichul/gs1';

type Video = { num: number; label: string; id: string };

type Section = {
  unit: string;
  sublabel?: string;
  pdfFolder: string;
  pdfName: string;
  videos: Video[];
};

const SECTIONS: Section[] = [
  // ─── 여러가지 방정식 ───────────────────────────────────────
  {
    unit: '여러가지 방정식',
    pdfFolder: '04_여러가지_방정식_부등식/기출_PDF',
    pdfName: '여러가지 방정식 레벨4-1.pdf',
    videos: [
      { num: 1,  label: '25년 10월 고1 26번', id: 'a5bb72d3-cb8d-46bd-9fb4-43e5e751bef5' },
      { num: 2,  label: '25년 9월 고1 14번',  id: '014cc00f-6f20-44db-8865-51875aaa877d' },
      { num: 3,  label: '25년 9월 고1 18번',  id: 'df521d1a-d016-421a-b54b-187ed71b9719' },
      { num: 4,  label: '25년 6월 고1 29번',  id: '87931ba2-555b-4525-9dd4-0913f75ad607' },
      { num: 5,  label: '25년 3월 고2 27번',  id: '113f4c23-b45b-4d07-87e9-4e6d46fbcafc' },
      { num: 6,  label: '24년 10월 고1 14번', id: '5c6cccba-7bba-4002-a806-ce29826edccb' },
      { num: 7,  label: '24년 10월 고1 18번', id: '314d17a7-b989-4d96-a449-d391403f6565' },
      { num: 9,  label: '24년 6월 고1 20번',  id: '3738b6ef-5332-40a9-b997-32057c570741' },
      { num: 12, label: '23년 11월 고1 27번', id: '77305ce4-69b2-4b61-8cba-d5d51db98107' },
      { num: 13, label: '23년 9월 고1 18번',  id: 'cc274c1c-288f-4820-9861-17bac17b3df9' },
    ],
  },

  // ─── 경우의 수 L4-1 ───────────────────────────────────────
  {
    unit: '경우의 수',
    sublabel: 'L4-1',
    pdfFolder: '05_순열과 조합/기출_PDF',
    pdfName: '경우의 수 레벨4-1.pdf',
    videos: [
      { num: 1, label: '26년 3월 고2 27번',  id: 'f292f6f2-7b60-4fa6-8e79-5e22257ce6bb' },
      { num: 2, label: '25년 10월 고1 16번', id: 'cd5819a1-8a08-466e-9262-1de89888b4f2' },
      { num: 3, label: '25년 3월 고2 18번',  id: '62bbbb01-2144-4da9-a2b4-3a07dd7491c0' },
      { num: 4, label: '24년 3월 고2 18번',  id: 'aa29efdb-efdb-4e6c-a2b7-33d28b6d4b23' },
      { num: 5, label: '23년 3월 고2 27번',  id: '7005f509-d680-419e-b1a8-52b5f9c90636' },
      { num: 6, label: '22년 3월 고2 28번',  id: 'a42c2f73-7cba-449b-8432-6b91e6159f16' },
      { num: 7, label: '20년 3월 고2 17번',  id: 'b6d75ebe-ed5d-400e-a1db-dd2b862091ac' },
      { num: 8, label: '20년 3월 고2 29번',  id: '49313a26-6f28-4574-8930-b648fcd4cc09' },
    ],
  },

  // ─── 경우의 수 L4-2 ───────────────────────────────────────
  {
    unit: '경우의 수',
    sublabel: 'L4-2',
    pdfFolder: '05_순열과 조합/기출_PDF',
    pdfName: '경우의 수 레벨4-2.pdf',
    videos: [
      { num: 8,  label: '19년 4월 고3 이과 28번',  id: 'b4b7b0f3-5041-4ca9-b28e-8b3c871d1521' },
      { num: 9,  label: '18년 10월 고3 문과 27번', id: '8ae4e0ff-833c-4b72-bc04-da7ebe57b323' },
      { num: 11, label: '16년 10월 고3 문과 28번', id: '91668ecb-8d46-4449-a196-cb7fbe9bb5e8' },
    ],
  },

  // ─── 행렬 ─────────────────────────────────────────────────
  {
    unit: '행렬',
    pdfFolder: '06_행렬/기출_PDF',
    pdfName: '행렬 레벨4-1.pdf',
    videos: [
      { num: 2,  label: '25년 10월 고1 15번',      id: 'c036526f-c542-430b-8902-d976973538b2' },
      { num: 3,  label: '26년 3월 고2 29번',       id: '7de82190-7928-46fc-a732-e8b097bea407' },
      { num: 4,  label: '14년 6월 고2 문과 27번',   id: '62f3cc5a-db90-4300-9114-f929e020bd1f' },
      { num: 5,  label: '13년 11월 고2 문과 20번',  id: '39957389-2229-4752-a8f7-cef2772ba1c7' },
      { num: 7,  label: '13년 9월 고2 이과 15번',   id: '2796c4dd-6312-4e42-8acb-4074d3d0fbbb' },
      { num: 8,  label: '13년 6월 고2 문과 9번',    id: '431334a1-9d18-4939-926b-52e7179df510' },
      { num: 9,  label: '13년 6월 고2 문과 17번',   id: '9e45d5b0-fa50-4535-961b-cd57c32209ab' },
      { num: 10, label: '12년 11월 고2 문과 19번',  id: 'a54dc322-88e1-47da-b880-ccd4f6365f9c' },
    ],
  },
];

// 연속된 같은 unit을 묶어 첫 번째 섹션에만 단원명 표시
function unitLabel(idx: number): string | null {
  if (idx === 0) return SECTIONS[0].unit;
  return SECTIONS[idx].unit !== SECTIONS[idx - 1].unit ? SECTIONS[idx].unit : null;
}

export default function Gs1ReviewLv4Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            공수1 · 기출 레벨4 보강
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            여러가지 방정식 · 경우의 수 · 행렬
          </h1>
          <p className="text-[11px] text-stone font-mono mt-1">
            해설강의 29개
          </p>
          <p className="text-[13px] text-olive mt-2">
            학습지 먼저 받고, 막힌 번호 해설강의 확인하세요.
          </p>
        </div>

        {/* 섹션 목록 */}
        <div className="space-y-10">
          {SECTIONS.map((sec, i) => {
            const showUnitHeader = unitLabel(i);
            return (
              <div key={i}>
                {/* 단원 구분선 + 이름 (unit이 바뀔 때만) */}
                {showUnitHeader && i > 0 && (
                  <div className="border-t border-border-cream mt-10 mb-10" />
                )}
                {showUnitHeader && (
                  <div className="flex items-center gap-3 mb-5">
                    <h2 className="font-serif text-[18px] tracking-tight">{showUnitHeader}</h2>
                  </div>
                )}

                {/* sublabel (L4-1, L4-2 구분) */}
                {sec.sublabel && (
                  <p className="text-[11px] text-stone font-mono mb-3">{sec.sublabel}</p>
                )}

                {/* 학습지 */}
                <div className="mb-3">
                  <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2">
                    학습지
                  </p>
                  <a
                    href={getPdfDownloadHref(`${GS1_BASE}/${sec.pdfFolder.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(sec.pdfName)}`)}
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
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
