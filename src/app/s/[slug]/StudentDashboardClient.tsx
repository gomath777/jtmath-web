'use client';

import { useState, useEffect } from 'react';
import { Loader2, BookOpen, ChevronRight, FolderOpen, FileText, Download } from 'lucide-react';
import Link from 'next/link';

interface SessionItem {
  id: string;
  week_number: number;
  session_number: number;
  label: string;
  status: 'new' | 'in_progress' | 'completed';
  videoProgress: string | null;
}

interface CurriculumData {
  id: string;
  title: string;
  subject_slug: string;
  sessions: SessionItem[];
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
    // Only show countdowns that are today or in the future (or past within 7 days)
    .filter(c => c.daysLeft >= -7)
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

type TabKey = 'learning' | 'materials';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  new: {
    label: 'NEW',
    className: 'bg-terracotta text-ivory',
  },
  in_progress: {
    label: '진행중',
    className: 'bg-sand text-charcoal',
  },
  completed: {
    label: '완료',
    className: 'bg-transparent text-stone border border-border-warm',
  },
};

const AUDIENCE_LABEL: Record<string, string> = {
  all: '전체 공개',
  student: '개별 자료',
  curriculum: '수강 자료',
};

export default function StudentDashboardClient({ slug }: { slug: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [birthPin, setBirthPin] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('learning');

  const [materials, setMaterials] = useState<SharedMaterial[]>([]);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);

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

  const countdowns = buildCountdowns(data.profile);

  return (
    <div>
      {/* ─── Welcome hero ─── */}
      <div className="mb-10">
        <h1 className="font-serif font-medium text-[36px] text-ink tracking-tightest leading-[1.05]">
          {data.profile.name}
          <span className="text-olive font-normal text-[22px] ml-1.5">
            님
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

      {/* ─── Tabs ─── */}
      <div className="flex gap-0.5 mb-6 bg-sand rounded-xl p-1">
        <button
          onClick={() => setActiveTab('learning')}
          className={`flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-all ${
            activeTab === 'learning'
              ? 'bg-ivory text-ink shadow-ring-warm'
              : 'text-olive hover:text-charcoal'
          }`}
        >
          학습 페이지
        </button>
        <button
          onClick={() => setActiveTab('materials')}
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
      {activeTab === 'learning' && (
        <div className="space-y-8">
          {data.curricula.length === 0 ? (
            <div className="bg-ivory border border-border-cream rounded-2xl px-8 py-16 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-stone" />
              <p className="text-[14px] text-olive">
                아직 배정된 학습이 없습니다
              </p>
            </div>
          ) : (
            data.curricula.map(curriculum => (
              <section key={curriculum.id}>
                <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-border-warm">
                  <span className="w-1.5 h-1.5 rounded-full bg-terracotta shrink-0 translate-y-[-4px]" />
                  <h2 className="font-serif font-medium text-[22px] text-ink tracking-tight">
                    {curriculum.title}
                  </h2>
                  <span className="text-[11px] tracking-[0.1em] uppercase text-stone ml-auto">
                    세션 {curriculum.sessions.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {curriculum.sessions.length === 0 ? (
                    <div className="bg-ivory border border-border-cream rounded-xl px-6 py-8 text-center">
                      <p className="text-[13px] text-stone">
                        아직 공개된 차시가 없습니다
                      </p>
                    </div>
                  ) : (
                    curriculum.sessions.map(session => {
                      const badge = STATUS_BADGE[session.status];
                      return (
                        <Link
                          key={session.id}
                          href={`/s/${slug}/session/${session.id}`}
                          className="group bg-ivory border border-border-cream rounded-xl px-5 py-4 flex items-center gap-4 hover:bg-white hover:shadow-ring-warm transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] tracking-[0.08em] uppercase text-stone font-medium">
                                {session.week_number}주차 · {session.session_number}차시
                              </span>
                              <span
                                className={`text-[10px] tracking-wider uppercase font-medium px-1.5 py-0.5 rounded-full ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <p className="font-serif font-medium text-[17px] text-ink truncate tracking-tight">
                              {session.label ||
                                `${session.week_number}주차 ${session.session_number}차시`}
                            </p>
                          </div>
                          {session.videoProgress && (
                            <span className="text-[11px] text-stone shrink-0">
                              {session.videoProgress}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-stone group-hover:text-terracotta shrink-0 transition-colors" />
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            ))
          )}
        </div>
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
    </div>
  );
}
