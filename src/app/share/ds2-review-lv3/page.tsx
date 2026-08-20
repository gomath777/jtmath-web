import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const metadata = {
  title: '대수 · 기출 레벨3 보강',
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
  pdfName: string;
  pdfUrl: string;
  videos: Video[];
};

const SECTIONS: Section[] = [
  {
    title: '삼각함수 활용',
    pdfName: '삼각함수 활용 레벨3',
    pdfUrl: pdfUrl('04_삼각함수 활용', '삼각함수 활용 레벨3.pdf'),
    videos: [
      { num: 1,  label: '25년 10월 고2 27번', id: '7a035924-d9dc-43c8-a9ba-ce6b82097cf1' },
      { num: 2,  label: '25년 9월 고2 25번',  id: '7744481c-3199-4210-8926-ac14972acd8c' },
      { num: 3,  label: '24년 6월 고2 16번',  id: '7da68caf-9305-4e59-b968-6a65ff2ee922' },
      { num: 4,  label: '24년 6월 고2 20번',  id: 'a382d6c7-4494-4d61-9b5b-b499e3e957d3' },
      { num: 5,  label: '23년 11월 고2 18번', id: 'c55b43db-9dc5-4969-82a2-2c222d33aa0b' },
      { num: 6,  label: '23년 9월 고2 10번',  id: '8b00cfc0-596c-419f-8b81-cb2f5b6bcbef' },
      { num: 7,  label: '22년 9월 고2 14번',  id: '348c91f9-0989-4cce-a245-41a842812bf7' },
    ],
  },
  {
    title: '등차수열',
    pdfName: '등차수열 레벨3',
    pdfUrl: pdfUrl('05_등차수열', '등차수열 레벨3.pdf'),
    videos: [
      { num: 1,  label: '25년 9월 고2 12번',      id: 'f7630c8f-fd04-4704-9610-ec708011addd' },
      { num: 3,  label: '23년 11월 고2 27번',     id: '8031610f-cef6-49dc-9c5b-a1088634bbfc' },
      { num: 4,  label: '22년 9월 고2 15번',      id: '8f771db5-13cc-4850-b264-4def3ce038ef' },
      { num: 5,  label: '20년 11월 고2 25번',     id: 'b3be1eff-a55a-4da6-860f-107101fc3cd9' },
      { num: 7,  label: '19년 9월 고2 이과 20번', id: 'a9949705-3d14-45d4-a6b1-c8472c54e059' },
      { num: 9,  label: '17년 3월 고2 문과 10번', id: '706bfec8-7772-403c-92e4-235193fe61d5' },
      { num: 10, label: '17년 3월 고2 이과 24번', id: '855d27bf-4f4e-44a0-969b-45a1ceac5500' },
    ],
  },
  {
    title: '등비수열',
    pdfName: '등비수열 레벨3',
    pdfUrl: pdfUrl('06_등비수열', '등비수열 레벨3.pdf'),
    videos: [
      { num: 1,  label: '25년 9월 고2 26번',       id: 'ea066472-b133-4ebb-b7ad-e077b207e8ec' },
      { num: 2,  label: '24년 9월 고2 10번',       id: '82894f47-5ba8-41bc-b4d2-70c2c75d5b73' },
      { num: 3,  label: '24년 9월 고2 13번',       id: 'ec1b5f59-2061-4caa-8b4f-1518e365c096' },
      { num: 4,  label: '23년 9월 고2 11번',       id: '7ec78c88-d42a-4b36-8f04-92461e11bcc8' },
      { num: 5,  label: '22년 9월 고2 12번',       id: 'fefb4660-cdc5-4deb-9f9b-2106084d8085' },
      { num: 6,  label: '21년 11월 고2 14번',      id: '603a341f-2b04-4899-b818-23522a23ce0c' },
      { num: 7,  label: '19년 11월 고2 문과 17번', id: 'bd108dcc-ac91-49c9-b6ca-3d3034927922' },
      { num: 9,  label: '17년 11월 고2 문과 18번', id: 'd0aa501f-f10d-4767-94d5-097e4829f379' },
      { num: 12, label: '17년 3월 고2 문과 15번',  id: 'b4ee964a-5f8a-4ec6-a443-f94b147f423a' },
      { num: 14, label: '15년 9월 고2 문과 27번',  id: '8518c75d-2b24-450b-aaa8-a4d67992d00f' },
    ],
  },
  {
    title: '수열의 합',
    pdfName: '수열의 합 레벨3',
    pdfUrl: pdfUrl('07_수열의 합', '수열의 합 레벨3.pdf'),
    videos: [
      { num: 1,  label: '25년 10월 고2 14번', id: '2a00b079-de37-444e-9fd2-62fcd69fccfa' },
      { num: 2,  label: '25년 10월 고2 20번', id: '8341fa0c-e6c9-44eb-ad79-81dc27eaba9f' },
      { num: 3,  label: '25년 9월 고2 14번',  id: '5e8c72ac-0716-4b94-8fec-851ada1e3ef3' },
      { num: 4,  label: '25년 9월 고2 15번',  id: '7b4bd919-cfd0-4b4b-9da1-c5d3a73e24fc' },
      { num: 5,  label: '24년 10월 고2 12번', id: 'b6905535-a47f-4248-a584-3b4d9af49521' },
      { num: 6,  label: '24년 10월 고2 13번', id: '41bc741e-6749-491a-904a-3377ccd7fdc4' },
      { num: 7,  label: '24년 9월 고2 16번',  id: 'eb60f0d5-a6a7-4d01-a55f-e8b22cf20ecb' },
      { num: 8,  label: '24년 9월 고2 17번',  id: '93c89968-fb14-4654-bd4d-514bee14e86c' },
      { num: 12, label: '22년 11월 고2 15번', id: '7c097224-486e-4d88-8b77-215686a7938f' },
      { num: 15, label: '21년 11월 고2 27번', id: '42b53807-f67e-4fed-9d08-988a10076012' },
      { num: 18, label: '23년 6월 고3 9번',   id: '3767c56e-e0dc-484f-ad2d-a362bba7d14e' },
    ],
  },
  {
    title: '수학적 귀납법',
    pdfName: '수학적 귀납법 레벨3',
    pdfUrl: pdfUrl('08_수학적 귀납법', '수학적 귀납법 레벨3.pdf', 'd97edc494b'),
    videos: [
      { num: 1, label: '23년 11월 고2 15번',      id: '8da6e8f5-1131-450b-857d-f942f910dd30' },
      { num: 2, label: '23년 9월 고2 17번',       id: 'fb6d20a6-d12a-404d-a81d-74d2526e12d0' },
      { num: 3, label: '22년 9월 고2 13번',       id: '9932d6c4-0fd3-4caf-94d5-5ff8ed5f2e8b' },
      { num: 5, label: '18년 11월 고2 문과 19번', id: 'fd60aaad-d313-4ae1-b711-be020e1aabc1' },
      { num: 7, label: '11년 9월 고2 이과 24번',  id: 'c7d307f9-4f3f-4e18-85f6-c65a569a16f2' },
      { num: 8, label: '15년 3월 고2 이과 17번',  id: 'dc1abcff-a389-4cbc-9d8d-40eb775e0a74' },
    ],
  },
];

export default function Ds2ReviewLv3Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            대수 · 기출 레벨3 보강
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            삼각함수 활용 · 수열 · 수학적 귀납법
          </h1>
          <p className="text-[11px] text-stone font-mono mt-1">
            해설강의 41개
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
