import { Download, FileText, Play } from 'lucide-react';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';

export const metadata = {
  title: '대수 개념강의 · 수열',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const SECTIONS = [
  {
    label: '등차수열',
    range: '16~17강',
    pdfs: [
      {
        url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/09_%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4/3_1_2_%20%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4.pdf',
        lecture: 16,
        name: '등차수열',
        size: '3.7 MB',
      },
      {
        url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/09_%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4/3_1_2_%20%EB%93%B1%EC%B0%A8%EC%88%98%EC%97%B4%EC%9D%98%20%ED%95%A9.pdf',
        lecture: 17,
        name: '등차수열의 합',
        size: '3.8 MB',
      },
    ],
    videos: [
      { id: 'f2b88484-e776-410d-8ca7-dbbb0792d146', lecture: 16, title: '등차수열 (1)', duration: '34:14' },
      { id: '248d9767-8fe7-4aeb-a943-3fd9867bc36a', lecture: 17, title: '등차수열 (2) 합과 일반항', duration: '53:45' },
    ],
  },
  {
    label: '등비수열',
    range: '18~19강',
    pdfs: [
      {
        url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/10_%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4/3_1_3_%20%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4.pdf',
        lecture: 18,
        name: '등비수열',
        size: '4.1 MB',
      },
      {
        url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/10_%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4/3_1_3_%20%EB%93%B1%EB%B9%84%EC%88%98%EC%97%B4%EC%9D%98%20%ED%95%A9.pdf',
        lecture: 19,
        name: '등비수열의 합',
        size: '3.4 MB',
      },
    ],
    videos: [
      { id: 'f62215fb-9392-4630-8253-1ff68ae715c1', lecture: 18, title: '등비수열 (1)', duration: '21:15' },
      { id: '3c9d13b9-b4b4-461c-aeb8-4a15b46743cd', lecture: 19, title: '등비수열 (2) 합', duration: '18:39' },
    ],
  },
  {
    label: '수열의 합',
    range: '20강',
    pdfs: [
      {
        url: 'https://mathgo-pdfs.b-cdn.net/concept/ds/11_%EC%88%98%EC%97%B4%EC%9D%98%ED%95%A9_%EC%8B%9C%EA%B7%B8%EB%A7%88/3_2_1_%20%ED%95%A9%EC%9D%98%20%EA%B8%B0%ED%98%B8%20%EC%8B%9C%EA%B7%B8%EB%A7%88.pdf',
        lecture: 20,
        name: '합의 기호 시그마',
        size: '3.6 MB',
      },
    ],
    videos: [
      { id: '6eec82d7-1936-4d5d-a6c8-3cb4b6751867', lecture: 20, title: '합의 기호 시그마', duration: '34:00' },
    ],
  },
];

export default function DsConceptSuyeolSharePage() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            대수 · 개념강의
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            16~20강 · 수열
          </h1>
          <p className="text-[13px] text-olive mt-2">
            학습지 먼저 받고, 해당 강 학습지 옆에 두고 영상 보세요.
          </p>
        </div>

        <div className="space-y-12">
          {SECTIONS.map((sec) => (
            <section key={sec.label}>
              {/* 섹션 헤더 */}
              <div className="flex items-baseline gap-2 mb-4">
                <h2 className="font-serif text-[20px] tracking-tight">{sec.label}</h2>
                <span className="text-[12px] text-stone font-mono">{sec.range}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 학습지 */}
                <div>
                  <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-2.5">
                    학습지
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
                          <p className="font-medium text-[13px] truncate">
                            <span className="text-terracotta mr-1.5">{p.lecture}강</span>
                            {p.name}
                          </p>
                          <p className="text-[11px] text-stone mt-0.5">{p.size}</p>
                        </div>
                        <Download className="w-4 h-4 text-stone shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* 영상 */}
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
                          <p className="font-medium text-[13px] truncate">
                            <span className="text-terracotta mr-1.5">{v.lecture}강</span>
                            {v.title}
                          </p>
                          <p className="text-[11px] text-stone mt-0.5 tabular-nums">{v.duration}</p>
                        </div>
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
