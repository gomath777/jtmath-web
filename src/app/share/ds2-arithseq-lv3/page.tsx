import { Download, FileText, Play } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import { getPdfDownloadHref } from '@/lib/pdf-download';

export const metadata = {
  title: '대수 · 등차수열 레벨3 보강',
  robots: { index: false, follow: false },
};

const EMBED = (id: string) =>
  `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${id}?autoplay=true&preload=true&responsive=true`;

const PDF_BASE = 'https://mathgo-pdfs.b-cdn.net/gichul/ds2';
const PDF_URL = `${PDF_BASE}/${encodeURIComponent('05_등차수열')}/${encodeURIComponent('기출_PDF')}/${encodeURIComponent('등차수열 레벨3.pdf')}`;

const VIDEOS: Array<{ id: string; label: string; num: number }> = [
  { num: 1,  id: 'f7630c8f-fd04-4704-9610-ec708011addd', label: '25년 9월 고2 12번' },
  { num: 3,  id: '8031610f-cef6-49dc-9c5b-a1088634bbfc', label: '23년 11월 고2 27번' },
  { num: 4,  id: '8f771db5-13cc-4850-b264-4def3ce038ef', label: '22년 9월 고2 15번' },
  { num: 5,  id: 'b3be1eff-a55a-4da6-860f-107101fc3cd9', label: '20년 11월 고2 25번' },
  { num: 7,  id: 'a9949705-3d14-45d4-a6b1-c8472c54e059', label: '19년 9월 고2 이과 20번' },
  { num: 9,  id: '706bfec8-7772-403c-92e4-235193fe61d5', label: '17년 3월 고2 문과 10번' },
  { num: 10, id: '855d27bf-4f4e-44a0-969b-45a1ceac5500', label: '17년 3월 고2 이과 24번' },
];

export default function Ds2ArithSeqLv3Page() {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">

        {/* 타이틀 */}
        <div className="mb-10 pb-8 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            대수 · 기출 레벨3 보강
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            등차수열
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
              href={getPdfDownloadHref(PDF_URL)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-ivory border border-border-cream hover:border-terracotta/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-terracotta" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13px] truncate">등차수열 레벨3</p>
                <p className="text-[11px] text-stone mt-0.5">2.2 MB</p>
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
