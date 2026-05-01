'use client';

import { useState, useEffect } from 'react';
import { Loader2, BookOpen, ChevronRight, FolderOpen, FileText, Download, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConceptLecturesSection from './ConceptLecturesSection';
import SeasonPlan from './SeasonPlan';
import type { TodayTask } from './variants/types';
import VariantB from './variants/VariantB';
import { getVariantForSlug } from '@/lib/dashboardVariants';
import MasterCalendarView from './MasterCalendarView';

/** 이벤트 트래킹 — fire-and-forget. 실패해도 UX 방해 X. */
function trackEvent(event_type: string, metadata?: Record<string, unknown>) {
  fetch('/api/public/student/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type, metadata }),
  }).catch(() => {
    /* silent */
  });
}

interface SessionItem {
  id: string;
  week_number: number;
  session_number: number;
  label: string;
  publishDate?: string | null;
}

interface CurriculumData {
  id: string;
  title: string;
  subject_slug: string;
  sessions: SessionItem[];
}

interface MasterSessionEntry {
  id: string;
  subject_slug: string;
  subject_label: string;
  week_number: number;
  session_number: number;
  label: string | null;
  publishDate: string | null;
  is_released: boolean;
}

interface MasterConceptItem {
  id: string;
  title: string;
  subject_slug: string;
  subject_label: string;
  publishDate: string | null;
}

interface DashboardData {
  profile: {
    name: string;
    school: string;
    exam_date_midterm?: string | null;
    exam_date_final?: string | null;
  };
  curricula: CurriculumData[];
  odapjiCount: number;
  todayTasks: TodayTask[];
  nextReleaseAt?: string;
  isMaster?: boolean;
  masterSessions?: MasterSessionEntry[];
  masterConceptItems?: MasterConceptItem[];
}

interface ExamCountdown {
  label: string;              // "중간고사" | "기말고사"
  date: string;               // ISO date
  daysLeft: number;           // days until exam (negative if past)
  displayDate: string;        // "4월 22일 (화)"
}

