import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';

export const metadata = {
  title: '공수1 · 기출 레벨4 보강 2',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const GS1_BASE = 'https://mathgo-pdfs.b-cdn.net/gichul/gs1';

function pdfUrl(folder: string, fileName: string): string {
  return `${GS1_BASE}/${encodeURIComponent(folder)}/기출_PDF/${encodeURIComponent(fileName)}`;
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
    title: '이차방정식과 이차함수',
    sublabel: 'L4-1',
    pdfName: '이차방정식과 이차함수 레벨4-1',
    pdfUrl: pdfUrl('03_이차방정식_이차함수', '이차방정식과 이차함수 레벨4-1.pdf'),
    videos: [
      { num: 1,  label: '25년 10월 고1 17번', id: 'f46ed727-2db9-451a-bdae-0266ad6756dc' },
      { num: 2,  label: '25년 9월 고1 16번',  id: '749b4668-51a6-40f1-953f-17d1b230a223' },
      { num: 3,  label: '25년 9월 고1 17번',  id: '45e80fb9-787c-47e5-a76c-6313f76d64f9' },
      { num: 4,  label: '25년 9월 고1 28번',  id: '6774d963-9159-4a57-98d6-657a404773a1' },
      { num: 5,  label: '25년 6월 고1 27번',  id: '4bb705cb-1107-43e3-9725-5aec19ff6595' },
      { num: 6,  label: '25년 6월 고1 28번',  id: 'aac24eba-940c-4df3-8cc7-17f9e045f507' },
      { num: 7,  label: '24년 10월 고1 17번', id: '2cf464fb-6827-4e40-a841-34438e55c3de' },
      { num: 8,  label: '24년 10월 고1 19번', id: 'b4c8786a-2d0a-4504-b2f2-8cc5c0472880' },
      { num: 9,  label: '24년 9월 고1 19번',  id: 'df6068c6-bd0a-45d6-82df-ab0a866e5448' },
      { num: 10, label: '24년 6월 고1 18번',  id: '8c1c2fde-955d-4d95-a49b-eda79d4a65fc' },
      { num: 11, label: '23년 6월 고1 20번',  id: '35aa74c2-79a4-48db-b6af-62e71c631821' },
      { num: 12, label: '23년 11월 고1 17번', id: '4e1c6929-6efb-4bed-ac65-c971361b4b42' },
      { num: 13, label: '23년 6월 고1 15번',  id: '9443489f-625e-4f37-9011-e79f97bc895b' },
    ],
  },
  {
    title: '여러가지 방정식',
    sublabel: 'L4-1',
    pdfName: '여러가지 방정식 레벨4-1',
    pdfUrl: pdfUrl('04_여러가지_방정식_부등식', '여러가지 방정식 레벨4-1.pdf'),
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
  {
    title: '행렬',
    sublabel: 'L4-1',
    pdfName: '행렬 레벨4-1',
    pdfUrl: pdfUrl('06_행렬', '행렬 레벨4-1.pdf'),
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

export default function Gs1Review2Lv4Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            공수1 · 기출 레벨4 보강
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            이차방정식과 이차함수 · 여러가지 방정식 · 행렬
          </h1>
          <p className="text-[11px] text-stone font-mono mt-1">
            해설강의 31개
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
                  href={sec.pdfUrl}
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
