'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Season {
  id: string;
  title: string;
  subject_slug: string | null;
  schedule_pattern: string | null;
  start_date: string;
  description: string | null;
}

interface Item {
  id: string;
  week_number: number | null;
  session_number: number | null;
  label: string | null;
  title: string | null;
  unit_name: string | null;
  category: string | null;
  variant_label: string | null;
  publish_date: string | null;
  public_slug: string | null;
}

interface Student {
  id: string;
  name: string;
  school: string | null;
  grade: number | null;
}

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

const CATEGORY_LABEL: Record<string, string> = {
  gichul: '교육청 기출',
  shimhwa: '심화유형 + 누적복습',
  review: '복습 / 점검',
  concept: '개념강의',
  bonus: '보충자료',
};

export default function SeasonDetailClient({
  season,
  items,
  students,
  enrolledIds,
}: {
  season: Season;
  items: Item[];
  students: Student[];
  enrolledIds: string[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(enrolledIds));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(s => !q || s.name.toLowerCase().includes(q) || (s.school || '').toLowerCase().includes(q));
  }, [students, search]);

  // 주차별 그룹화
  const weeks = useMemo(() => {
    const map = new Map<number, Item[]>();
    items.forEach(i => {
      const w = i.week_number ?? 0;
      if (!map.has(w)) map.set(w, []);
      map.get(w)!.push(i);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [items]);

  function toggle(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function enroll() {
    const toAdd = Array.from(selected).filter(id => !enrolledIds.includes(id));
    const toRemove = enrolledIds.filter(id => !selected.has(id));
    if (toAdd.length === 0 && toRemove.length === 0) {
      setMsg({ type: 'err', text: '변경사항 없음' });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      if (toAdd.length > 0) {
        const res = await fetch(`/api/admin/seasons/${season.id}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_ids: toAdd }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || '등록 실패');
        setMsg({ type: 'ok', text: `${j.enrolled}명 등록, ${j.sla_inserted}건 SLA 자동 펼침 (페이지 ${j.eligible_pages}개 기준)` });
      }
      if (toRemove.length > 0) {
        const res = await fetch(`/api/admin/seasons/${season.id}/enroll`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_ids: toRemove, remove_sla: false }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || '해제 실패');
      }
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const subjLabel = SUBJECT_LABEL[season.subject_slug || ''] || season.subject_slug || '-';

  return (
    <div className="min-h-screen bg-parchment py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/seasons" className="text-[12px] text-stone hover:text-terracotta">← 시즌 목록</Link>
        <header className="mt-2 mb-6 pb-5 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone font-medium mb-1">
            {subjLabel} · 시작 {season.start_date}
          </p>
          <h1 className="font-serif text-[24px] text-ink">{season.title}</h1>
          {season.description && <p className="text-[13px] text-stone mt-1">{season.description}</p>}
        </header>

        {msg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-[13px] ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        {/* 페이지 트리 (미리보기) */}
        <section className="bg-ivory border border-border-cream rounded-2xl p-5 mb-6">
          <h2 className="font-serif text-[18px] text-ink mb-3">페이지 구성 ({items.length}개)</h2>
          {weeks.length === 0 ? (
            <p className="text-stone text-[13px]">아직 페이지가 없습니다. CLI <code className="bg-sand px-1 rounded">npm run admin:session</code>로 생성하세요.</p>
          ) : (
            <div className="space-y-3">
              {weeks.map(([w, list]) => {
                const unitName = list.find(i => i.unit_name)?.unit_name || '(단원명 미설정)';
                return (
                  <div key={w} className="border border-border-cream rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-sand border-b border-border-cream">
                      <span className="text-[11px] tracking-wider uppercase text-stone font-medium">{w}주차</span>
                      <span className="ml-2 font-medium text-ink">{unitName}</span>
                    </div>
                    <div className="divide-y divide-border-cream">
                      {list.map(i => (
                        <Link
                          key={i.id}
                          href={`/admin/lessons/${i.id}`}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-sand/50 text-[13px]"
                        >
                          <span className="text-stone tracking-tight w-16">
                            {i.session_number ?? '?'}차시
                          </span>
                          <span className="text-stone text-[11px] tracking-wider uppercase w-32 shrink-0">
                            {CATEGORY_LABEL[i.category || ''] || i.category || '-'}
                          </span>
                          {i.variant_label && (
                            <span className="text-[10px] uppercase bg-terracotta/10 text-terracotta px-2 py-0.5 rounded-full">
                              {i.variant_label}
                            </span>
                          )}
                          <span className="flex-1 text-ink">{i.title || i.label || '-'}</span>
                          <span className="text-[11px] text-stone">{i.publish_date || '-'}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 학생 등록 */}
        <section className="bg-ivory border border-border-cream rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-[18px] text-ink">학생 등록 ({selected.size}명 선택)</h2>
            <button
              onClick={enroll}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-terracotta text-ivory text-[13px] font-medium disabled:opacity-40 hover:bg-terracotta/90"
            >
              {busy ? '저장 중...' : '저장'}
            </button>
          </div>
          <p className="text-[12px] text-stone mb-3">
            선택 추가 → 등록 + variant 없는 페이지의 SLA 자동 펼침. 선택 해제 → 등록만 해제 (SLA는 그대로 둠).
          </p>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="학생 이름 또는 학교 검색"
            className="w-full border border-border-cream rounded-lg px-3 py-2 text-[13px] bg-white mb-3"
          />

          <div className="max-h-96 overflow-y-auto border border-border-cream rounded-lg bg-white">
            {filtered.length === 0 ? (
              <p className="text-center text-stone py-6 text-[13px]">학생 없음</p>
            ) : (
              <ul className="divide-y divide-border-cream">
                {filtered.map(s => {
                  const checked = selected.has(s.id);
                  const alreadyEnrolled = enrolledIds.includes(s.id);
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
                        {s.grade && <span className="text-[11px] text-stone ml-1">{s.grade}학년</span>}
                      </button>
                      {alreadyEnrolled && (
                        <span className="text-[10px] tracking-wider uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          등록됨
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
