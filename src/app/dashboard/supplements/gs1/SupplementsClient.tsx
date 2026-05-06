'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, PlayCircle, FileText } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';

interface Video {
  title: string;
  bunnyId: string;
}

interface Chapter {
  title: string;
  pdfUrl: string | null;
  pdfLabel: string;
  summaryVideoId: string | null;
  videos: Video[];
}

interface LevelData {
  label: string;
  color: string;
  chapters: Chapter[];
}

const SUPPLEMENTS: Record<string, LevelData> = {
  level3: {
    label: '레벨 3',
    color: 'text-emerald-400',
    chapters: [
      {
        title: '1단원. 다항식과 나머지정리',
        pdfUrl: null, // PDF 업로드 후 URL 입력
        pdfLabel: '다항식 나머지정리 레벨#3',
        summaryVideoId: null,
        videos: [
          { title: '25년 9월 고1 15번 해설강의', bunnyId: 'a4802ef0-3146-4d1b-a594-da572a87cae9' },
          { title: '25년 6월 고1 17번 해설강의', bunnyId: 'd0633461-79c5-45f2-b3bd-fdf9a1b9ec8d' },
          { title: '23년 11월 고1 18번 해설강의', bunnyId: '7fc0a523-4a1e-4841-8ee2-1e07578ac3a4' },
          { title: '22년 11월 고1 18번 해설강의', bunnyId: 'a898c391-19fe-4a59-b6af-e442730b0bc8' },
        ],
      },
      {
        title: '2단원. 복소수와 이차방정식',
        pdfUrl: null,
        pdfLabel: '복소수와 이차방정식 레벨#3',
        summaryVideoId: '38241d2f-e1b0-4e29-bdce-da0f76fa755e',
        videos: [
          { title: '25년 6월 고1 15번 해설강의', bunnyId: '703af39a-5ebc-44c4-97bb-0e88a7368ae5' },
          { title: '24년 6월 고1 26번 해설강의', bunnyId: '485b1988-fffd-40a0-bb55-adbabec46ea4' },
          { title: '22년 11월 고1 14번 해설강의', bunnyId: '2aa782e4-8eb8-4eb3-ace3-cbb07d94a4c1' },
          { title: '22년 6월 고1 27번 해설강의', bunnyId: '1416a49b-57c1-4e04-bb7c-9eed22fb39bd' },
          { title: '21년 9월 고1 14번 해설강의', bunnyId: 'f4e43642-70ba-4874-8d75-5e5fca6dbe73' },
          { title: '24년 3월 고2 15번 해설강의', bunnyId: 'ec117842-48b8-4780-acf0-bd7b6f2b2999' },
          { title: '20년 6월 고1 26번 해설강의', bunnyId: '8eef6592-4675-4486-9076-6ba2d28f74c2' },
          { title: '19년 11월 고1 18번 해설강의', bunnyId: 'a01397c7-3409-4481-8c64-a7bb415a8642' },
        ],
      },
      {
        title: '3단원. 이차방정식과 이차함수',
        pdfUrl: null,
        pdfLabel: '이차방정식과 이차함수 레벨#3',
        summaryVideoId: 'cb1bd65c-7774-45cd-b61a-515cecd1d408',
        videos: [
          { title: '24년 9월 고1 17번 해설강의', bunnyId: '63a443b5-55f8-4c11-81b7-419874026025' },
          { title: '24년 6월 고1 14번 해설강의', bunnyId: '17335197-6036-4a6f-9220-7bb8b335734c' },
          { title: '22년 11월 고1 17번 해설강의', bunnyId: 'f3256f16-cfbc-4b2a-bef1-31b06e5b0fcc' },
          { title: '22년 9월 고1 16번 해설강의', bunnyId: 'eed2ae15-56d4-4c8a-9173-c8c86d6750f9' },
          { title: '21년 9월 고1 16번 해설강의', bunnyId: 'efb1f64a-0e8e-4d27-bd28-7402cc576549' },
          { title: '20년 6월 고1 27번 해설강의', bunnyId: 'fdeb07a6-1a7c-4e47-bee3-7f8d146a22b3' },
          { title: '20년 6월 고1 14번 해설강의', bunnyId: '00b6e8e0-0135-4bc7-beb5-43bb4d4b3e15' },
        ],
      },
    ],
  },
  level4: {
    label: '레벨 4',
    color: 'text-amber-400',
    chapters: [
      {
        title: '1단원. 다항식과 나머지정리',
        pdfUrl: null,
        pdfLabel: '다항식 나머지정리 레벨#4-1',
        summaryVideoId: 'a60c14ec-3409-44ad-8dee-613a29b14684',
        videos: [
          { title: '25년 10월 고1 18번 해설강의', bunnyId: '4b8fb902-76aa-4f0c-8e60-f01fcc8b93ad' },
          { title: '25년 10월 고1 19번 해설강의', bunnyId: 'd666c01f-982f-4822-a254-d2d544da89ae' },
          { title: '25년 9월 고1 27번 해설강의', bunnyId: '4e278e26-e39a-44ac-b94a-04f9c50c9958' },
          { title: '25년 6월 고1 14번 해설강의', bunnyId: '904b85bf-e4a7-4610-bf04-b4962ac53fb5' },
          { title: '24년 10월 고1 28번 해설강의', bunnyId: 'ef926e0c-8859-4166-b9f5-fcc5679d5ae2' },
          { title: '24년 9월 고1 18번 해설강의', bunnyId: 'bd5793b0-d3a8-4cb2-b67d-50953a573d15' },
          { title: '24년 6월 고1 8번 해설강의', bunnyId: '68c57f5d-3767-4ea4-a4cc-eeb839bd4a9e' },
          { title: '24년 6월 고1 15번 해설강의', bunnyId: '39880a37-c90d-49ea-9c59-8bc5f184512e' },
          { title: '24년 6월 고1 28번 해설강의', bunnyId: '47cdda14-0aeb-44ee-8cd7-36f40aca5400' },
        ],
      },
      {
        title: '2단원. 복소수와 이차방정식',
        pdfUrl: null,
        pdfLabel: '복소수와 이차방정식 레벨#4-1',
        summaryVideoId: null,
        videos: [
          { title: '21년 6월 고1 19번 해설강의', bunnyId: 'b1210d45-596e-448d-9de2-1eea80ea47a3' },
          { title: '21년 6월 고1 27번 해설강의', bunnyId: '2c6f876e-48a8-44f7-a6c3-19dcf91e0d9a' },
          { title: '21년 6월 고1 28번 해설강의', bunnyId: '3b6073e7-e730-475d-84ce-0c6726987314' },
          { title: '21년 11월 고1 18번 해설강의', bunnyId: '50fddd66-a341-4b2a-afdb-e412e9f8cde9' },
          { title: '24년 6월 고1 17번 해설강의', bunnyId: 'ed575ed0-8b24-4aca-8b76-d70ab95bbc68' },
          { title: '25년 6월 고1 19번 해설강의', bunnyId: '597e48e9-b7f5-49df-8cb8-4e180cea08d5' },
          { title: '25년 10월 고1 27번 해설강의', bunnyId: '3b67e8ee-50e9-4c84-b894-cd959f6cd78c' },
        ],
      },
      {
        title: '3단원. 이차방정식과 이차함수',
        pdfUrl: null,
        pdfLabel: '이차방정식과 이차함수 레벨#4-1',
        summaryVideoId: null,
        videos: [
          { title: '25년 10월 고1 17번 해설강의', bunnyId: 'f46ed727-2db9-451a-bdae-0266ad6756dc' },
          { title: '25년 9월 고1 16번 해설강의', bunnyId: '749b4668-51a6-40f1-953f-17d1b230a223' },
          { title: '25년 9월 고1 17번 해설강의', bunnyId: '45e80fb9-787c-47e5-a76c-6313f76d64f9' },
          { title: '25년 9월 고1 28번 해설강의', bunnyId: '6774d963-9159-4a57-98d6-657a404773a1' },
          { title: '25년 6월 고1 27번 해설강의', bunnyId: '4bb705cb-1107-43e3-9725-5aec19ff6595' },
          { title: '25년 6월 고1 28번 해설강의', bunnyId: 'aac24eba-940c-4df3-8cc7-17f9e045f507' },
          { title: '24년 10월 고1 17번 해설강의', bunnyId: '2cf464fb-6827-4e40-a841-34438e55c3de' },
          { title: '24년 10월 고1 19번 해설강의', bunnyId: 'b4c8786a-2d0a-4504-b2f2-8cc5c0472880' },
          { title: '24년 9월 고1 19번 해설강의', bunnyId: 'df6068c6-bd0a-45d6-82df-ab0a866e5448' },
          { title: '24년 6월 고1 18번 해설강의', bunnyId: '8c1c2fde-955d-4d95-a49b-eda79d4a65fc' },
          { title: '23년 6월 고1 20번 해설강의', bunnyId: '35aa74c2-79a4-48db-b6af-62e71c631821' },
          { title: '23년 11월 고1 17번 해설강의', bunnyId: '4e1c6929-6efb-4bed-ac65-c971361b4b42' },
          { title: '23년 6월 고1 15번 해설강의', bunnyId: '9443489f-625e-4f37-9011-e79f97bc895b' },
        ],
      },
    ],
  },
};

