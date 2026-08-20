import { Download, Play } from 'lucide-react';
import { ConceptAccessPage } from '../_components/ConceptAccessPage';
import type { ConceptGateConfig } from '../_components/conceptAccess';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '공통수학1 · 개념강의 전반부',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${CONCEPT_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const GATE_CONFIG: ConceptGateConfig = {
  cookieName: 'gs1_concept_part1_unlocked',
  path: '/share/gs1-concept',
  tokenSeed: 'gs1-concept-part1:v1',
  passcodeEnvKeys: ['GS1_CONCEPT_PART1_PASSCODE', 'GS1_CONCEPT_PASSCODE'],
};

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
    label: '다항식',
    range: '1~3강',
    lectures: [
      {
        num: 1, title: '다항식의 연산',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/01_%EB%8B%A4%ED%95%AD%EC%8B%9D%EC%97%B0%EC%82%B0/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%201.1.1.%EB%8B%A4%ED%95%AD%EC%8B%9D%EC%9D%98%20%EC%82%AC%EC%B9%99%EC%97%B0%EC%82%B0.pdf',
        pdfName: '다항식의 사칙연산',
        videoId: '0433291f-b6c1-40f6-9b95-cbfe183c81d2',
      },
      {
        num: 2, title: '나머지정리',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/02_%EB%82%98%EB%A8%B8%EC%A7%80%EC%A0%95%EB%A6%AC/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%201.1.2.%20%ED%95%AD%EB%93%B1%EC%8B%9D%EA%B3%BC%20%EB%82%98%EB%A8%B8%EC%A7%80%EC%A0%95%EB%A6%AC.pdf',
        pdfName: '항등식과 나머지정리',
        videoId: '18d2abe9-9dcf-4288-933a-376e7a47e6ad',
      },
      {
        num: 3, title: '인수분해',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/03_%EC%9D%B8%EC%88%98%EB%B6%84%ED%95%B4/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%201.1.3.%20%EB%8B%A4%ED%95%AD%EC%8B%9D%EC%9D%98%20%EC%9D%B8%EC%88%98%EB%B6%84%ED%95%B4.pdf',
        pdfName: '다항식의 인수분해',
        videoId: '715d2be6-b623-41fd-b57c-712311ef865d',
      },
    ],
  },
  {
    label: '복소수와 이차방정식',
    range: '4~6강',
    lectures: [
      {
        num: 4, title: '복소수',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/04_%EB%B3%B5%EC%86%8C%EC%88%98/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.1.1.%20%EB%B3%B5%EC%86%8C%EC%88%98%EC%9D%98%20%EB%9C%BB%EA%B3%BC%20%EC%84%B1%EC%A7%88.pdf',
        pdfName: '복소수의 뜻과 성질',
        videoId: 'c108f45e-ada8-4b12-8690-8dcc3acced2e',
      },
      {
        num: 5, title: '이차방정식의 풀이',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/05_%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.1.2.%20%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D%EC%9D%98%20%ED%92%80%EC%9D%B4.pdf',
        pdfName: '이차방정식의 풀이 · 판별식',
        videoId: '39fdef7f-4e14-4bea-a357-2e1a3595040f',
      },
      {
        num: 6, title: '이차방정식의 근과 계수',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/05_%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.1.3.%20%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D%EC%9D%98%20%EA%B7%BC%EA%B3%BC%20%EA%B3%84%EC%88%98%EC%9D%98%20%EA%B4%80%EA%B3%84.pdf',
        pdfName: '근과 계수의 관계',
        videoId: '92d6e5f4-5084-49ec-879e-34bb72a1158d',
      },
    ],
  },
  {
    label: '이차함수',
    range: '7~9강',
    lectures: [
      {
        num: 7, title: '이차방정식과 이차함수의 관계',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/06_%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EA%B4%80%EA%B3%84/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.2.1.%20%EC%9D%B4%EC%B0%A8%EB%B0%A9%EC%A0%95%EC%8B%9D%EA%B3%BC%20%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EC%9D%98%20%EA%B4%80%EA%B3%84.pdf',
        pdfName: '이차방정식과 이차함수의 관계',
        videoId: '31a2bfa9-6d91-4f33-bddc-e89409e6b50d',
      },
      {
        num: 8, title: '이차함수 그래프와 직선의 위치관계',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/06_%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EA%B4%80%EA%B3%84/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.2.2.%20%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EC%9D%98%20%EA%B7%B8%EB%9E%98%ED%94%84%EC%99%80%20%EC%A7%81%EC%84%A0%EC%9D%98%20%EC%9C%84%EC%B9%98%20%EA%B4%80%EA%B3%84.pdf',
        pdfName: '그래프와 직선의 위치관계',
        videoId: '2bb74c4f-a1e4-49c7-9599-e13c701ce615',
      },
      {
        num: 9, title: '이차함수의 최대·최소',
        pdfUrl: 'https://mathgo-pdfs.b-cdn.net/concept/gs1/07_%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EC%B5%9C%EB%8C%80%EC%B5%9C%EC%86%8C/%EA%B3%B5%EC%88%981%20%EA%B0%9C%EB%85%90%202.2.3.%20%EC%9D%B4%EC%B0%A8%ED%95%A8%EC%88%98%EC%9D%98%20%EC%B5%9C%EB%8C%80-%EC%B5%9C%EC%86%8C.pdf',
        pdfName: '이차함수의 최대·최소',
        videoId: '956cbf02-6a1e-4dd3-a660-dab0db1f5704',
      },
    ],
  },
];

type PageProps = {
  readonly searchParams?: {
    readonly gate?: string | readonly string[];
  };
};

export default function Gs1ConceptPart1Page({ searchParams }: PageProps) {
  return (
    <ConceptAccessPage
      config={GATE_CONFIG}
      subjectLabel="공통수학1"
      heading="1~9강 · 전반부"
      gate={searchParams?.gate}
    >
      <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            공통수학1 · 개념강의
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            1~9강 · 전반부
          </h1>
          <p className="text-[13px] text-olive mt-2">
            개념노트 먼저 받고, 해당 강 노트 옆에 두고 영상 보세요.
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

              <div className="space-y-2">
                {sec.lectures.map((lec) => (
                  <div
                    key={lec.num}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream"
                  >
                    {/* 강 번호 뱃지 */}
                    <span className="inline-flex items-center justify-center min-w-[36px] h-6 px-2 rounded-md bg-terracotta/10 text-terracotta text-[11px] font-semibold shrink-0 tabular-nums">
                      {lec.num}강
                    </span>

                    {/* 제목 */}
                    <p className="flex-1 text-[13px] font-medium text-ink min-w-0 leading-snug">
                      {lec.title}
                    </p>

                    {/* 버튼 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={getPdfDownloadHref(lec.pdfUrl)}
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
    </ConceptAccessPage>
  );
}
