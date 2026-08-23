import Link from 'next/link';
import { Download, PlayCircle, MessageCircle, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import BunnyVideoPlayer from '@/components/BunnyVideoPlayer';
import { CONCEPT_LIBRARY_ID } from '@/lib/bunny-libraries';

export default async function CourseViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2. Course info
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();

  const courseTitle = course?.title || '대수 Δ0 실전 개념 완성';

  // 3. Lessons ordered by week → lesson
  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', id)
    .order('week_number', { ascending: true })
    .order('lesson_number', { ascending: true });

  type LessonType = {
    id: string;
    title: string;
    lesson_number: number;
    week_number: number;
    bunny_video_id: string | null;
    pdf_level_1_url: string | null;
    pdf_level_2_url: string | null;
    description: string | null;
  };

  const lessons = (lessonsData || []) as LessonType[];

  // Group by week
  const weeksMap = new Map<number, LessonType[]>();
  lessons.forEach(l => {
    if (!weeksMap.has(l.week_number)) weeksMap.set(l.week_number, []);
    weeksMap.get(l.week_number)!.push(l);
  });
  const weeks = Array.from(weeksMap.entries()).sort((a, b) => a[0] - b[0]);

  const currentLessonId = resolvedSearchParams.lesson || (lessons.length > 0 ? lessons[0].id : null);
  const currentLesson = lessons.find(l => l.id === currentLessonId) || (lessons.length > 0 ? lessons[0] : null);

  // Hardcoded textbook pages mapping for the Delta 0 courses based on user's curriculum
  const PAGE_MAPPINGS: Record<string, string> = {
    // === 대수 (Algebra) ===
    "9f992a9f-9039-470f-9421-4e184aacd824": "8-11",
    "291763f5-fa78-4ad2-af99-1a5b14f21ee2": "12-23",
    "cee50105-17b6-43a3-becc-aecf430d6af2": "13-24",
    "40346018-fe99-4d42-9df4-b3af48b63075": "25-38",
    "f0a83a9e-e936-4d4e-9d53-5d10c2a11919": "44-51",
    "82c014ec-f8c2-4fff-89be-05c739da1732": "52-59",
    "e0cbc2be-6d40-4493-bd08-4683fdd685e6": "60-67",
    "62277f30-8a09-4a1c-b28c-06e51a36fd9d": "68-중단원 전체",
    "e25ad200-53c8-47c5-aff3-a57026ff2167": "80-89",
    "5c9fbba0-0065-4598-949b-e5bd7ed5d50b": "90-97",
    "1213fcb7-7735-42c2-b180-2dfb9dedfecf": "99-100",
    "cc26b95f-8f87-4370-8ccd-56147a134331": "101-106",
    "e6b9c79d-437f-420b-83b1-62b48cd08f92": "107-중단원 전체",
    "8b56ee09-db02-4109-8423-11164e775f22": "128-중단원 전체",
    "6ee50d82-428d-43a0-a31f-07c2bfce7eb7": "144-147",
    "6cc42476-c562-41f7-a544-f643c8f05932": "148-151",
    "718686ab-167c-4c46-a7a5-2b6e377eb1f8": "151-157",
    "d1b462b8-15f1-419f-8d94-3b893db4faa8": "158-160",
    "cd6ea0f8-04ef-4fbd-8d9a-eab076662cd3": "161-중단원 전체",
    "090bb837-8e76-4615-9a46-5d23c04cd183": "170-173",
    "ada5d7c5-f811-4834-a0a1-466c743f4a54": "174-중단원 전체",
    "ab043c7a-770f-4eec-a2e4-97f9dd659543": "186-191",
    "f0a95150-f037-41be-b3fd-7bb65892604c": "192-중단원 전체",
    // === 미적분1 (Calculus 1) ===
    "fa776abf-5101-49ed-8f83-b161348a7c15": "8-13",
    "0695477c-7381-4961-8065-cdc0595aa542": "14-23",
    "f2590d4b-5b91-4e1a-9b33-f524855826c5": "24-30",
    "abd77ca4-9c13-4091-b5ef-00d06cf1b901": "31-41",
    "b1f6681b-181a-4853-9853-79356941c48c": "44-52",
    "d0769db6-5d95-4221-969f-37ec2f3187ac": "53-63",
    "d254ffd6-c710-4000-8764-15f9c6880085": "64-69",
    "c01cd53e-f722-4cf9-b6d0-998009ffd954": "70-75",
    "82098e68-e684-47df-b1cf-e76066ce6ddb": "76-85",
    "39f05b66-fc13-466a-833a-162aa170e7b6": "86-93",
    "7f8c8488-2c5c-4fe9-b1ff-07994176c2bf": "94-100",
    "a4c56eec-e388-4ab1-8d22-2a432859f2e6": "101-111",
    "a5560598-993c-4d22-901d-8b76cf0d0e9d": "114-121",
    "bfa46276-19f7-45d6-9263-86914a3e693b": "122-127",
    "a05d132b-8a17-4794-a46f-eee5042c4ac8": "128-135",
    "566e7935-0208-4fdd-8684-045789732be6": "136-149",
    "db889ee5-4753-48a6-8f2f-ef04b12f665f": "150-159",
  };
  const currentPageRange = currentLessonId ? (PAGE_MAPPINGS[currentLessonId] || "") : "";

  // 4. Fetch saved progress for current lesson (for resume)
  let savedPositionSecs = 0;
  if (currentLesson) {
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('position_secs, completed')
      .eq('user_id', user.id)
      .eq('lesson_id', currentLesson.id)
      .single();
    if (progress && !progress.completed) {
      savedPositionSecs = progress.position_secs ?? 0;
    }
  }

  // 5. Fetch completed lesson IDs for progress bar
  const { data: completedData } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .eq('completed', true);

  const completedLessonIds = new Set((completedData || []).map((r: { lesson_id: string }) => r.lesson_id));
  const totalLessons = lessons.length;
  const completedCount = completedLessonIds.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-5rem)]">

      {/* ── Sidebar ── */}
      <div className="w-full lg:w-72 xl:w-80 bg-brand-surface border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col shrink-0">
        <div className="p-5 border-b border-white/[0.06]">
          <Link href="/dashboard" className="inline-flex items-center text-xs font-mono text-white/30 hover:text-brand-blue mb-4 transition-colors gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            내 강의실
          </Link>
          <h2 className="font-bold text-base text-white leading-snug">{courseTitle}</h2>
          <div className="mt-4">
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-white/30">진도율</span>
              <span className="text-brand-mint">{progressPct}%</span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-1">
              <div
                className="bg-gradient-to-r from-brand-blue to-brand-mint h-1 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-white/20 mt-1.5">{completedCount}/{totalLessons}강 완료</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-3">
          {weeks.map(([weekNum, weekLessons]) => (
            <div key={`week-${weekNum}`} className="mb-4">
              <p className="px-3 py-1.5 text-[10px] font-mono font-bold text-white/25 uppercase tracking-widest">
                {weekNum}주차
              </p>
              <div className="space-y-0.5">
                {weekLessons.map(lesson => {
                  const isActive = currentLessonId === lesson.id;
                  const isDone = completedLessonIds.has(lesson.id);
                  return (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/courses/${id}?lesson=${lesson.id}`}
                      className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 text-xs rounded-lg transition-all ${
                        isActive
                          ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                          : isDone
                          ? 'text-white/30 hover:bg-white/[0.04] hover:text-white/50'
                          : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                      }`}
                    >
                      {isActive ? (
                        <PlayCircle className="w-4 h-4 shrink-0 mt-0.5 text-brand-blue" />
                      ) : isDone ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-brand-mint/50" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-white/15" />
                      )}
                      <span className={`leading-snug font-medium ${isDone ? 'line-through decoration-white/20' : ''}`}>
                        {lesson.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content (Notion-style Flow) ── */}
      <div className="flex-1 flex flex-col gap-8 overflow-y-auto pb-20 lg:pb-12 min-w-0 pr-2 lg:pr-4 custom-scrollbar">

        {/* Title Card */}
        {currentLesson && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-brand-blue bg-brand-blue/10 px-2.5 py-1.5 rounded border border-brand-blue/20 mb-4 font-bold tracking-wider">
              <PlayCircle className="w-3 h-3" />
              CURRENT SESSION
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{currentLesson.title}</h1>
            {currentLesson.description && (
              <p className="text-white/50 text-sm md:text-base mt-2.5 leading-relaxed">{currentLesson.description}</p>
            )}
          </div>
        )}

        <div className="space-y-6">
          
          {/* STEP 1: 개념 노트 (PDF) */}
          {currentLesson?.pdf_level_1_url && (
            <div className="brand-card p-0 overflow-hidden border-white/[0.08] hover:border-brand-blue/30 transition-colors shadow-lg shadow-black/20">
              <div className="bg-brand-blue/10 px-5 py-3.5 border-b border-brand-blue/20 flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-brand-blue text-white font-bold text-xs shadow-sm">1</div>
                <h3 className="text-brand-blue font-bold text-sm tracking-wide">개념 강의 준비자료</h3>
              </div>
              <div className="p-5 md:p-6 bg-brand-surface/40">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href={currentLesson.pdf_level_1_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl bg-brand-elevated border border-white/[0.05] hover:border-brand-blue/40 hover:bg-brand-blue/5 transition-all group shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-white/90 font-bold text-sm truncate pr-2" title={`${currentLesson.title} 필기노트`}>
                        {currentLesson.title.split('.').pop()?.trim()} 필기노트.pdf
                      </span>
                      <span className="text-[11px] text-white/40 mt-1">클릭하여 다운로드</span>
                    </div>
                  </a>

                  {currentLesson?.pdf_level_2_url && (
                    <a
                      href={currentLesson.pdf_level_2_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 rounded-xl bg-brand-elevated border border-white/[0.05] hover:border-brand-mint/40 hover:bg-brand-mint/5 transition-all group shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-lg bg-brand-mint/10 flex items-center justify-center text-brand-mint group-hover:scale-110 transition-transform shrink-0">
                        <Download className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-white/90 font-bold text-sm truncate pr-2">심화 보충 자료.pdf</span>
                        <span className="text-[11px] text-white/40 mt-1">클릭하여 다운로드</span>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: 영상 학습 */}
          <div className="brand-card p-0 overflow-hidden border-white/[0.08] hover:border-brand-orange/30 transition-colors shadow-lg shadow-black/20">
            <div className="bg-brand-orange/10 px-5 py-3.5 border-b border-brand-orange/20 flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-brand-orange text-white font-bold text-xs shadow-sm">2</div>
              <h3 className="text-brand-orange font-bold text-sm tracking-wide">핵심 개념 영상 학습</h3>
            </div>
            <div className="p-5 md:p-6 bg-brand-surface/40">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                <p className="text-sm font-medium text-white/60">문제 해설 시 본인 풀이와 비교하며 시청하세요.</p>
              </div>
              <div className="rounded-xl overflow-hidden border border-white/[0.1] shadow-2xl bg-black aspect-video bg-opacity-50">
                <BunnyVideoPlayer
                  libraryId={CONCEPT_LIBRARY_ID}
                  videoId={currentLesson?.bunny_video_id ?? ''}
                  lessonId={currentLesson?.id ?? ''}
                  startPositionSecs={savedPositionSecs}
                />
              </div>
            </div>
          </div>

          {/* STEP 3: 오답 관리 가이드 */}
          <div className="brand-card p-0 overflow-hidden border-white/[0.08] hover:border-brand-mint/30 transition-colors shadow-lg shadow-black/20">
            <div className="bg-brand-mint/10 px-5 py-3.5 border-b border-brand-mint/20 flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-brand-mint text-white font-bold text-xs shadow-sm">3</div>
              <h3 className="text-brand-mint font-bold text-sm tracking-wide">교재 문제 풀이 및 오답반복</h3>
            </div>
            <div className="p-5 md:p-6 bg-brand-surface/40 flex flex-col sm:flex-row gap-6 items-start">
              
              <div className="flex-1 space-y-4">
                <div className="flex gap-4 items-start bg-brand-elevated/50 p-4 rounded-xl border border-white/[0.04]">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-mint/20 flex items-center justify-center text-brand-mint shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm mb-1.5">개념서 {currentPageRange}쪽 풀이하기!!</h4>
                    <p className="text-xs text-white/50 leading-relaxed font-medium">
                      앱에 답안 제출 후 '제출완료' 카톡하기! 오답관리 후 다음으로 넘어갑니다<br/>
                      모르는 문제는 앱내 해설강의를 참고하거나 카톡으로 캡쳐해서 질문하세요!
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
