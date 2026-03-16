'use client';

import { useState } from 'react';
import { grantEnrollment } from './actions';

export default function AdminUserRow({ profile, courses }: { profile: any, courses: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleEnroll = async () => {
    if (!selectedCourse || !confirm('수강 권한을 부여하고 카카오톡 안내 메일을 발송하시겠습니까?')) return;
    
    setIsLoading(true);
    try {
      const result = await grantEnrollment(profile.id, selectedCourse, 12); // Grant 12 months access
      
      if (result.error) {
        alert(result.error);
      } else {
        alert('성공적으로 권한이 부여되고 메일 발송이 요청되었습니다.');
        setIsOpen(false);
      }
    } catch (e) {
      alert('오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

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
        <td className="px-6 py-4 text-slate-500 text-xs">
          {new Date(profile.created_at).toLocaleDateString()}
        </td>
        <td className="px-6 py-4 text-right">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-red-600 font-bold hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors text-xs"
          >
            {isOpen ? '닫기' : '권한 관리'}
          </button>
        </td>
      </tr>
      
      {/* 권한 관리 드롭다운 행 */}
      {isOpen && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={4} className="px-6 py-4">
            <div className="flex items-end gap-3 max-w-2xl bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-slate-700">강의 선택</label>
                <select 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="w-32 space-y-1">
                <label className="text-xs font-bold text-slate-700">수강 기간 (수동)</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" disabled>
                  <option>1년 (365일)</option>
                </select>
              </div>
              <button 
                onClick={handleEnroll}
                disabled={isLoading}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all shadow-sm shrink-0"
              >
                {isLoading ? '처리 중...' : '권한 부여 & 이메일 전송'}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