function VideoItem({ video, libraryId }: { video: Video; libraryId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <PlayCircle className="w-4 h-4 text-white/40 shrink-0" />
          <span className="text-sm text-white/80 font-medium">{video.title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-white/30 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
        )}
      </button>
      {open && (
        <div className="aspect-video bg-black">
          <iframe
            src={`https://iframe.mediadelivery.net/embed/${libraryId}/${video.bunnyId}?autoplay=false&preload=true`}
            className="w-full h-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

function ChapterSection({ chapter, libraryId }: { chapter: Chapter; libraryId: string }) {
  return (
    <div className="space-y-3">
      {/* Chapter Header + PDF */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white/90">{chapter.title}</h3>
        {chapter.pdfUrl ? (
          <a
            href={chapter.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-blue/15 hover:bg-brand-blue/25 border border-brand-blue/30 text-brand-blue text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            학습지 다운로드
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30 text-xs font-medium">
            <FileText className="w-3.5 h-3.5" />
            학습지 준비 중
          </span>
        )}
      </div>

      {/* Summary Video (if exists) */}
      {chapter.summaryVideoId && (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06]">
            <span className="text-xs font-mono text-brand-blue/80 uppercase tracking-widest">단원 요약 강의</span>
          </div>
          <div className="aspect-video bg-black">
            <iframe
              src={`https://iframe.mediadelivery.net/embed/${libraryId}/${chapter.summaryVideoId}?autoplay=false&preload=true`}
              className="w-full h-full border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Individual Videos */}
      <div className="space-y-2">
        {chapter.videos.map((video) => (
          <VideoItem key={video.bunnyId} video={video} libraryId={libraryId} />
        ))}
      </div>
    </div>
  );
}

export default function SupplementsClient({ userName }: { userName: string }) {
  const [activeLevel, setActiveLevel] = useState<'level3' | 'level4'>('level3');
  const levelData = SUPPLEMENTS[activeLevel];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-mono text-white/50 mb-4">
          공통수학 1 · 보충자료
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          기출 보충자료
        </h1>
        <p className="text-white/40 mt-1 text-sm">
          {userName} 학생 — 학습지를 먼저 다운받아 문제를 풀고, 해설강의를 시청하세요.
        </p>
      </div>

      {/* Level Tabs */}
      <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
        {(['level3', 'level4'] as const).map((level) => {
          const d = SUPPLEMENTS[level];
          const isActive = activeLevel === level;
          return (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                isActive
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Chapter Sections */}
      <div className="space-y-10">
        {levelData.chapters.map((chapter, idx) => (
          <div key={idx} className="border border-white/[0.06] rounded-2xl bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <span className={`text-[10px] font-mono uppercase tracking-widest ${levelData.color} block mb-1`}>
                {levelData.label}
              </span>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">{chapter.title}</h3>
                {chapter.pdfUrl ? (
                  <a
                    href={chapter.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-blue/15 hover:bg-brand-blue/25 border border-brand-blue/30 text-brand-blue text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    학습지 다운로드
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/25 text-xs">
                    <FileText className="w-3.5 h-3.5" />
                    학습지 준비 중
                  </span>
                )}
              </div>
            </div>
            <div className="p-5 space-y-3">
              {/* Summary Video */}
              {chapter.summaryVideoId && (
                <div className="border border-white/[0.08] rounded-xl overflow-hidden mb-4">
                  <div className="px-4 py-2 bg-white/[0.04] border-b border-white/[0.06]">
                    <span className="text-xs font-mono text-brand-blue/70 uppercase tracking-widest">★ 단원 요약 강의</span>
                  </div>
                  <div className="aspect-video bg-black">
                    <iframe
                      src={`https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}/${chapter.summaryVideoId}?autoplay=false&preload=true`}
                      className="w-full h-full border-0"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
              {/* Individual Videos */}
              {chapter.videos.map((video) => (
                <VideoItem key={video.bunnyId} video={video} libraryId={EXAM_LIBRARY_ID} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
