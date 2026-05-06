'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Search, Check } from 'lucide-react';
import { EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import type { ExamVideoRow } from './types';

const EMBED_BASE = `https://iframe.mediadelivery.net/embed/${EXAM_LIBRARY_ID}`;

const SUBJECT_LABELS: Record<string, string> = {
  gs1: '공수1',
  gs2: '공수2',
  ds: '대수',
  ds2: '대수',
  ms1: '미적1',
  mj2: '미적2',
  ht: '확통',
  gi: '기하',
};

const SUBJECT_ALIASES: Record<string, string> = {
  공수1: 'gs1', 공통수학1: 'gs1', gs1: 'gs1',
  공수2: 'gs2', 공통수학2: 'gs2', gs2: 'gs2',
  대수: 'ds', ds: 'ds', ds2: 'ds2',
  미적1: 'ms1', 미적분1: 'ms1', ms1: 'ms1',
  미적2: 'mj2', 미적분2: 'mj2', mj2: 'mj2',
  확통: 'ht', 확률과통계: 'ht', ht: 'ht',
  기하: 'gi', gi: 'gi',
};

interface Token {
  year?: number;
  month?: number;
  grade?: number;
  problem?: number;
  subject?: string;
  text?: string;
}

function normalizeYear(n: number): number {
  if (n >= 1000) return n;
  // 2-digit year: 00~30 → 2000s, 31~99 → 1900s (heuristic)
  return n <= 30 ? 2000 + n : 1900 + n;
}

function tryCompactCode(s: string): Token | null {
  if (!/^\d{6,8}$/.test(s)) return null;
  const len = s.length;
  let yy: number, mm: number, g: number | undefined, pp: number;
  if (len === 8) {
    yy = +s.slice(0, 2); mm = +s.slice(2, 4); g = +s.slice(4, 6); pp = +s.slice(6, 8);
  } else if (len === 7) {
    yy = +s.slice(0, 2); mm = +s.slice(2, 4); g = +s.slice(4, 5); pp = +s.slice(5, 7);
  } else {
    yy = +s.slice(0, 2); mm = +s.slice(2, 4); pp = +s.slice(4, 6);
  }
  if (mm < 1 || mm > 12) return null;
  if (pp < 1 || pp > 50) return null;
  if (g != null && (g < 1 || g > 3)) return null;
  return {
    year: normalizeYear(yy),
    month: mm,
    grade: g,
    problem: pp,
  };
}

function parseQuery(input: string): Token[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // 1) Try whole-input compact code first (e.g. "24100114")
  const wholeCompact = tryCompactCode(trimmed.replace(/\s+/g, ''));
  if (wholeCompact && !/[가-힣a-zA-Z]/.test(trimmed)) {
    return [wholeCompact];
  }

  const tokens: Token[] = [];
  // Split by whitespace + common separators
  const parts = trimmed.split(/[\s,，]+/).filter(Boolean);

  for (const raw of parts) {
    let part = raw.trim();
    if (!part) continue;

    // First, try compact code per part
    const compact = tryCompactCode(part);
    if (compact) { tokens.push(compact); continue; }

    // year: NN년 / NNNN년 / 'NN
    const yearM = part.match(/^'?(\d{2}|\d{4})년?$/);
    if (yearM && /년$|^'/.test(part)) {
      tokens.push({ year: normalizeYear(+yearM[1]) });
      continue;
    }

    // month: N월
    const monthM = part.match(/^(\d{1,2})월$/);
    if (monthM) {
      const m = +monthM[1];
      if (m >= 1 && m <= 12) { tokens.push({ month: m }); continue; }
    }

    // grade: 고N / N학년
    const gradeM = part.match(/^고(\d)$|^(\d)학년$/);
    if (gradeM) {
      const g = +(gradeM[1] || gradeM[2]);
      if (g >= 1 && g <= 3) { tokens.push({ grade: g }); continue; }
    }

    // problem: N번
    const probM = part.match(/^(\d{1,2})번$/);
    if (probM) {
      tokens.push({ problem: +probM[1] });
      continue;
    }

    // subject: alias
    const subj = SUBJECT_ALIASES[part];
    if (subj) { tokens.push({ subject: subj }); continue; }

    // bare year: 2-digit (24) or 4-digit (2024) — only if plausible
    if (/^\d{4}$/.test(part)) {
      const n = +part;
      if (n >= 1990 && n <= 2099) { tokens.push({ year: n }); continue; }
    }
    if (/^\d{2}$/.test(part)) {
      // ambiguous — could be year or problem. Prefer year if input has other 학년/번 already? Skip: treat as text fallback
      // Better: try as year only when paired with other date-like tokens. For simplicity, treat as text.
    }

    // fallback: free text
    tokens.push({ text: part });
  }

  return tokens;
}

function matches(row: ExamVideoRow, tokens: Token[]): boolean {
  if (tokens.length === 0) return true;
  for (const t of tokens) {
    if (t.year != null && row.year !== t.year) return false;
    if (t.month != null && row.month !== t.month) return false;
    if (t.grade != null && row.grade !== t.grade) return false;
    if (t.problem != null && row.problem !== t.problem) return false;
    if (t.subject && row.subject_slug !== t.subject) {
      // ds/ds2 are often interchangeable in user mind — accept either
      if (!(t.subject === 'ds' && row.subject_slug === 'ds2')) return false;
    }
    if (t.text) {
      const haystack = `${row.title || ''} ${row.chapter_folder || ''}`.toLowerCase();
      if (!haystack.includes(t.text.toLowerCase())) return false;
    }
  }
  return true;
}

export default function SearchClient({ initialVideos }: { initialVideos: ExamVideoRow[] }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 100);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    const tokens = parseQuery(debounced);
    return initialVideos.filter(v => matches(v, tokens));
  }, [debounced, initialVideos]);

  const tokens = useMemo(() => parseQuery(debounced), [debounced]);

  const handleCopy = async (id: string) => {
    const url = `${EMBED_BASE}/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(curr => (curr === id ? null : curr)), 1500);
    } catch {
      window.prompt('클립보드 복사 실패 — 직접 복사하세요:', url);
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            기출 해설강의 검색
          </p>
          <h1 className="font-serif text-[24px] mt-1 tracking-tight">
            영상 빠른 찾기
          </h1>
        </div>

        {/* 검색창 */}
        <div className="sticky top-0 -mx-4 px-4 pt-2 pb-3 bg-parchment z-10">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 24년 10월 고1 14번 / 24100114 / 수열"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border-cream bg-ivory text-[14px] focus:outline-none focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/20"
            />
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[11px] text-stone">
              {tokens.length > 0 && (
                <span className="text-olive">
                  파싱: {tokens.flatMap(t => {
                    const parts: string[] = [];
                    if (t.year != null) parts.push(`${t.year}년`);
                    if (t.month != null) parts.push(`${t.month}월`);
                    if (t.grade != null) parts.push(`고${t.grade}`);
                    if (t.problem != null) parts.push(`${t.problem}번`);
                    if (t.subject) parts.push(SUBJECT_LABELS[t.subject] || t.subject);
                    if (t.text) parts.push(`"${t.text}"`);
                    return parts;
                  }).join(' · ')}
                </span>
              )}
            </p>
            <p className="text-[11px] text-stone tabular-nums">
              총 {initialVideos.length}개 중 <span className="text-ink font-medium">{filtered.length}</span>개
            </p>
          </div>
        </div>

        {/* 결과 리스트 */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[13px] text-stone">검색 결과 없음</p>
          </div>
        ) : (
          <ul className="space-y-2 mt-2">
            {filtered.map((v) => {
              const subj = v.subject_slug ? (SUBJECT_LABELS[v.subject_slug] || v.subject_slug) : '?';
              const embedUrl = `${EMBED_BASE}/${v.bunny_video_id}`;
              const isCopied = copiedId === v.bunny_video_id;
              return (
                <li
                  key={v.bunny_video_id}
                  className="bg-ivory border border-border-cream rounded-xl p-3.5 flex items-start gap-3"
                >
                  <span className="inline-flex items-center justify-center min-w-[44px] h-6 px-2 rounded-md bg-terracotta/10 text-terracotta text-[11px] font-medium tracking-tight shrink-0 mt-0.5">
                    {subj}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium leading-snug text-ink truncate">
                      {v.title || '(제목 없음)'}
                    </p>
                    <p className="text-[11px] text-stone mt-0.5 truncate">
                      {[
                        v.year && `${v.year}년`,
                        v.month && `${v.month}월`,
                        v.grade && `고${v.grade}`,
                        v.problem != null && `${v.problem}번`,
                        v.chapter_folder,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-stone hover:text-terracotta hover:bg-terracotta/10 transition-colors"
                      title="새창에서 보기"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleCopy(v.bunny_video_id)}
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                        isCopied
                          ? 'bg-olive/15 text-olive'
                          : 'text-stone hover:text-terracotta hover:bg-terracotta/10'
                      }`}
                      title="링크 복사"
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
