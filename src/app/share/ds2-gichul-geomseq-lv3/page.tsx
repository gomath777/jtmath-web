import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';

export const metadata = {
  title: '대수 · 등비수열 레벨3 보강',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const PDF_BASE = 'https://mathgo-pdfs.b-cdn.net/gichul/ds2';
const PDF_URL = `${PDF_BASE}/${encodeURIComponent('06_등비수열')}/${encodeURIComponent('기출_PDF')}/${encodeURIComponent('등비수열 레벨3.pdf')}`;

const VIDEOS: Array<{ id: string; label: string; num: number }> = [
  { num: 1,  id: 'ea066472-b133-4ebb-b7ad-e077b207e8ec', label: '25년 9월 고2 26번' },
  { num: 2,  id: '82894f47-5ba8-41bc-b4d2-70c2c75d5b73', label: '24년 9월 고2 10번' },
  { num: 3,  id: 'ec1b5f59-2061-4caa-8b4f-1518e365c096', label: '24년 9월 고2 13번' },
  { num: 4,  id: '7ec78c88-d42a-4b36-8f04-92461e11bcc8', label: '23년 9월 고2 11번' },
  { num: 5,  id: 'fefb4660-cdc5-4deb-9f9b-2106084d8085', label: '22년 9월 고2 12번' },
  { num: 6,  id: '603a341f-2b04-4899-b818-23522a23ce0c', label: '21년 11월 고2 14번' },
  { num: 7,  id: 'bd108dcc-ac91-49c9-b6ca-3d3034927922', label: '19년 11월 고2 17번' },
  { num: 9,  id: 'd0aa501f-f10d-4767-94d5-097e4829f379', label: '17년 11월 고2 18번' },
  { num: 12, id: 'b4ee964a-5f8a-4ec6-a443-f94b147f423a', label: '17년 3월 고2 15번' },
  { num: 14, id: '8518c75d-2b24-450b-aaa8-a4d67992d00f', label: '15년 9월 고2 27번' },
];

export default function Ds2GeomSeqLv3Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            대수 · 기출 레벨3 보강
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            등비수열
          </h1>
          <p className="text-[13px] text-olive mt-2">
            학습지 먼저 받고, 막힌 번호 해설강의 확인하세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* 학습지 */}
          <div>
            <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-3">
              학습지
            </p>
            <a
              href={PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-terracotta" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13px] truncate">등비수열 레벨3</p>
                <p className="text-[11px] text-stone mt-0.5">2.5 MB</p>
              </div>
              <Download className="w-4 h-4 text-stone shrink-0" />
            </a>
          </div>

          {/* 해설강의 */}
          <div>
            <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-3">
              해설강의
            </p>
            <div className="space-y-2">
              {VIDEOS.map((v) => (
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
          </div>

        </div>
      </main>
    </div>
  );
}
