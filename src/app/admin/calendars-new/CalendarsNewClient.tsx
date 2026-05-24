'use client';

import Link from 'next/link';
import { useState } from 'react';
import SessionCalendarView from '@/app/s/[slug]/SessionCalendarView';
import type { CalendarSlaEntry } from './page';

interface Student {
  slug: string;
  profileId: string;
  name: string;
  school: string;
  grade: number | null;
  sla: CalendarSlaEntry[];
  phase: { label: string; startYmd: string; endYmd: string | null } | null;
}

function gradeLabel(g: number | null): string {
  if (g === 1) return '1학년';
  if (g === 2) return '2학년';
  if (g === 3) return '3학년';
  return '학년 미지정';
}

/** SLA 진입을 SessionCalendarView 의 CalendarSessionEntry 로 매핑 (lessonSlug 사용) */
function slaToSession(s: CalendarSlaEntry) {
  return {
    id: s.id,
    subject_slug: s.subject_slug,
    subject_label: s.subject_label,
    week_number: s.week_number,
    session_number: s.session_number,
    label: s.label,
    publishDate: s.publishDate,
    is_released: s.is_released,
    lessonSlug: s.lessonSlug,
  };
}

export default function CalendarsNewClient({ students }: { students: Student[] }) {
  const [mode, setMode] = useState<'master' | 'student'>('master');

  const groups: Array<{ grade: number | null; students: Student[] }> = [];
  for (const s of students) {
    const last = groups[groups.length - 1];
    if (last && last.grade === s.grade) last.students.push(s);
    else groups.push({ grade: s.grade, students: [s] });
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8 px-4">
      <header className="max-w-5xl mx-auto mb-8">
        <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-900">← 어드민 홈</Link>
        <div className="flex items-center justify-between mt-2 gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900">학생 캘린더 (신 시스템)</h1>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setMode('master')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                mode === 'master' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              마스터 뷰
            </button>
            <button
              onClick={() => setMode('student')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                mode === 'student' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              학생 뷰
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          {mode === 'master'
            ? '마이그레이션된 student_lesson_assignments 데이터. 카드 클릭 → /lesson/{slug}.'
            : '학생이 실제로 보는 화면 (미릴리즈 잠금).'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          전체 {students.length}명 · 총 SLA {students.reduce((acc, s) => acc + s.sla.length, 0)}건
        </p>
        <div className="mt-2">
          <Link href="/admin/calendars" className="text-xs text-blue-600 hover:underline">
            구 시스템 캘린더 보기 →
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-10">
        {groups.map(group => (
          <div key={group.grade ?? 'none'} className="space-y-5">
            <div className="flex items-center gap-3 sticky top-0 bg-[#F8F9FA] py-2 z-10">
              <h2 className="text-lg font-bold text-slate-900">{gradeLabel(group.grade)}</h2>
              <span className="text-xs text-slate-500">{group.students.length}명</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="space-y-5">
              {group.students.map(s => {
                const sessions = s.sla.map(slaToSession);
                return (
                  <section
                    key={s.profileId}
                    className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">{s.name}</h3>
                        <p className="text-xs text-slate-500">
                          {s.school || '학교 미입력'}
                          {s.sla.length > 0 && (
                            <span className="ml-2 text-slate-400">
                              · 신 시스템 {s.sla.length}건
                            </span>
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/s/${s.slug}`}
                        target="_blank"
                        className="text-xs text-red-600 hover:underline shrink-0"
                      >
                        학생 페이지 ↗
                      </Link>
                    </div>

                    {s.sla.length === 0 && !s.phase ? (
                      <p className="text-sm text-slate-400 py-4 text-center">
                        신 시스템 SLA 미배정 (마이그레이션 보류 또는 신규 학생)
                      </p>
                    ) : (
                      <SessionCalendarView
                        mode={mode}
                        sessions={sessions}
                        conceptItems={[]}
                        phase={s.phase}
                        slug={s.slug}
                        basePath="/s"
                      />
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        ))}

        {students.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-500">
            등록된 학생이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
