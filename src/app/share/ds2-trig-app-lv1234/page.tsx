import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const metadata = {
  title: '대수 · 삼각함수 활용 레벨1~4',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const PDF_BASE =
  'https://mathgo-pdfs.b-cdn.net/sessions/ds2/04_%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98%20%ED%99%9C%EC%9A%A9/%EA%B8%B0%EC%B6%9C';
const pdf = (file: string) => `${PDF_BASE}/${encodeURIComponent(file)}`;

const SECTIONS: Array<{
  level: string;
  pdf: { url: string; name: string; size: string };
  videos: Array<{ id: string; label: string; num: number }>;
}> = [
  {
    level: '레벨1',
    pdf: { url: pdf('삼각함수 활용 레벨1.pdf'), name: '삼각함수 활용 레벨1', size: '2.1 MB' },
    videos: [],
  },
  {
    level: '레벨2',
    pdf: { url: pdf('삼각함수 활용 레벨2.pdf'), name: '삼각함수 활용 레벨2', size: '1.9 MB' },
    videos: [],
  },
  {
    level: '레벨3',
    pdf: { url: pdf('삼각함수 활용 레벨3.pdf'), name: '삼각함수 활용 레벨3', size: '3.3 MB' },
    videos: [
      { id: '7a035924-d9dc-43c8-a9ba-ce6b82097cf1', label: '25년 10월 고2 27번', num: 1 },
      { id: '7744481c-3199-4210-8926-ac14972acd8c', label: '25년 9월 고2 25번',  num: 2 },
      { id: '7da68caf-9305-4e59-b968-6a65ff2ee922', label: '24년 6월 고2 16번',  num: 3 },
      { id: 'a382d6c7-4494-4d61-9b5b-b499e3e957d3', label: '24년 6월 고2 20번',  num: 4 },
      { id: 'c55b43db-9dc5-4969-82a2-2c222d33aa0b', label: '23년 11월 고2 18번', num: 5 },
      { id: '8b00cfc0-596c-419f-8b81-cb2f5b6bcbef', label: '23년 9월 고2 10번',  num: 6 },
      { id: '348c91f9-0989-4cce-a245-41a842812bf7', label: '22년 9월 고2 14번',  num: 7 },
    ],
  },
  {
    level: '레벨4-1',
    pdf: { url: pdf('삼각함수 활용 레벨4-1.pdf'), name: '삼각함수 활용 레벨4-1', size: '3.7 MB' },
    videos: [
      { id: '9941bc18-aa91-4979-a05b-aea29982ca67', label: '25년 6월 고2 29번',  num: 1 },
      { id: 'ddf5ce1f-ac6f-4dae-8bce-3ddceac07723', label: '25년 6월 고2 21번',  num: 2 },
      { id: '6eeb8aea-06ad-4b01-9e81-0e8a89ddb785', label: '24년 10월 고2 19번', num: 3 },
      { id: '1d4bdd6c-3eae-449f-a818-056db0d08065', label: '24년 9월 고2 27번',  num: 4 },
      { id: '8713ff81-ee1b-41d9-98b1-ae1215c598fd', label: '24년 6월 고2 29번',  num: 5 },
      { id: '1ad62156-55ee-4cec-b4a4-c283aa7c6ad3', label: '23년 9월 고2 28번',  num: 6 },
      { id: 'bc9589b9-4b14-4981-91d7-443491f670df', label: '23년 6월 고2 29번',  num: 7 },
      { id: 'cce542d8-af15-46ed-806f-823612d911fb', label: '22년 11월 고2 20번', num: 8 },
      { id: '260c5507-a3e1-48c8-ab4c-25dffe68183a', label: '21년 9월 고2 29번',  num: 9 },
      { id: '6920f913-3ba0-43f0-a28a-c5b327d27ff3', label: '21년 6월 고2 29번',  num: 10 },
      { id: '4d23b44d-7465-4242-88a2-9926fccd845f', label: '20년 9월 고2 16번',  num: 11 },
    ],
  },
  {
    level: '레벨4-2',
    pdf: { url: pdf('삼각함수 활용 레벨4-2.pdf'), name: '삼각함수 활용 레벨4-2', size: '3.0 MB' },
    videos: [],
  },
];

export default function Ds2TrigAppLv1234Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            대수 · 기출 해설강의
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            삼각함수 활용
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
