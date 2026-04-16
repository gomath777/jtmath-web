'use client';

import { useState } from 'react';
import { CalendarClock, Check, Loader2 } from 'lucide-react';

interface StudentRow {
  profileId: string;
  name: string;
  school: string;
  examDateMidterm: string | null;
  examDateFinal: string | null;
}

interface Props {
  students: StudentRow[];
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ExamDatesSection({ students }: Props) {
  // Local state mirror — enables optimistic updates and per-row save indicators
  const [rows, setRows] = useState<StudentRow[]>(students);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [search, setSearch] = useState('');

  const setSaveState = (key: string, state: SaveState) => {
    setSaveStates(prev => ({ ...prev, [key]: state }));
    if (state === 'saved') {
      setTimeout(() => {
        setSaveStates(prev => {
          const next = { ...prev };
          if (next[key] === 'saved') delete next[key];
          return next;
        });
      }, 1500);
    }
  };

  const handleDateChange = async (
    profileId: string,
    field: 'exam_date_midterm' | 'exam_date_final',
    value: string,
  ) => {
    const key = `${profileId}:${field}`;
    const normalizedValue = value || null;

    // Optimistic update
    setRows(prev =>
      prev.map(r =>
        r.profileId === profileId
          ? {
              ...r,
              examDateMidterm: field === 'exam_date_midterm' ? normalizedValue : r.examDateMidterm,
              examDateFinal: field === 'exam_date_final' ? normalizedValue : r.examDateFinal,
            }
          : r,
      ),
    );

    setSaveState(key, 'saving');

    try {
      const res = await fetch(`/api/admin/students/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: normalizedValue }),
      });
      if (res.ok) {
        setSaveState(key, 'saved');
      } else {
        const d = await res.json();
        setSaveState(key, 'error');
        alert(`저장 실패: ${d.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      setSaveState(key, 'error');
      alert(`저장 실패: ${err instanceof Error ? err.message : '네트워크 오류'}`);
    }
  };

  const filtered = rows.filter(r =>
    !search || r.name.includes(search) || r.school.includes(search),
  );

  // Summary: how many students have at least one exam date set
  const withMidterm = rows.filter(r => r.examDateMidterm).length;
  const withFinal = rows.filter(r => r.examDateFinal).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex items-center gap-3">
        <CalendarClock className="w-4 h-4 text-slate-500" />
        <h2 className="font-bold text-slate-900">학생별 시험일</h2>
        <span className="text-xs text-slate-400">
          중간 {withMidterm} · 기말 {withFinal} / 전체 {rows.length}
        </span>
        <input
          type="text"
          placeholder="이름/학교 검색…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-56 text-slate-900 ml-auto"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2 w-32">이름</th>
              <th className="text-left px-4 py-2">학교</th>
              <th className="text-left px-4 py-2 w-52">중간고사</th>
              <th className="text-left px-4 py-2 w-52">기말고사</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const midKey = `${r.profileId}:exam_date_midterm`;
              const finKey = `${r.profileId}:exam_date_final`;
              return (
                <tr key={r.profileId} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-bold text-slate-900">{r.name}</td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{r.school || '-'}</td>
                  <td className="px-4 py-2.5">
                    <DateCell
                      value={r.examDateMidterm}
                      state={saveStates[midKey]}
                      onChange={v => handleDateChange(r.profileId, 'exam_date_midterm', v)}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <DateCell
                      value={r.examDateFinal}
                      state={saveStates[finKey]}
                      onChange={v => handleDateChange(r.profileId, 'exam_date_final', v)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            {search ? '검색 결과 없음' : '등록된 학생이 없습니다'}
          </div>
        )}
      </div>
    </div>
  );
}

function DateCell({
  value,
  state,
  onChange,
}: {
  value: string | null;
  state: SaveState | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="px-2 py-1 border border-slate-300 rounded text-sm w-36 text-slate-900"
      />
      {state === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
      {state === 'saved' && <Check className="w-3.5 h-3.5 text-green-600" />}
      {state === 'error' && <span className="text-xs text-red-500">!</span>}
      {!value && !state && <span className="text-xs text-slate-400">미설정</span>}
    </div>
  );
}
