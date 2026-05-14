import { Download, FileText, Play } from 'lucide-react';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';

export const metadata = {
  title: '대수 · 개념강의 (삼각함수~수학적귀납법)',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const SECTIONS: Array<{
  num: string;
  title: string;
  pdfs: Array<{ url: string; name: string }>;
  videos: Array<{ id: string; label: string }>;
}> = [
  {
    num: '5차시',
    title: '삼각함수',
    pdfs: [
      { url: 'https://mathgo-pdfs.b-cdn.net/pdfs/ds2/ds2_2_1_1_%EC%9D%BC%EB%B0%98%EA%B0%81%EA%B3%BC_%ED%98%B8%EB%8F%84%EB%B2%95.pdf', name: '일반각과 호도법' },
      { url: 'https://mathgo-pdfs.b-cdn.net/pdfs/ds2/ds2_2_1_2_%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98.pdf', name: '삼각함수' },
    ],
    videos: [
      { id: 'a1d24968-9d0d-4d39-bd8d-83305cc05d47', label: '일반각과 호도법' },
      { id: '56fe4f06-9fb9-4378-965c-10ce506e2ef3', label: '일반각과 호도법 문풀' },
      { id: '04c18f2b-8e8e-4d12-b12b-24cdcbf7deb8', label: '삼각함수' },
    ],
  },
  {
    num: '6차시',
    title: '삼각함수의 그래프 (1, 2)',
    pdfs: [
      { url: 'https://mathgo-pdfs.b-cdn.net/pdfs/ds2/ds2_2_1_3_%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98%EC%9D%98_%EA%B7%B8%EB%9E%98%ED%94%84_1.pdf', name: '삼각함수의 그래프 (1)' },
      { url: 'https://mathgo-pdfs.b-cdn.net/pdfs/ds2/ds2_2_1_3_%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98%EC%9D%98_%EA%B7%B8%EB%9E%98%ED%94%84_2.pdf', name: '삼각함수의 그래프 (2)' },
    ],
    videos: [
      { id: '748bda38-e088-4f17-9a78-455611a27c03', label: '삼각함수 그래프 (1) 사인·코사인' },
      { id: '40b1b2f1-71d2-489e-8767-a468b9b5f2ab', label: '삼각함수 그래프 (2) 탄젠트·평행·대칭이동' },
    ],
  },
  {
    num: '7차시',
    title: '삼각함수의 그래프 (3)',
    pdfs: [
      { url: 'https://mathgo-pdfs.b-cdn.net/pdfs/ds2/ds2_2_1_3_%EC%82%BC%EA%B0%81%ED%95%A8%EC%88%98%EC%9D%98_%EA%B7%B8%EB%9E%98%ED%94%84_3.pdf', name: '삼각함수의 그래프 (3)' },
    ],
    videos: [
      { id: '61305c99-5d30-4dbc-9a5e-5e547b475537', label: '삼각함수 그래프 (3) 방정식·부등식' },
    ],
  },
  {
    num: '8차시',
    title: '사인법칙과 코사인법칙',
    pdfs: [
      { url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/08_%EC%82%AC%EC%9D%B8_%EC%BD%94%EC%82%AC%EC%9D%B8%EB%B2%95%EC%B9%99/2_1_1_%20%EC%82%AC%EC%9D%B8%EB%B2%95%EC%B9%99%EA%B3%BC%20%EC%BD%94%EC%82%AC%EC%9D%B8%EB%B2%95%EC%B9%99_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf', name: '사인법칙과 코사인법칙' },
    ],
    videos: [
      { id: 'feda2e45-5303-4b75-b9c7-1d06577ca789', label: '14강 사인법칙과 코사인법칙' },
    ],
  },
  {
    num: '9차시',
    title: '수열의 뜻·등차수열',
    pdfs: [
      { url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/09_%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4/3_1_1_%20%EC%88%98%EC%97%B4%EC%9D%98%20%EB%9C%BB.pdf', name: '수열의 뜻' },
      { url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/09_%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4/3_1_2_%20%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4.pdf', name: '등차수열' },
      { url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/09_%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4/3_1_2_%20%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4%EC%9D%98%20%ED%95%A9.pdf', name: '등차수열의 합' },
    ],
    videos: [
      { id: 'b567c16b-ae11-4b9f-87ef-7d25f670db39', label: '15강 수열의 뜻' },
      { id: 'f2b88484-e776-410d-8ca7-dbbb0792d146', label: '16강 등차수열 (1)' },
      { id: '248d9767-8fe7-4aeb-a943-3fd9867bc36a', label: '17강 등차수열 (2) 합과 일반항' },
    ],
  },
  {
    num: '10차시',
    title: '등비수열',
    pdfs: [
      { url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/10_%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4/3_1_3_%20%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4.pdf', name: '등비수열' },
      { url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/10_%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4/3_1_3_%20%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4%EC%9D%98%20%ED%95%A9.pdf', name: '등비수열의 합' },
    ],
    videos: [
      { id: 'f62215fb-9392-4630-8253-1ff68ae715c1', label: '18강 등비수열 (1)' },
      { id: '3c9d13b9-b4b4-461c-aeb8-4a15b46743cd', label: '19강 등비수열 (2) 합' },
    ],
  },
  {
    num: '11차시',
    title: '수열의 합 (시그마)',
    pdfs: [
      { url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/11_%EC%88%98%EC%97%B4%EC%9D%98%ED%95%A9_%EC%8B%9C%EA%B7%B8%EB%A7%88/3_2_1_%20%ED%95%A9%EC%9D%98%20%EA%B8%B0%ED%98%B8%20%EC%8B%9C%EA%B7%B8%EB%A7%88.pdf', name: '합의 기호 시그마' },
    ],
    videos: [
      { id: '6eec82d7-1936-4d5d-a6c8-3cb4b6751867', label: '20강 합의 기호 시그마' },
    ],
  },
  {
    num: '12차시',
    title: '여러 가지 수열의 합',
    pdfs: [
      { url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/12_%EC%97%AC%EB%9F%AC%EA%B0%80%EC%A7%80%EC%88%98%EC%97%B4%EC%9D%98%ED%95%A9/3_2_2_%20%EC%97%AC%EB%9F%AC%20%EA%B0%80%EC%A7%80%20%EC%88%98%EC%97%B4%EC%9D%98%20%ED%95%A9_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf', name: '여러 가지 수열의 합' },
    ],
    videos: [
      { id: '5e95ea9b-cb96-4c52-9be7-2f36e522d018', label: '21강 여러 가지 수열의 합' },
    ],
  },
  {
    num: '13차시',
    title: '수열의 귀납적 정의',
    pdfs: [
      { url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/13_%EA%B7%80%EB%82%A9%EC%A0%81%EC%A0%95%EC%9D%98/3_2_1_%20%EC%88%98%EC%97%B4%EC%9D%98%20%EA%B7%80%EB%82%A9%EC%A0%81%20%EC%A0%95%EC%9D%98_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf', name: '수열의 귀납적 정의' },
    ],
    videos: [
      { id: 'efa2112f-757b-4c78-a6c8-a815b21a9547', label: '22강 수열의 귀납적 정의' },
    ],
  },
  {
    num: '14차시',
    title: '수학적 귀납법',
    pdfs: [
      { url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/14_%EC%88%98%ED%95%99%EC%A0%81%EA%B7%80%EB%82%A9%EB%B2%95/3_2_2_%20%EC%88%98%ED%95%99%EC%A0%81%20%EA%B7%80%EB%82%A9%EB%B2%95_%EB%AC%B8%EC%A0%9C%EC%A7%80.pdf', name: '수학적 귀납법' },
    ],
    videos: [
      { id: 'a568e94a-889f-41c5-b93d-e6b9deac7a61', label: '23강 수학적 귀납법' },
    ],
  },
];

export default function Ds2ConceptTrigSeqPage() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            대수 · 개념강의
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            삼각함수 · 수열
          </h1>
          <p className="text-[13px] text-olive mt-2">
            강의 먼저 보고, 문제지 풀어보세요.
          </p>
        </div>

        <div className="space-y-10">
          {SECTIONS.map((sec) => (
            <section key={sec.num} className="pb-10 border-b border-border-cream last:border-0 last:pb-0">
              <div className="mb-4">
                <span className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium">{sec.num}</span>
                <h2 className="font-serif text-[20px] tracking-tight mt-0.5">{sec.title}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 강의 */}
                <div>
                  <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
                    개념강의
                  </p>
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
                          <p className="font-medium text-[13px] truncate">{v.label}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* 문제지 */}
                <div>
                  <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
                    문제지
                  </p>
                  <div className="space-y-2">
                    {sec.pdfs.map((p) => (
                      <a
                        key={p.url}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-terracotta" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[13px] truncate">{p.name}</p>
                        </div>
                        <Download className="w-4 h-4 text-stone shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
