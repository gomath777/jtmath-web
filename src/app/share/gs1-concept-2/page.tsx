import { Download, Play } from 'lucide-react';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';

export const metadata = {
  title: '공통수학1 · 개념강의 후반부',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

type Lecture = {
  num: number;
  title: string;
  pdfUrl: string;
  pdfName: string;
  videoId: string;
};

type Section = {
  label: string;
  range: string;
  lectures: Lecture[];
};

const SECTIONS: Section[] = [
  {
    label: '여러 가지 방정식·부등식',
    range: '10~14강',
    lectures: [
      {
        num: 10, title: '삼차·사차방정식',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/09_%EC%82%BC%EC%B0%A8%EC%82%AC%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D/2_3_1_%20%EC%82%BC%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D%EA%B3%BC%20%EC%82%AC%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D%EC%9D%98%20%ED%92%80%EC%9D%B4.pdf',
        pdfName: '삼차방정식과 사차방정식의 풀이',
        videoId: '2c8416f6-7e0d-4478-bfee-87fca1c96c7b',
      },
      {
        num: 11, title: '연립이차방정식',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/10_%EC%97%B0%EB%A6%BD%EB%B0%A9%EC%A0%95%EC%8B%9D%EB%B6%80%EB%93%B1%EC%8B%9D/2_3_2_%20%EB%AF%B8%EC%A7%80%EC%88%98%EA%B0%80%202%EA%B0%9C%EC%9D%B8%20%EC%97%B0%EB%A6%BD%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D.pdf',
        pdfName: '미지수가 2개인 연립이차방정식',
        videoId: '2025c5d5-d6fc-4e4c-95c8-d8ee33243220',
      },
      {
        num: 12, title: '연립일차부등식',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/10_%EC%97%B0%EB%A6%BD%EB%B0%A9%EC%A0%95%EC%8B%9D%EB%B6%80%EB%93%B1%EC%8B%9D/2_3_3_%20%EB%AF%B8%EC%A7%80%EC%88%98%EA%B0%80%201%EA%B0%9C%EC%9D%B8%20%EC%97%B0%EB%A6%BD%EC%9D%BC%EC%B0%A8%EB%B6%80%EB%93%B1%EC%8B%9D.pdf',
        pdfName: '미지수가 1개인 연립일차부등식',
        videoId: 'c3ddef0e-2d08-4ec3-8e0b-b8559b8b24fc',
      },
      {
        num: 13, title: '절댓값 부등식',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/11_%EC%A0%88%EB%8C%93%EA%B0%92%EB%B6%80%EB%93%B1%EC%8B%9D/2_3_4_%20%EC%A0%88%EB%8C%93%EA%B0%92%EC%9D%84%20%ED%8F%AC%ED%95%A8%ED%95%9C%20%EC%9D%BC%EC%B0%A8%EB%B6%80%EB%93%B1%EC%8B%9D.pdf',
        pdfName: '절댓값을 포함한 일차부등식',
        videoId: 'ee73dced-37ce-45fa-9282-229caa58ba3d',
      },
      {
        num: 14, title: '이차부등식',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/12_%EC%9D%B4%EC%B0%A8%EB%B6%80%EB%93%B1%EC%8B%9D/2_3_5_%20%EC%9D%B4%EC%B0%A8%EB%B6%80%EB%93%B1%EC%8B%9D%EA%B3%BC%20%EC%97%B0%EB%A6%BD%EC%9D%B4%EC%B0%A8%EB%B6%80%EB%93%B1%EC%8B%9D.pdf',
        pdfName: '이차부등식과 연립이차부등식',
        videoId: 'b237de19-3deb-499c-8e23-d9f972e97ed0',
      },
    ],
  },
  {
    label: '경우의 수',
    range: '15~17강',
    lectures: [
      {
        num: 15, title: '경우의 수 (합·곱의 법칙)',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/13_%EA%B2%BD%EC%9A%B0%EC%9D%98%EC%88%98/3_1_1_%20%ED%95%A9%EC%9D%98%EB%B2%95%EC%B9%99%EA%B3%BC%20%EA%B3%B1%EC%9D%98%20%EB%B2%95%EC%B9%99.pdf',
        pdfName: '합의 법칙과 곱의 법칙',
        videoId: '207e2f00-3531-4ab0-a1a9-18c03eaa2627',
      },
      {
        num: 16, title: '순열',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/13_%EA%B2%BD%EC%9A%B0%EC%9D%98%EC%88%98/3_2_1_%20%EC%88%9C%EC%97%B4.pdf',
        pdfName: '순열',
        videoId: 'dd9d9ac5-9c18-4120-bb30-d2db53547275',
      },
      {
        num: 17, title: '조합',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/14_%EC%A1%B0%ED%95%A9/3_2_2_%20%EC%A1%B0%ED%95%A9.pdf',
        pdfName: '조합',
        videoId: 'ebefa957-f079-4403-9b9a-46f6b753ba36',
      },
    ],
  },
  {
    label: '행렬',
    range: '18~19강',
    lectures: [
      {
        num: 18, title: '행렬',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/15_%ED%96%89%EB%A0%AC/4_1_1_%20%ED%96%89%EB%A0%AC.pdf',
        pdfName: '행렬의 정의',
        videoId: '0d284cfa-e18d-40d0-9c62-19b524697ba7',
      },
      {
        num: 19, title: '행렬의 연산',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/15_%ED%96%89%EB%A0%AC/4_1_2_%20%ED%96%89%EB%A0%AC%EC%9D%98%20%EC%97%B0%EC%82%B0.pdf',
        pdfName: '행렬의 연산',
        videoId: 'bd1d8cc5-1755-49dd-9b85-01e4bef9cedd',
      },
    ],
  },
];

export default function Gs1ConceptPart2Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            공통수학1 · 개념강의
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            10~19강 · 후반부
          </h1>
          <p className="text-[13px] text-olive mt-2">
            개념노트 먼저 받고, 해당 강 노트 옆에 두고 영상 보세요.
          </p>
        </div>

        <div className="space-y-12">
          {SECTIONS.map((sec) => (
            <section key={sec.label}>
              <div className="flex items-baseline gap-2 mb-4">
                <h2 className="font-serif text-[20px] tracking-tight">{sec.label}</h2>
                <span className="text-[12px] text-stone font-mono">{sec.range}</span>
              </div>

              <div className="space-y-2">
                {sec.lectures.map((lec) => (
                  <div
                    key={lec.num}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream"
                  >
                    <span className="inline-flex items-center justify-center min-w-[36px] h-6 px-2 rounded-md bg-terracotta/10 text-terracotta text-[11px] font-semibold shrink-0 tabular-nums">
                      {lec.num}강
                    </span>
                    <p className="flex-1 text-[13px] font-medium text-ink min-w-0 leading-snug">
                      {lec.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={lec.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone/8 hover:bg-terracotta/10 text-stone hover:text-terracotta transition-colors text-[11px] font-medium"
                        title={lec.pdfName}
                      >
                        <Download className="w-3.5 h-3.5" />
                        개념노트
                      </a>
                      <a
                        href={EMBED(lec.videoId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-olive/10 hover:bg-olive/20 text-olive transition-colors text-[11px] font-medium"
                      >
                        <Play className="w-3.5 h-3.5" fill="currentColor" />
                        영상 보기
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
