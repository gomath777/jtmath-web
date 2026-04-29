'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, Check, Users, GraduationCap, Activity } from 'lucide-react';

interface LatestRelease {
  curriculumTitle: string;
  label: string;
  weekSession: string;
  publishDate: string;
}

interface Student {
  profileId: string;
  name: string;
  school: string;
  grade: number | null;
  phone: string;
  slug: string;
  studentType: string;
  active: boolean;
  lastAccessedAt: string | null;
  curricula: string[];
  latestRelease: LatestRelease | null;
}

const SITE_URL = 'https://jtmath.kr';

function gradeLabel(g: number | null): string {
  if (g === 1) return '고1';
  if (g === 2) return '고2';
  if (g === 3) return '고3';
  return '-';
}

function dashboardUrl(s: Student): string {
  const prefix = s.studentType === 'offline' ? '/c' : '/s';
  return `${SITE_URL}${prefix}/${s.slug}`;
}

function formatRelativeKo(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return d.toLocaleDateString('ko-KR');
}

export default function StudentsClient({ students }: { students: Student[] }) {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | '1' | '2' | '3' | 'none'>('all');
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const copyKakao = (s: Student) => {
    const curriculum = s.curricula[0] || '';
    const template = [
      `[고T수학] ${s.name}님`,
      '',
      `학습 페이지: ${dashboardUrl(s)}`,
      '',
      curriculum ? `이번 ${curriculum} 학습이 올라왔습니다!` : '',
      '',
      '문제 풀고 매쓰플랫에서 답안 제출 후 카톡 주세요~',
    ].filter(Boolean).join('\n');
    copy('tmpl-' + s.slug, template);
  };

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (gradeFilter !== 'all') {
        if (gradeFilter === 'none' && s.grade != null) return false;
        if (gradeFilter !== 'none' && String(s.grade) !== gradeFilter) return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.school.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q)
      );
    });
  }, [students, search, gradeFilter]);

  const counts = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => s.active).length;
    const byGrade = { 1: 0, 2: 0, 3: 0, none: 0 };
    for (const s of students) {
      if (s.grade === 1) byGrade[1]++;
      else if (s.grade === 2) byGrade[2]++;
      else if (s.grade === 3) byGrade[3]++;
      else byGrade.none++;
    }
    return { total, active, byGrade };
  }, [students]);

  return (
    <div className="admin-root min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-black">학생 현황판</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-slate-400 hover:text-white">← 관리자 홈</Link>
            <Link href="/admin/portal" className="text-slate-400 hover:text-white">포탈 운영</Link>
            <Link href="/admin/curriculum" className="text-slate-400 hover:text-white">커리큘럼</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Users className="w-4 h-4" />
              전체
            </div>
            <p className="text-2xl font-black text-slate-900">{counts.total}</p>
            <p className="text-xs text-slate-400 mt-1">활성 {counts.active}명</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <GraduationCap className="w-4 h-4" />
              고1 / 고2 / 고3
            </div>
            <p className="text-2xl font-black text-slate-900">
              {counts.byGrade[1]} / {counts.byGrade[2]} / {counts.byGrade[3]}
            </p>
            <p className="text-xs text-slate-400 mt-1">미입력 {counts.byGrade.none}명</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Activity className="w-4 h-4" />
              7일 내 접속
            </div>
            <p className="text-2xl font-black text-slate-900">
              {students.filter(s => s.lastAccessedAt && (Date.now() - new Date(s.lastAccessedAt).getTime()) < 7 * 86400000).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">최근 활동</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Activity className="w-4 h-4" />
              미접속
            </div>
            <p className="text-2xl font-black text-slate-900">
              {students.filter(s => !s.lastAccessedAt).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">로그인 이력 없음</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="이름/학교/slug 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-64 text-slate-900"
          />
          <div className="flex gap-1 text-sm">
            {(['all', '1', '2', '3', 'none'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`px-3 py-1.5 rounded-lg border ${
                  gradeFilter === g
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {g === 'all' ? '전체' : g === 'none' ? '미입력' : `고${g}`}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} / {students.length}명</span>
        </div>

        {/* Students table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">이름</th>
                  <th className="text-left px-4 py-2 font-semibold">학년</th>
                  <th className="text-left px-4 py-2 font-semibold">학교</th>
                  <th className="text-left px-4 py-2 font-semibold">대시보드</th>
                  <th className="text-left px-4 py-2 font-semibold">최근접속</th>
                  <th className="text-left px-4 py-2 font-semibold">배정 커리큘럼</th>
                  <th className="text-left px-4 py-2 font-semibold">마지막 받은 세션</th>
                  <th className="text-left px-4 py-2 font-semibold">상태</th>
                  <th className="text-right px-4 py-2 font-semibold">복사</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.profileId || s.slug} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{s.name}</td>
                    <td className="px-4 py-3">
                      {s.grade != null ? (
                        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {gradeLabel(s.grade)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.school || '-'}</td>
                    <td className="px-4 py-3">
                      <a
                        href={dashboardUrl(s)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-xs inline-flex items-center gap-1"
                      >
                        {s.studentType === 'offline' ? '/c' : '/s'}/{s.slug}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {formatRelativeKo(s.lastAccessedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {s.curricula.length === 0 ? (
                        <span className="text-slate-300 text-xs">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {s.curricula.map((c, i) => (
                            <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {s.latestRelease ? (
                        <div>
                          <div className="font-semibold text-slate-900">
                            <span className="text-slate-400 font-mono mr-1">{s.latestRelease.weekSession}</span>
                            {s.latestRelease.label}
                          </div>
                          <div className="text-slate-400">{s.latestRelease.publishDate}</div>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.active ? (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">활성</span>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">비활성</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => copy(s.slug, dashboardUrl(s))}
                          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 inline-flex items-center gap-1"
                          title="대시보드 링크 복사"
                        >
                          {copied === s.slug ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                          링크
                        </button>
                        <button
                          onClick={() => copyKakao(s)}
                          className="text-xs px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded text-yellow-900 inline-flex items-center gap-1"
                          title="카톡 메시지 복사"
                        >
                          {copied === 'tmpl-' + s.slug ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                          카톡
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                {search || gradeFilter !== 'all' ? '필터 결과 없음' : '등록된 학생이 없습니다'}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400 text-center py-4">
          학생 추가/수정은 CLI에서: <code className="bg-slate-100 px-1.5 py-0.5 rounded">npm run admin:student</code>
          {' · '}
          학년 채우기는 Supabase SQL Editor에서 <code className="bg-slate-100 px-1.5 py-0.5 rounded">UPDATE profiles SET grade=2 WHERE name=&apos;…&apos;</code>
        </div>
      </div>
    </div>
  );
}
