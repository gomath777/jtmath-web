'use client';

import { useState } from 'react';
import { grantEnrollment, revokeEnrollment } from './actions';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

type Enrollment = {
  id: string;
  course_id: string;
  valid_until: string;
  source: string;
  courses: { title: string } | { title: string }[] | null;
};

const DURATION_OPTIONS = [
  { label: '1개월', months: 1 },
  { label: '2개월', months: 2 },
  { label: '3개월', months: 3 },
  { label: '6개월', months: 6 },
  { label: '1년 (12개월)', months: 12 },
];

export default function AdminUserRow({
  profile,
  courses,
  userEnrollments,
}: {
  profile: any;
  courses: any[];
  userEnrollments: Enrollment[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || '');
  const [selectedMonths, setSelectedMonths] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [localEnrollments, setLocalEnrollments] = useState<Enrollment[]>(userEnrollments);

  const activeEnrollments = localEnrollments.filter(
    (e) => new Date(e.valid_until) > new Date()
  );

  const handleEnroll = async () => {
    if (!selectedCourse || !confirm('수강 권한을 부여하시겠습니까?')) return;

    setIsLoading(true);
    try {
      const result = await grantEnrollment(profile.id, selectedCourse, selectedMonths);
      if (result.error) {
        alert(result.error);
      } else {
        alert('수강 권한이 부여되었습니다.');
        // 로컬 상태 업데이트
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + selectedMonths);
        const course = courses.find((c) => c.id === selectedCourse);
        setLocalEnrollments((prev) => {
          const filtered = prev.filter((e) => e.course_id !== selectedCourse);
          return [
            ...filtered,
            {
              id: 'new-' + Date.now(),
              course_id: selectedCourse,
              valid_until: validUntil.toISOString(),
              source: 'admin_grant',
              courses: { title: course?.title || '' },
            },
          ];
        });
      }
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (enrollmentId: string, courseTitle: string) => {
    if (!confirm(`"${courseTitle}" 수강 권한을 삭제하시겠습니까?`)) return;
    setRevoking(enrollmentId);
    try {
      const result = await revokeEnrollment(enrollmentId);
      if (result.error) {
        alert(result.error);
      } else {
        setLocalEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
      }
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setRevoking(null);
    }
  };

  function getCourseTitle(enrollment: Enrollment): string {
    if (!enrollment.courses) return enrollment.course_id;
    if (Array.isArray(enrollment.courses)) return enrollment.courses[0]?.title || enrollment.course_id;
    return enrollment.courses.title;
  }

  return (
    <>
      <tr className="hover:bg-slate-50/50 transition-colors">
        <td className="px-6 py-4">
          <div className="font-bold text-slate-900">{profile.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{profile.school}</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[150px]">{profile.assignment_email}</div>
        </td>
        <td className="px-6 py-4">
          <div className="text-slate-700">{profile.phone_student}</div>
          <div className="text-xs text-slate-500 mt-0.5">부: {profile.phone_parent}</div>
        </td>
        <td className="px-6 py-4">
          {activeEnrollments.length === 0 ? (
            <span className="text-xs text-slate-400">수강 없음</span>
          ) : (
            <div className="space-y-1">
              {activeEnrollments.map((e) => (
                <div key={e.id} className="text-xs">
                  <span className="font-medium text-slate-700 line-clamp-1">{getCourseTitle(e)}</span>
                  <span className="text-slate-400 ml-1">
                    (~{new Date(e.valid_until).toLocaleDateString('ko-KR')})
                  </span>
                </div>
              ))}
            </div>
          )}
        </td>
        <td className="px-6 py-4 text-slate-500 text-xs">
          {new Date(profile.created_at).toLocaleDateString('ko-KR')}
        </td>
        <td className="px-6 py-4 text-right">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 text-red-600 font-bold hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors text-xs"
          >
            권한 관리
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </td>
      </tr>

      {isOpen && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={5} className="px-6 py-5">
            <div className="max-w-3xl space-y-4">

              {/* 현재 수강 권한 목록 */}
              {localEnrollments.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">현재 수강 권한</p>
                  <div className="space-y-2">
                    {localEnrollments.map((e) => {
                      const isExpired = new Date(e.valid_until) < new Date();
                      return (
                        <div key={e.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isExpired ? 'bg-slate-300' : 'bg-green-500'}`} />
                            <span className="text-sm font-medium text-slate-700 truncate">{getCourseTitle(e)}</span>
                            <span className={`text-xs shrink-0 ${isExpired ? 'text-red-400' : 'text-slate-400'}`}>
                              {isExpired ? '만료: ' : '~'}
                              {new Date(e.valid_until).toLocaleDateString('ko-KR')}
                            </span>
                            <span className="text-[10px] text-slate-300 shrink-0">{e.source}</span>
                          </div>
                          <button
                            onClick={() => handleRevoke(e.id, getCourseTitle(e))}
                            disabled={revoking === e.id}
                            className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1"
                            title="수강 권한 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 수강 권한 추가 */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">수강 권한 추가</p>
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <label className="text-xs font-bold text-slate-700">강의 선택</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-36 space-y-1">
                    <label className="text-xs font-bold text-slate-700">수강 기간</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                      value={selectedMonths}
                      onChange={(e) => setSelectedMonths(Number(e.target.value))}
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.months} value={opt.months}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleEnroll}
                    disabled={isLoading}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all shadow-sm shrink-0"
                  >
                    {isLoading ? '처리 중...' : '권한 부여'}
                  </button>
                </div>
              </div>

            </div>
          </td>
        </tr>
      )}
    </>
  );
}
