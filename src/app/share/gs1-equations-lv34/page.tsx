import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';

export const metadata = {
  title: '공수1 · 여러가지 방정식 레벨3·4',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const SECTIONS = [
  {
    level: '레벨3',
    pdf: {
      url: 'https://mathgo-pdfs.b-cdn.net/sessions/auto/223efde8/w1s1/여러가지 방정식 레벨3.pdf',
      name: '여러가지 방정식 레벨3',
      size: '3.2 MB',
    },
    videos: [
      { id: 'fe8706d6-12c4-4238-9612-a9838faa24c9', label: '25년 10월 고1 13번', num: 1 },
      { id: 'e5239a00-697a-499e-8a95-91b6da8c5d25', label: '25년 6월 고1 18번',  num: 3 },
      { id: '7f06f805-6708-4c19-9134-a03073caa231', label: '25년 6월 고1 26번',  num: 5 },
      { id: '17a6db6c-ffee-4c53-94c2-7a7491c16284', label: '24년 9월 고1 15번',  num: 7 },
      { id: '05f52efc-de32-4c5c-b825-869e9540f958', label: '22년 6월 고1 28번',  num: 8 },
      { id: '1e2ef30b-06b2-4548-88a1-c8f8760afcfa', label: '22년 6월 고1 15번',  num: 12 },
    ],
  },
  {
    level: '레벨4-1',
    pdf: {
      url: 'https://mathgo-pdfs.b-cdn.net/sessions/auto/223efde8/w1s1/여러가지 방정식 레벨4-1.pdf',
      name: '여러가지 방정식 레벨4-1',
      size: '3.1 MB',
    },
    videos: [
      { id: 'a5bb72d3-cb8d-46bd-9fb4-43e5e751bef5', label: '25년 10월 고1 26번', num: 1 },
      { id: '014cc00f-6f20-44db-8865-51875aaa877d', label: '25년 9월 고1 14번',  num: 2 },
      { id: 'df521d1a-d016-421a-b54b-187ed71b9719', label: '25년 9월 고1 18번',  num: 3 },
      { id: '87931ba2-555b-4525-9dd4-0913f75ad607', label: '25년 6월 고1 29번',  num: 4 },
      { id: '113f4c23-b45b-4d07-87e9-4e6d46fbcafc', label: '25년 3월 고2 27번',  num: 5 },
      { id: '5c6cccba-7bba-4002-a806-ce29826edccb', label: '24년 10월 고1 14번', num: 6 },
      { id: '314d17a7-b989-4d96-a449-d391403f6565', label: '24년 10월 고1 18번', num: 7 },
      { id: '3738b6ef-5332-40a9-b997-32057c570741', label: '24년 6월 고1 20번',  num: 9 },
      { id: '77305ce4-69b2-4b61-8cba-d5d51db98107', label: '23년 11월 고1 27번', num: 12 },
      { id: 'cc274c1c-288f-4820-9861-17bac17b3df9', label: '23년 9월 고1 18번',  num: 13 },
    ],
  },
];

export default function Gs1EquationsLv34Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            공통수학1 · 기출 해설강의
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            여러가지 방정식
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
                    href={sec.pdf.url}
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
                    <p className="text-[12px] text-stone italic px-1">해설강의 없음</p>
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
