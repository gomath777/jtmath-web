'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Season {
  id: string;
  title: string;
  subject_slug: string | null;
  schedule_pattern: string | null;
  start_date: string;
  description: string | null;
  active_pages: number;
  enrolled_students: number;
}

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

export default function SeasonsClient({ seasons }: { seasons: Season[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('gs1');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function createSeason() {
    if (!title || !subject || !startDate) {
      setMsg({ type: 'err', text: 'title / subject / start_date 필수' });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subject_slug: subject, start_date: startDate, description }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '실패');
      setCreating(false);
      setTitle(''); setStartDate(''); setDescription('');
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-parchment py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-[12px] text-stone hover:text-terracotta">← 어드민</Link>
            <h1 className="font-serif text-[24px] text-ink mt-1">시즌 관리</h1>
            <p className="text-[12px] text-stone mt-0.5">전체 {seasons.length}개 시즌</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 rounded-lg bg-terracotta text-ivory text-[13px] font-medium hover:bg-terracotta/90"
          >
            + 새 시즌
          </button>
        </header>

        {msg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-[13px] ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        {creating && (
          <div className="bg-ivory border border-border-cream rounded-2xl p-5 mb-6">
            <h2 className="font-serif text-[18px] text-ink mb-4">새 시즌 만들기</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] tracking-wider uppercase text-stone font-medium mb-1">시즌 이름</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="공수1 중간기말 전반전 델타1"
                  className="w-full border border-border-cream rounded-lg px-3 py-2 text-[13px] bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] tracking-wider uppercase text-stone font-medium mb-1">과목</label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full border border-border-cream rounded-lg px-3 py-2 text-[13px] bg-white"
                >
                  {Object.entries(SUBJECT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v} ({k})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] tracking-wider uppercase text-stone font-medium mb-1">시작 날짜</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full border border-border-cream rounded-lg px-3 py-2 text-[13px] bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] tracking-wider uppercase text-stone font-medium mb-1">설명 (선택)</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border border-border-cream rounded-lg px-3 py-2 text-[13px] bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreating(false)} className="px-3 py-1.5 text-[13px] text-stone">취소</button>
              <button
                onClick={createSeason}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-terracotta text-ivory text-[13px] font-medium disabled:opacity-40"
              >
                {busy ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {seasons.length === 0 ? (
            <p className="text-center text-stone py-12 text-[14px]">시즌이 없습니다. 위 "새 시즌" 버튼으로 시작하세요.</p>
          ) : (
            seasons.map(s => (
              <Link
                key={s.id}
                href={`/admin/seasons/${s.id}`}
                className="block bg-ivory border border-border-cream rounded-xl px-5 py-4 hover:bg-white hover:shadow-ring-warm transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-1">
                      {SUBJECT_LABEL[s.subject_slug || ''] || s.subject_slug || '-'} · {s.start_date}
                    </p>
                    <h3 className="font-serif text-[17px] text-ink tracking-tight">{s.title}</h3>
                    {s.description && (
                      <p className="text-[12px] text-stone mt-1">{s.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 text-[12px] text-stone">
                    <div>페이지 {s.active_pages}개</div>
                    <div>학생 {s.enrolled_students}명</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
