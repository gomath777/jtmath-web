'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface LessonItem {
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

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

export default function LessonsClient({ items, countMap }: { items: LessonItem[]; countMap: Record<string, number> }) {
  const [subject, setSubject] = useState<string>('');
  const [search, setSearch] = useState('');

  const subjects = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.curriculum?.subject_slug) s.add(i.curriculum.subject_slug); });
    return Array.from(s);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (subject && i.curriculum?.subject_slug !== subject) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${i.label || ''} ${i.title || ''} ${i.public_slug || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, subject, search]);

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/lesson/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      const el = document.getElementById(`copied-${slug}`);
      if (el) {
        el.classList.remove('opacity-0');
        setTimeout(() => el.classList.add('opacity-0'), 1500);
      }
    });
  };

  return (
    <div className="min-h-screen bg-parchment py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-[12px] text-stone hover:text-terracotta">← 어드민</Link>
            <h1 className="font-serif text-[24px] text-ink mt-1">학습 페이지</h1>
            <p className="text-[12px] text-stone mt-0.5">전체 {items.length}개 · 필터 후 {filtered.length}개</p>
          </div>
        </header>

        <div className="bg-ivory border border-border-cream rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="border border-border-cream rounded-lg px-3 py-2 text-[13px] bg-white"
          >
            <option value="">전체 과목</option>
            {subjects.map(s => (
              <option key={s} value={s}>{SUBJECT_LABEL[s] || s}</option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="라벨 / 슬러그 검색"
            className="flex-1 min-w-[200px] border border-border-cream rounded-lg px-3 py-2 text-[13px] bg-white"
          />
        </div>

        <div className="bg-ivory border border-border-cream rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-sand border-b border-border-cream text-[11px] tracking-wider uppercase text-stone">
              <tr>
                <th className="px-4 py-3 text-left font-medium">과목</th>
                <th className="px-4 py-3 text-left font-medium">주차/차시</th>
                <th className="px-4 py-3 text-left font-medium">라벨</th>
                <th className="px-4 py-3 text-left font-medium">공개 슬러그</th>
                <th className="px-4 py-3 text-right font-medium">배정수</th>
                <th className="px-4 py-3 text-right font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-cream">
              {filtered.map(i => {
                const displayLabel = i.title || i.label;
                const subjLabel = SUBJECT_LABEL[i.curriculum?.subject_slug || ''] || i.curriculum?.subject_slug || '';
                const slug = i.public_slug;
                return (
                  <tr key={i.id} className="hover:bg-sand/50">
                    <td className="px-4 py-3 text-charcoal">{subjLabel}</td>
                    <td className="px-4 py-3 text-stone">
                      {i.week_number && i.session_number ? `${i.week_number}주 ${i.session_number}차시` : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink font-medium">{displayLabel || '—'}</td>
                    <td className="px-4 py-3">
                      {slug ? (
                        <code className="text-[12px] text-stone bg-sand px-2 py-0.5 rounded">{slug}</code>
                      ) : <span className="text-stone">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-stone">{countMap[i.id] || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2 relative">
                        {slug && (
                          <>
                            <a
                              href={`/lesson/${slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[12px] text-terracotta hover:underline"
                            >
                              미리보기
                            </a>
                            <button
                              onClick={() => copyUrl(slug)}
                              className="text-[12px] text-stone hover:text-terracotta"
                            >
                              URL 복사
                            </button>
                            <span
                              id={`copied-${slug}`}
                              className="absolute -top-7 right-0 text-[10px] bg-ink text-ivory px-2 py-0.5 rounded opacity-0 transition-opacity"
                            >
                              복사됨
                            </span>
                          </>
                        )}
                        <Link
                          href={`/admin/lessons/${i.id}`}
                          className="text-[12px] text-ink hover:underline"
                        >
                          배정 →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-stone">결과 없음</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
