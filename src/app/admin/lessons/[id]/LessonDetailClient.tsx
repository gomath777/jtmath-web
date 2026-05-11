'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface Item {
  id: string;
  week_number: number | null;
  session_number: number | null;
  label: string | null;
  title: string | null;
  publish_date: string | null;
  is_released: boolean | null;
  public_slug: string | null;
  curriculum: { id: string; subject_slug: string; title: string } | null;
}

interface Student {
  id: string;
  name: string;
  school: string | null;
  grade: string | null;
}

interface Assignment {
  id: string;
  scheduled_date: string;
  status: 'pending' | 'released' | 'completed';
  variant: string;
  notes: string | null;
  profile: { id: string; name: string; school: string | null };
}

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

function todayKstYmd(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function LessonDetailClient({
  item,
  students,
  assignments,
}: {
  item: Item;
  students: Student[];
  assignments: Assignment[];
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [date, setDate] = useState<string>(todayKstYmd());
  const [variant, setVariant] = useState('default');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(assignments);

  const subjLabel = SUBJECT_LABEL[item.curriculum?.subject_slug || ''] || item.curriculum?.subject_slug || '';
  const heading = item.title || item.label ||
    (item.week_number && item.session_number ? `${item.week_number}주 ${item.session_number}차시` : '학습 페이지');

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(s =>
      !q || s.name.toLowerCase().includes(q) || (s.school || '').toLowerCase().includes(q),
    );
  }, [students, search]);

  // 이미 이 페이지 + 이 날짜에 배정된 학생 id set
  const assignedKeyToProfile = useMemo(() => {
    const m = new Map<string, Assignment>();
    localAssignments.forEach(a => m.set(`${a.profile.id}:${a.scheduled_date}`, a));
    return m;
  }, [localAssignments]);

  function toggle(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelected(new Set(filteredStudents.map(s => s.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function distribute() {
    if (selected.size === 0) {
      setMsg({ type: 'err', text: '학생을 선택하세요' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/lessons/${item.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_ids: Array.from(selected),
          scheduled_date: date,
          variant,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '실패');
      setMsg({ type: 'ok', text: `${json.inserted}명 배정 완료` });
      // 새 row를 local list에 추가 (server fetch 대신 빠른 반영)
      const newRows: Assignment[] = (json.assignments || []).map((a: { id: string; profile_id: string; scheduled_date: string; status: 'pending' | 'released' | 'completed'; variant: string; notes: string | null }) => {
        const p = students.find(s => s.id === a.profile_id);
        return {
          id: a.id,
          scheduled_date: a.scheduled_date,
          status: a.status,
          variant: a.variant,
          notes: a.notes,
          profile: { id: a.profile_id, name: p?.name || '?', school: p?.school || null },
        };
      });
      setLocalAssignments(prev => {
        const ids = new Set(prev.map(x => x.id));
        const merged = [...prev];
        newRows.forEach(r => { if (!ids.has(r.id)) merged.push(r); });
        return merged.sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
      });
      setSelected(new Set());
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAssignment(slaId: string) {
    if (!confirm('이 배정을 삭제할까요?')) return;
    const res = await fetch(`/api/admin/sla/${slaId}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setMsg({ type: 'err', text: j?.error || '삭제 실패' });
      return;
    }
    setLocalAssignments(prev => prev.filter(a => a.id !== slaId));
  }

  async function release(slaIds: string[]) {
    const res = await fetch('/api/admin/sla/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: slaIds }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) { setMsg({ type: 'err', text: j?.error || '실패' }); return; }
    setMsg({ type: 'ok', text: `${j.released}개 release` });
    setLocalAssignments(prev =>
      prev.map(a => slaIds.includes(a.id) ? { ...a, status: 'released' as const } : a),
    );
  }

  return (
    <div className="min-h-screen bg-parchment py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/lessons" className="text-[12px] text-stone hover:text-terracotta">← 학습 페이지 목록</Link>
        <header className="mt-2 mb-6 pb-5 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-1">{subjLabel}</p>
          <h1 className="font-serif text-[24px] text-ink">{heading}</h1>
          {item.public_slug && (
            <p className="mt-2 text-[12px] text-stone">
              <a
                href={`/lesson/${item.public_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terracotta hover:underline"
              >
                /lesson/{item.public_slug} ↗
              </a>
            </p>
          )}
        </header>

        {msg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-[13px] ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        {/* 배정 폼 */}
        <section className="bg-ivory border border-border-cream rounded-2xl p-5 mb-6">
          <h2 className="font-serif text-[18px] text-ink mb-4">이 페이지 배정</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[11px] tracking-wider uppercase text-stone font-medium mb-1">날짜</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-border-cream rounded-lg px-3 py-2 text-[13px] bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-wider uppercase text-stone font-medium mb-1">변형판</label>
              <input
                type="text"
                value={variant}
                onChange={e => setVariant(e.target.value)}
                className="w-full border border-border-cream rounded-lg px-3 py-2 text-[13px] bg-white"
                placeholder="default"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={distribute}
                disabled={busy || selected.size === 0}
                className="flex-1 px-4 py-2 rounded-lg bg-terracotta text-ivory text-[13px] font-medium disabled:opacity-40 hover:bg-terracotta/90"
              >
                {busy ? '배정 중...' : `${selected.size}명 배정`}
              </button>
            </div>
          </div>

          <div className="mb-2 flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="학생 이름 또는 학교 검색"
              className="flex-1 border border-border-cream rounded-lg px-3 py-2 text-[13px] bg-white"
            />
            <button onClick={selectAll} className="text-[12px] text-terracotta hover:underline">전체 선택</button>
            <button onClick={clearAll} className="text-[12px] text-stone hover:underline">해제</button>
          </div>

          <div className="max-h-80 overflow-y-auto border border-border-cream rounded-lg bg-white">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-stone py-6 text-[13px]">학생 없음</p>
            ) : (
              <ul className="divide-y divide-border-cream">
                {filteredStudents.map(s => {
                  const checked = selected.has(s.id);
                  const existing = assignedKeyToProfile.get(`${s.id}:${date}`);
                  return (
                    <li key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-sand/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s.id)}
                        className="w-4 h-4 accent-terracotta cursor-pointer"
                      />
                      <button onClick={() => toggle(s.id)} className="flex-1 text-left">
                        <span className="text-[13px] text-charcoal">{s.name}</span>
                        {s.school && <span className="text-[11px] text-stone ml-2">{s.school}</span>}
                        {s.grade && <span className="text-[11px] text-stone ml-1">{s.grade}</span>}
                      </button>
                      {existing && (
                        <span className="text-[10px] tracking-wider uppercase bg-sand text-stone px-2 py-0.5 rounded-full">
                          이미 배정 ({existing.status})
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* 배정 학생 목록 */}
        <section className="bg-ivory border border-border-cream rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-[18px] text-ink">현재 배정 ({localAssignments.length}명)</h2>
            {localAssignments.some(a => a.status === 'pending') && (
              <button
                onClick={() => release(localAssignments.filter(a => a.status === 'pending').map(a => a.id))}
                className="text-[12px] px-3 py-1.5 rounded-lg border border-terracotta text-terracotta hover:bg-terracotta hover:text-ivory transition-colors"
              >
                pending 일괄 release
              </button>
            )}
          </div>
          {localAssignments.length === 0 ? (
            <p className="text-center text-stone py-6 text-[13px]">배정된 학생이 없습니다</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="text-[11px] tracking-wider uppercase text-stone border-b border-border-cream">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">학생</th>
                  <th className="px-2 py-2 text-left font-medium">날짜</th>
                  <th className="px-2 py-2 text-left font-medium">상태</th>
                  <th className="px-2 py-2 text-left font-medium">변형판</th>
                  <th className="px-2 py-2 text-right font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-cream">
                {localAssignments.map(a => (
                  <tr key={a.id} className="hover:bg-sand/50">
                    <td className="px-2 py-2 text-charcoal">
                      {a.profile.name}
                      {a.profile.school && <span className="text-[11px] text-stone ml-2">{a.profile.school}</span>}
                    </td>
                    <td className="px-2 py-2 text-stone">{a.scheduled_date}</td>
                    <td className="px-2 py-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                        a.status === 'released' ? 'bg-emerald-50 text-emerald-700'
                        : a.status === 'completed' ? 'bg-blue-50 text-blue-700'
                        : 'bg-sand text-stone'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-stone">{a.variant}</td>
                    <td className="px-2 py-2 text-right">
                      {a.status === 'pending' && (
                        <button
                          onClick={() => release([a.id])}
                          className="text-[11px] text-terracotta hover:underline mr-3"
                        >
                          release
                        </button>
                      )}
                      <button
                        onClick={() => deleteAssignment(a.id)}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
