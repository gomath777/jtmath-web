import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const metadata = {
  title: '대수 · 기출 레벨4 보강',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const DS2_BASE = 'https://mathgo-pdfs.b-cdn.net/gichul/ds2';

function pdfUrl(folder: string, fileName: string, vParam?: string): string {
  const url = `${DS2_BASE}/${encodeURIComponent(folder)}/기출_PDF/${encodeURIComponent(fileName)}`;
  return vParam ? `${url}?v=${vParam}` : url;
}

type Video = { num: number; label: string; id: string };

type Section = {
  title: string;
  sublabel?: string;
  pdfName: string;
  pdfUrl: string;
  videos: Video[];
};

const SECTIONS: Section[] = [
  {
    title: '삼각함수 활용',
    sublabel: 'L4-1',
    pdfName: '삼각함수 활용 레벨4-1',
    pdfUrl: pdfUrl('04_삼각함수 활용', '삼각함수 활용 레벨4-1.pdf'),
    videos: [
      { num: 1,  label: '25년 6월 고2 29번',  id: '9941bc18-aa91-4979-a05b-aea29982ca67' },
      { num: 2,  label: '25년 6월 고2 21번',  id: 'ddf5ce1f-ac6f-4dae-8bce-3ddceac07723' },
      { num: 3,  label: '24년 10월 고2 19번', id: '6eeb8aea-06ad-4b01-9e81-0e8a89ddb785' },
      { num: 4,  label: '24년 9월 고2 27번',  id: '1d4bdd6c-3eae-449f-a818-056db0d08065' },
      { num: 5,  label: '24년 6월 고2 29번',  id: '8713ff81-ee1b-41d9-98b1-ae1215c598fd' },
      { num: 6,  label: '23년 9월 고2 28번',  id: '1ad62156-55ee-4cec-b4a4-c283aa7c6ad3' },
      { num: 7,  label: '23년 6월 고2 29번',  id: 'bc9589b9-4b14-4981-91d7-443491f670df' },
      { num: 8,  label: '22년 11월 고2 20번', id: 'cce542d8-af15-46ed-806f-823612d911fb' },
      { num: 9,  label: '21년 9월 고2 29번',  id: '260c5507-a3e1-48c8-ab4c-25dffe68183a' },
      { num: 10, label: '21년 6월 고2 29번',  id: '6920f913-3ba0-43f0-a28a-c5b327d27ff3' },
      { num: 11, label: '20년 9월 고2 16번',  id: '4d23b44d-7465-4242-88a2-9926fccd845f' },
    ],
  },
  {
    title: '등차수열',
    pdfName: '등차수열 레벨4',
    pdfUrl: pdfUrl('05_등차수열', '등차수열 레벨4.pdf'),
    videos: [
      { num: 1, label: '25년 10월 고2 17번',     id: 'f317a41a-69bd-49d8-985f-91faa31803a2' },
      { num: 2, label: '24년 10월 고2 28번',     id: '405d62bd-d93a-41cf-8759-415ce4809b26' },
      { num: 3, label: '17년 9월 고2 이과 14번', id: 'a7617efd-2846-4392-8020-69db87a57247' },
      { num: 4, label: '17년 6월 고2 문과 29번', id: 'e19fa029-538b-4f90-ab84-1ca353215f62' },
      { num: 5, label: '15년 9월 고2 문과 14번', id: '6cf4a868-207f-4367-8808-0df4532b18dd' },
      { num: 6, label: '15년 3월 고2 이과 28번', id: '137716b8-6c9f-4712-a150-4f050697c556' },
    ],
  },
  {
    title: '등비수열',
    pdfName: '등비수열 레벨4',
    pdfUrl: pdfUrl('06_등비수열', '등비수열 레벨4.pdf'),
    videos: [
      { num: 1, label: '19년 11월 고2 이과 27번', id: '586114e0-f768-4756-8918-16c42af645ec' },
      { num: 2, label: '18년 3월 고2 이과 30번',  id: 'c4edc80f-cbab-4f82-9221-208df0d65780' },
      { num: 3, label: '17년 3월 고2 이과 18번',  id: '1e262f47-ff20-45e9-b6bd-8b61e205dd00' },
      { num: 4, label: '16년 3월 고2 이과 28번',  id: 'feeebcc8-cc78-490d-98ac-6aec8c3f2d4b' },
      { num: 5, label: '15년 9월 고2 이과 29번',  id: '4d3494df-4ec9-42c1-9c78-cc979d39dc37' },
      { num: 6, label: '15년 6월 고2 이과 28번',  id: '7c4e19ac-22f4-4abd-8586-550511c887d9' },
    ],
  },
  {
    title: '수열의 합',
    pdfName: '수열의 합 레벨4',
    pdfUrl: pdfUrl('07_수열의 합', '수열의 합 레벨4.pdf'),
    videos: [
      { num: 1, label: '25년 9월 고2 28번',  id: '76d81bb3-cfc5-4aba-bdce-18d9109510d1' },
      { num: 2, label: '24년 10월 고2 26번', id: '2b008f62-8077-4976-862c-13b2c844efc1' },
      { num: 3, label: '23년 9월 고2 19번',  id: '8413d945-79d4-4dc1-83b6-4c8024d1e7b5' },
      { num: 4, label: '23년 9월 고2 27번',  id: '0fbabe4b-2552-4338-addc-dc9dc507a8a1' },
      { num: 5, label: '22년 9월 고2 17번',  id: '824dbcfd-1b0c-474d-8044-3cfdbec3e55a' },
      { num: 6, label: '22년 9월 고2 28번',  id: '7255d179-e8f4-48fe-af5b-7e599e4894ca' },
      { num: 7, label: '21년 11월 고2 19번', id: 'e77f8c6b-4a6b-41ce-94e5-0db4824e3347' },
      { num: 8, label: '21년 9월 고2 17번',  id: '37f6670e-4247-47ff-ad0a-031ce61d0fab' },
      { num: 9, label: '21년 9월 고2 21번',  id: 'dafa4669-1fda-4c7f-900d-dc534a71552a' },
    ],
  },
  {
    title: '수학적 귀납법',
    sublabel: 'L4-1',
    pdfName: '수학적 귀납법 레벨4-1',
    pdfUrl: pdfUrl('08_수학적 귀납법', '수학적 귀납법 레벨4-1.pdf', '9578c629c8'),
    videos: [
      { num: 1, label: '21년 9월 고2 18번',  id: 'b253dd48-44ba-4701-97cd-b553138d9b24' },
      { num: 2, label: '25년 10월 고2 29번', id: 'dad98f53-a0a9-463e-b762-587968bac966' },
      { num: 3, label: '24년 10월 고2 21번', id: '3045be7c-c848-4bdc-a77c-ce4182837d39' },
      { num: 4, label: '23년 11월 고2 21번', id: '4c5a373b-e62a-4eba-937a-d35a4080b233' },
      { num: 5, label: '23년 9월 고2 21번',  id: '22560795-b8dd-4b1a-a79f-610ae4d5b303' },
    ],
  },
];

export default function Ds2ReviewLv4Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            대수 · 기출 레벨4 보강
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            삼각함수 활용 · 수열 · 수학적 귀납법
          </h1>
          <p className="text-[11px] text-stone font-mono mt-1">
            해설강의 37개
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
                {sec.sublabel && (
                  <span className="text-[11px] text-stone font-mono">{sec.sublabel}</span>
                )}
              </div>

              {/* 학습지 */}
              <div className="mb-3">
                <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2">
                  학습지
                </p>
                <a
                  href={getPdfDownloadHref(sec.pdfUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-terracotta" />
                  </div>
                  <p className="flex-1 font-medium text-[13px] truncate">{sec.pdfName}</p>
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