function buildCountdowns(profile: DashboardData['profile']): ExamCountdown[] {
  const entries: { label: string; raw: string | null | undefined }[] = [
    { label: '중간고사', raw: profile.exam_date_midterm },
    { label: '기말고사', raw: profile.exam_date_final },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return entries
    .filter((e): e is { label: string; raw: string } => !!e.raw)
    .map(e => {
      const d = new Date(e.raw);
      d.setHours(0, 0, 0, 0);
      const diffMs = d.getTime() - today.getTime();
      const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const displayDate = d.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
      return { label: e.label, date: e.raw, daysLeft, displayDate };
    })
    // Only show countdowns that are today or in the future
    .filter(c => c.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

function formatDday(daysLeft: number): { text: string; tone: 'urgent' | 'near' | 'normal' | 'past' } {
  if (daysLeft < 0) return { text: `D+${Math.abs(daysLeft)}`, tone: 'past' };
  if (daysLeft === 0) return { text: 'D-DAY', tone: 'urgent' };
  if (daysLeft <= 7) return { text: `D-${daysLeft}`, tone: 'urgent' };
  if (daysLeft <= 30) return { text: `D-${daysLeft}`, tone: 'near' };
  return { text: `D-${daysLeft}`, tone: 'normal' };
}

interface SharedMaterial {
  id: string;
  title: string;
  description: string | null;
  original_filename: string;
  cdn_url: string;
  file_size_bytes: number | null;
  audience: 'all' | 'student' | 'curriculum';
  uploaded_at: string;
}

type TabKey = 'learning' | 'concept' | 'materials';

const AUDIENCE_LABEL: Record<string, string> = {
  all: '전체 공개',
  student: '개별 자료',
  curriculum: '수강 자료',
};

export default function StudentDashboardClient({
  slug,
  basePath = '/s',
}: {
  slug: string;
  /** URL prefix: '/s' (online portal) or '/c' (offline classroom). 세션 링크 조립에 사용. */
  basePath?: string;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [birthPin, setBirthPin] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('learning');
  const [showAll, setShowAll] = useState(false);
  const [conceptInitialSubject, setConceptInitialSubject] = useState<string | null>(null);
  const router = useRouter();
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string | null>(null);
  const [masterViewMode, setMasterViewMode] = useState<'calendar' | 'student'>('calendar');

  const [materials, setMaterials] = useState<SharedMaterial[]>([]);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [pageViewTracked, setPageViewTracked] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`/api/public/student/dashboard?slug=${slug}`);
      if (res.status === 401) {
        setNeedsVerify(true);
        setLoading(false);
        return;
      }
      const d = await res.json();
      if (d.error) {
        setNeedsVerify(true);
      } else {
        setData(d);
        setNeedsVerify(false);
      }
    } catch {
      setNeedsVerify(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    if (materialsLoaded) return;
    setMaterialsLoading(true);
    try {
      const res = await fetch('/api/public/student/materials');
      const d = await res.json();
      setMaterials(d.materials || []);
      setMaterialsLoaded(true);
    } catch {
      /* ignore */
    } finally {
      setMaterialsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'materials') fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 최초 로드 시 page_view 1회 트래킹 (variant 비교 지표)
  useEffect(() => {
    if (!data || pageViewTracked) return;
    trackEvent('page_view', {
      variant: getVariantForSlug(slug),
      tasks_count: data.todayTasks?.length ?? 0,
    });
    setPageViewTracked(true);
  }, [data, pageViewTracked, slug]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await fetch('/api/public/verify-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, birth_pin: birthPin }),
      });
      const d = await res.json();
      if (d.success) {
        setNeedsVerify(false);
        setLoading(true);
        await fetchDashboard();
      } else {
        setVerifyError(d.error || '인증에 실패했습니다');
      }
    } catch {
      setVerifyError('네트워크 오류가 발생했습니다');
    } finally {
      setVerifying(false);
    }
  };

  // ─── Verify form ────────────────────────────────
  if (needsVerify) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="bg-ivory border border-border-cream rounded-2xl px-8 py-10 w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="font-serif font-medium text-[22px] text-ink tracking-tight">
              본인 확인
            </h1>
            <p className="text-[13px] text-olive mt-2">
              생년월일 6자리를 입력하세요
            </p>
          </div>
          <form onSubmit={handleVerify}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="YYMMDD (예: 080315)"
              value={birthPin}
              onChange={e =>
                setBirthPin(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              className="w-full px-4 py-3 bg-parchment border border-border-warm rounded-xl text-ink text-center text-lg tracking-[0.3em] font-mono placeholder:text-stone placeholder:tracking-normal placeholder:text-sm"
              autoFocus
            />
            {verifyError && (
              <p className="text-crimson text-[12px] text-center mt-2">
                {verifyError}
              </p>
            )}
            <button
              type="submit"
              disabled={birthPin.length !== 6 || verifying}
              className="w-full mt-4 py-3 bg-terracotta text-ivory text-[14px] font-medium rounded-xl shadow-ring-terracotta disabled:opacity-30 disabled:cursor-not-allowed hover:bg-terracotta-light transition-colors"
            >
              {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                '확인'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Loading ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-stone" />
      </div>
    );
  }

  if (!data) return null;

  const isMaster = data.isMaster ?? false;
  const countdowns = buildCountdowns(data.profile);

  // ─── 관리자 배지 + 뷰 토글 ───────────────────────────────────────────────
  const masterBanner = isMaster ? (
    <div className="mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
      <span className="text-[13px]">🔧</span>
      <span className="text-[13px] text-amber-800 flex-1">
        관리자 미리보기 —{' '}
        <strong>{data.profile.name}</strong>
        {data.profile.school && (
          <span className="opacity-70"> ({data.profile.school})</span>
        )}
      </span>
      <div className="flex bg-amber-100 rounded-lg p-0.5 gap-0.5">
        <button
          onClick={() => setMasterViewMode('calendar')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
            masterViewMode === 'calendar'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-amber-700 hover:bg-amber-200'
          }`}
        >
          관리자 달력
        </button>
        <button
          onClick={() => setMasterViewMode('student')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
            masterViewMode === 'student'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-amber-700 hover:bg-amber-200'
          }`}
        >
          학생 뷰
        </button>
      </div>
    </div>
  ) : null;

  // ─── 마스터 달력 뷰 ──────────────────────────────────────────────────────
  if (isMaster && masterViewMode === 'calendar') {
    return (
      <div>
        {masterBanner}
        <MasterCalendarView
          masterSessions={data.masterSessions || []}
          masterConceptItems={data.masterConceptItems}
          slug={slug}
          basePath={basePath}
        />
      </div>
    );
  }

  return (
    <div>
      {masterBanner}

      {/* ─── Welcome hero ─── */}
      <div className="mb-10">
        <h1 className="font-serif font-medium text-[36px] text-ink tracking-tightest leading-[1.05]">
          {data.profile.name}
          <span className="text-olive font-normal text-[22px] ml-1.5">
            학생
          </span>
        </h1>
        {data.profile.school && (
          <p className="text-[13px] text-stone mt-2">{data.profile.school}</p>
        )}

        {countdowns.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {countdowns.map(c => {
              const { text, tone } = formatDday(c.daysLeft);
              const toneClasses = {
                urgent: 'bg-terracotta text-ivory shadow-ring-terracotta',
                near: 'bg-ivory text-terracotta border border-terracotta/40',
                normal: 'bg-ivory text-charcoal border border-border-warm',
                past: 'bg-sand text-stone border border-border-warm',
              }[tone];
              return (
                <div
                  key={c.label}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl ${toneClasses}`}
                >
                  <span className="font-serif font-medium text-[15px] tracking-tight">
                    {text}
                  </span>
                  <span className="w-px h-3.5 bg-current opacity-30" />
                  <div className="text-[11px] leading-tight">
                    <span className="font-medium block">{c.label}</span>
                    <span className="opacity-70">{c.displayDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 오늘 할 일 (Variant B: 주간 타임라인 + Hero + Mini) ─── */}
      <VariantB
        tasks={data.todayTasks || []}
        nextReleaseAt={data.nextReleaseAt}
        curricula={data.curricula}
        slug={slug}
        basePath={basePath}
        onOpenConcept={(setId, subjectSlug) => {
          trackEvent('task_click', { kind: 'concept', id: setId });
          setConceptInitialSubject(subjectSlug);
          router.push(`${basePath}/${slug}/concept/${setId}`);
        }}
      />
      <div id="all-content-anchor" />

      {/* ─── 전체 콘텐츠 보기 양방향 토글 ─── */}
      <button
        onClick={() => {
          trackEvent('show_all_toggle', { to: showAll ? 'off' : 'on' });
          setShowAll(!showAll);
        }}
        className="w-full flex items-center justify-center gap-2 py-4 text-[13px] tracking-[0.08em] uppercase text-stone hover:text-terracotta transition-colors"
        aria-expanded={showAll}
      >
        {showAll ? '전체 콘텐츠 접기' : '전체 콘텐츠 보기'}
        <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
      </button>

      {showAll && (
      <>
      {/* ─── Tabs ─── */}
      <div className="flex gap-0.5 mb-6 bg-sand rounded-xl p-1">
        <button
          onClick={() => {
            trackEvent('tab_change', { tab: 'learning' });
            setActiveTab('learning');
          }}
          className={`flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-all ${
            activeTab === 'learning'
              ? 'bg-ivory text-ink shadow-ring-warm'
              : 'text-olive hover:text-charcoal'
          }`}
        >
          학습 페이지
        </button>
        <button
          onClick={() => {
            trackEvent('tab_change', { tab: 'concept' });
            setActiveTab('concept');
          }}
          className={`flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-all ${
            activeTab === 'concept'
              ? 'bg-ivory text-ink shadow-ring-warm'
              : 'text-olive hover:text-charcoal'
          }`}
        >
          개념강의
        </button>
        <button
          onClick={() => {
            trackEvent('tab_change', { tab: 'materials' });
            setActiveTab('materials');
          }}
          className={`flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-all ${
            activeTab === 'materials'
              ? 'bg-ivory text-ink shadow-ring-warm'
              : 'text-olive hover:text-charcoal'
          }`}
        >
          기타 자료
        </button>
      </div>

      {/* ─── Learning Tab ─── */}
      {activeTab === 'learning' && (() => {
        if (data.curricula.length === 0) {
          return (
            <div className="bg-ivory border border-border-cream rounded-2xl px-8 py-16 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-stone" />
              <p className="text-[14px] text-olive">
                아직 배정된 학습이 없습니다
              </p>
            </div>
          );
        }
        const activeCurriculum =
          data.curricula.find(c => c.id === selectedCurriculumId) ||
          data.curricula[0];
        const showCurriculumTabs = data.curricula.length > 1;
        return (
          <div className="space-y-5">
            {/* 커리큘럼 서브탭 */}
            {showCurriculumTabs && (
              <div className="flex gap-2 flex-wrap">
                {data.curricula.map(c => {
                  const isActive = c.id === activeCurriculum.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCurriculumId(c.id)}
                      className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                        isActive
                          ? 'bg-terracotta text-ivory shadow-ring-terracotta'
                          : 'bg-ivory text-charcoal border border-border-warm hover:bg-sand'
                      }`}
                    >
                      {c.title}
                      <span className={`ml-1.5 text-[11px] ${isActive ? 'opacity-75' : 'text-stone'}`}>
                        {c.sessions.length}개
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 선택된 커리큘럼의 세션 리스트 */}
            <div className="space-y-2.5">
              {activeCurriculum.sessions.length === 0 ? (
                <div className="bg-ivory border border-border-cream rounded-xl px-6 py-8 text-center">
                  <p className="text-[13px] text-stone">
                    아직 공개된 차시가 없습니다
                  </p>
                </div>
              ) : (
                activeCurriculum.sessions.map(session => (
                  <Link
                    key={session.id}
                    href={`${basePath}/${slug}/session/${session.id}`}
                    className="group bg-ivory border border-border-cream rounded-xl px-5 py-4 flex items-center gap-4 hover:bg-white hover:shadow-ring-warm transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] tracking-[0.08em] uppercase text-stone font-medium">
                          {session.week_number}주차 · {session.session_number}차시
                        </span>
                      </div>
                      <p className="font-serif font-medium text-[17px] text-ink truncate tracking-tight">
                        {session.label ||
                          `${session.week_number}주차 ${session.session_number}차시`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone group-hover:text-terracotta shrink-0 transition-colors" />
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })()}

      {/* ─── Concept Tab ─── */}
      {activeTab === 'concept' && (
        <ConceptLecturesSection
          slug={slug}
          basePath={basePath}
          initialSubjectSlug={conceptInitialSubject}
        />
      )}

      {/* ─── Materials Tab ─── */}
      {activeTab === 'materials' && (
        <div>
          {materialsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-stone" />
            </div>
          ) : materials.length === 0 ? (
            <div className="bg-ivory border border-border-cream rounded-2xl px-8 py-16 text-center">
              <FolderOpen className="w-10 h-10 mx-auto mb-3 text-stone" />
              <p className="font-serif font-medium text-[17px] text-ink tracking-tight">
                공유 자료가 아직 없습니다
              </p>
              <p className="text-[13px] text-olive mt-2">
                선생님이 올려주시는 자료가 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {materials.map(m => (
                <a
                  key={m.id}
                  href={m.cdn_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-ivory border border-border-cream rounded-xl px-5 py-4 flex items-center gap-4 hover:bg-white hover:shadow-ring-warm transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-sand flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-charcoal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] tracking-wider uppercase font-medium text-stone bg-sand/60 px-1.5 py-0.5 rounded-full">
                        {AUDIENCE_LABEL[m.audience] || m.audience}
                      </span>
                    </div>
                    <p className="font-serif font-medium text-[16px] text-ink truncate tracking-tight">
                      {m.title}
                    </p>
                    {m.description && (
                      <p className="text-[12px] text-olive mt-0.5 truncate">
                        {m.description}
                      </p>
                    )}
                    <p className="text-[11px] text-stone mt-0.5">
                      {m.original_filename}
                      {m.file_size_bytes &&
                        ` · ${(m.file_size_bytes / 1024 / 1024).toFixed(1)}MB`}
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-stone group-hover:text-terracotta shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* ─── 시즌 학습 일정 (토글 무관 항상 표시) ─── */}
      <SeasonPlan slug={slug} basePath={basePath} />
    </div>
  );
}
