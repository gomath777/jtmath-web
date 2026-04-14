'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, Check, CheckCircle, Clock, Users, Calendar } from 'lucide-react';

interface Student {
  profileId: string;
  name: string;
  school: string;
  phone: string;
  slug: string;
  active: boolean;
  lastAccessedAt: string | null;
  curricula: string[];
  odapjiTotal: number;
  odapjiUnread: number;
}

interface Release {
  id: string;
  label: string;
  curriculumTitle: string;
  weekSession: string;
  publishDate: string;
  isReleased: boolean;
}

const SITE_URL = 'https://jtmath.kr';

export default function PortalClient({ students, releases }: { students: Student[]; releases: Release[] }) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const copyLink = (slug: string) => {
    const link = `${SITE_URL}/s/${slug}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1500);
    });
  };

  const copyKakaoTemplate = (student: Student) => {
    const curriculum = student.curricula[0] || '';
    const template = [
      `[고T수학] ${student.name}님`,
      '',
      `학습 페이지: ${SITE_URL}/s/${student.slug}`,
      '',
      curriculum ? `이번 ${curriculum} 학습이 올라왔습니다!` : '',
      '',
      '문제 풀고 매쓰플랫에서 답안 제출 후 카톡 주세요~',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(template).then(() => {
      setCopiedSlug('tmpl-' + student.slug);
      setTimeout(() => setCopiedSlug(null), 1500);
    });
  };

  const filtered = students.filter(s =>
    !search || s.name.includes(search) || s.school.includes(search) || s.slug.includes(search),
  );

  const releasedCount = releases.filter(r => r.isReleased).length;
  const pendingCount = releases.length - releasedCount;

  return (
    <div className="admin-root min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-black">학생 포탈 관리</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-slate-400 hover:text-white">← 관리자 홈</Link>
            <Link href="/admin/curriculum" className="text-slate-400 hover:text-white">커리큘럼</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Users className="w-4 h-4" />
              전체 학생
            </div>
            <p className="text-2xl font-black text-slate-900">{students.length}</p>
            <p className="text-xs text-slate-400 mt-1">활성 {students.filter(s => s.active).length}명</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              7일 내 릴리즈
            </div>
            <p className="text-2xl font-black text-slate-900">{releasedCount}</p>
            <p className="text-xs text-slate-400 mt-1">세션 발행됨</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              미릴리즈
            </div>
            <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
            <p className="text-xs text-slate-400 mt-1">대기 중</p>
          </div>
        </div>

        {/* Students table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">학생 목록</h2>
            <input
              type="text"
              placeholder="이름/학교/slug 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-64 text-slate-900"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2">이름</th>
                  <th className="text-left px-4 py-2">학교</th>
                  <th className="text-left px-4 py-2">slug</th>
                  <th className="text-left px-4 py-2">최근접속</th>
                  <th className="text-left px-4 py-2">커리큘럼</th>
                  <th className="text-left px-4 py-2">오답지</th>
                  <th className="text-right px-4 py-2">복사</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.profileId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.school || '-'}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`${SITE_URL}/s/${s.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-xs inline-flex items-center gap-1"
                      >
                        {s.slug}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {s.lastAccessedAt ? new Date(s.lastAccessedAt).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{s.curricula.length}개</span>
                    </td>
                    <td className="px-4 py-3">
                      {s.odapjiTotal > 0 ? (
                        <span className="text-xs">
                          {s.odapjiTotal}개
                          {s.odapjiUnread > 0 && <span className="ml-1 text-red-500 font-bold">({s.odapjiUnread} NEW)</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => copyLink(s.slug)}
                          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 inline-flex items-center gap-1"
                          title="링크만 복사"
                        >
                          {copiedSlug === s.slug ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                          링크
                        </button>
                        <button
                          onClick={() => copyKakaoTemplate(s)}
                          className="text-xs px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded text-yellow-900 inline-flex items-center gap-1"
                          title="카톡 메시지 복사"
                        >
                          {copiedSlug === 'tmpl-' + s.slug ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
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
                {search ? '검색 결과 없음' : '등록된 학생이 없습니다'}
              </div>
            )}
          </div>
        </div>

        {/* Recent releases */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h2 className="font-bold text-slate-900">최근 7일 세션</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {releases.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">최근 세션이 없습니다</div>
            ) : (
              releases.map(r => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono w-12">{r.weekSession}</span>
                  <span className="text-sm font-bold text-slate-900 flex-1">{r.label}</span>
                  <span className="text-xs text-slate-500">{r.curriculumTitle}</span>
                  <span className="text-xs text-slate-400 w-24">{r.publishDate}</span>
                  {r.isReleased ? (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> 릴리즈
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 대기
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="text-xs text-slate-400 text-center py-4">
          학생 추가/커리큘럼 수정은 CLI에서: <code className="bg-slate-100 px-1.5 py-0.5 rounded">npm run admin:student</code>
        </div>
      </div>
    </div>
  );
}
