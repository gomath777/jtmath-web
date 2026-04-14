'use client';

import { useState, useEffect } from 'react';
import { Loader2, BookOpen, ChevronRight, FileText, Download, AlertCircle } from 'lucide-react';
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

interface OdapjiFile {
  id: string;
  original_filename: string;
  cdn_url: string;
  file_size_bytes: number;
  is_read: boolean;
  uploaded_at: string;
}

interface DashboardData {
  profile: { name: string; school: string };
  curricula: CurriculumData[];
  odapjiCount: number;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  new: { label: 'NEW', className: 'bg-brand-blue/20 text-brand-blue' },
  in_progress: { label: '진행중', className: 'bg-amber-500/20 text-amber-400' },
  completed: { label: '완료', className: 'bg-green-500/20 text-green-400' },
};

export default function StudentDashboardClient({ slug }: { slug: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [birthPin, setBirthPin] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'learning' | 'odapji'>('learning');
  const [odapjiFiles, setOdapjiFiles] = useState<OdapjiFile[]>([]);
  const [odapjiLoading, setOdapjiLoading] = useState(false);

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

  useEffect(() => { fetchDashboard(); }, []);

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

  const loadOdapji = async () => {
    setOdapjiLoading(true);
    try {
      const res = await fetch('/api/public/student/odapji');
      const d = await res.json();
      setOdapjiFiles(d.files || []);
    } catch { /* ignore */ }
    setOdapjiLoading(false);
  };

  // --- Verify form ---
  if (needsVerify) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="brand-card p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-lg font-black text-white mb-1">본인 확인</h1>
            <p className="text-xs text-white/40">생년월일 6자리를 입력하세요</p>
          </div>
          <form onSubmit={handleVerify}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="YYMMDD (예: 080315)"
              value={birthPin}
              onChange={e => setBirthPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center text-lg tracking-[0.3em] font-mono placeholder:text-white/20 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:border-brand-blue"
              autoFocus
            />
            {verifyError && (
              <p className="text-red-400 text-xs text-center mt-2">{verifyError}</p>
            )}
            <button
              type="submit"
              disabled={birthPin.length !== 6 || verifying}
              className="w-full mt-4 py-3 bg-brand-blue text-white text-sm font-bold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-blue/90 transition-colors"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '확인'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-xl font-black text-white">
          {data.profile.name}<span className="text-white/40 font-normal text-base ml-1">님</span>
        </h1>
        {data.profile.school && (
          <p className="text-xs text-white/30 mt-0.5">{data.profile.school}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/[0.04] rounded-xl p-1">
        <button
          onClick={() => setActiveTab('learning')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
            activeTab === 'learning' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          학습
        </button>
        <button
          onClick={() => { setActiveTab('odapji'); if (odapjiFiles.length === 0) loadOdapji(); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors relative ${
            activeTab === 'odapji' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          오답
          {data.odapjiCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {data.odapjiCount}
            </span>
          )}
        </button>
      </div>

      {/* Learning Tab */}
      {activeTab === 'learning' && (
        <div className="space-y-6">
          {data.curricula.length === 0 ? (
            <div className="brand-card p-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm">아직 배정된 학습이 없습니다</p>
            </div>
          ) : (
            data.curricula.map(curriculum => (
              <div key={curriculum.id}>
                <h2 className="text-sm font-black text-white/60 mb-3 px-1">{curriculum.title}</h2>
                <div className="space-y-2">
                  {curriculum.sessions.length === 0 ? (
                    <div className="brand-card p-6 text-center">
                      <p className="text-white/30 text-xs">아직 공개된 차시가 없습니다</p>
                    </div>
                  ) : (
                    curriculum.sessions.map(session => {
                      const badge = STATUS_BADGE[session.status];
                      return (
                        <Link
                          key={session.id}
                          href={`/s/${slug}/session/${session.id}`}
                          className="brand-card p-4 flex items-center gap-3 hover:bg-white/[0.06] transition-colors block"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs text-white/30 font-mono">
                                {session.week_number}-{session.session_number}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-white truncate">
                              {session.label || `${session.week_number}주차 ${session.session_number}차시`}
                            </p>
                          </div>
                          {session.videoProgress && (
                            <span className="text-[10px] text-white/20 shrink-0">{session.videoProgress}</span>
                          )}
                          <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Odapji Tab */}
      {activeTab === 'odapji' && (
        <div className="space-y-2">
          {odapjiLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-white/30" />
            </div>
          ) : odapjiFiles.length === 0 ? (
            <div className="brand-card p-12 text-center">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm">오답지가 없습니다</p>
            </div>
          ) : (
            odapjiFiles.map(file => (
              <a
                key={file.id}
                href={file.cdn_url}
                target="_blank"
                rel="noopener noreferrer"
                className="brand-card p-4 flex items-center gap-3 hover:bg-white/[0.06] transition-colors block"
                onClick={() => {
                  if (!file.is_read) {
                    fetch('/api/public/student/odapji', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: file.id }),
                    });
                  }
                }}
              >
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate">{file.original_filename}</p>
                    {!file.is_read && (
                      <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full shrink-0">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/30">
                    {new Date(file.uploaded_at).toLocaleDateString('ko-KR')}
                    {file.file_size_bytes && ` · ${(file.file_size_bytes / 1024 / 1024).toFixed(1)}MB`}
                  </p>
                </div>
                <Download className="w-4 h-4 text-white/30 shrink-0" />
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
