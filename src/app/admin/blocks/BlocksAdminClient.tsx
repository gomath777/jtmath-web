'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Loader2, Wrench, PanelRight, PanelRightClose } from 'lucide-react';
import SessionCalendarView from '@/app/s/[slug]/SessionCalendarView';

interface CalendarSessionEntry {
  id: string;
  subject_slug: string;
  subject_label: string;
  week_number: number;
  session_number: number;
  label: string | null;
  publishDate: string | null;
  is_released: boolean;
}

interface CalendarConceptItem {
  id: string;
  title: string;
  subject_slug: string;
  subject_label: string;
  publishDate: string | null;
}

interface Student {
  slug: string;
  profileId: string;
  name: string;
  school: string;
  grade: number | null;
  sessions: CalendarSessionEntry[];
  concepts: CalendarConceptItem[];
}

interface ToolCallLog { name: string; input: unknown; result: string; }
interface UiMessage { role: 'user' | 'assistant'; content: string | object[]; }
type Turn = { role: 'user'; text: string } | { role: 'assistant'; text: string; toolCalls: ToolCallLog[] };

function gradeLabel(g: number | null): string {
  if (g === 1) return '고1';
  if (g === 2) return '고2';
  if (g === 3) return '고3 / N수';
  return '학년 미지정';
}

const SUGGESTIONS = [
  '학생 전체 명단',
  '송승원 캘린더 보여줘',
  '공통수학1 기출 블럭 목록',
  '5/7 카톡 메시지 만들어줘',
];

function ChatSidebar({ apiPath }: { apiPath: string }) {
  const [history, setHistory] = useState<UiMessage[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setInput('');
    const newHistory: UiMessage[] = [...history, { role: 'user', content: trimmed }];
    setHistory(newHistory);
    setTurns(prev => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` })); throw new Error(e.error || `HTTP ${res.status}`); }
      const data = await res.json();
      setHistory(prev => [...prev, { role: 'assistant', content: data.assistantContent || data.text }]);
      setTurns(prev => [...prev, { role: 'assistant', text: data.text || '', toolCalls: data.toolCalls || [] }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setHistory(prev => prev.slice(0, -1));
      setTurns(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const renderText = (text: string) => text.split('\n').map((line, i) => (
    <p key={i} className="leading-relaxed">{line || ' '}</p>
  ));

  return (
    <div className="flex flex-col h-full">
      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {turns.length === 0 && (
          <div className="space-y-3 pt-4">
            <p className="text-xs text-slate-400 text-center">블럭 배정/릴리즈/카톡 명령</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-[11px] px-2 py-1 bg-white border border-slate-200 rounded-full text-slate-600 hover:bg-slate-100">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((turn, i) => {
          if (turn.role === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] bg-slate-900 text-white px-3 py-2 rounded-xl rounded-tr-sm text-xs">
                  {renderText(turn.text)}
                </div>
              </div>
            );
          }
          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-[92%] space-y-1.5">
                {turn.toolCalls.map((tc, j) => (
                  <details key={j} className="bg-slate-100 border border-slate-200 rounded-lg text-[10px]">
                    <summary className="px-2 py-1 cursor-pointer flex items-center gap-1 text-slate-600 select-none">
                      <Wrench className="w-3 h-3" />
                      <span className="font-mono font-semibold">{tc.name}</span>
                    </summary>
                    <div className="px-2 py-1.5 border-t border-slate-200 font-mono text-[10px] whitespace-pre-wrap break-all text-slate-700">
                      {tc.result.length > 300 ? tc.result.slice(0, 300) + '…' : tc.result}
                    </div>
                  </details>
                ))}
                {turn.text && (
                  <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl rounded-tl-sm text-xs text-slate-900">
                    {renderText(turn.text)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-500 inline-flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> 생각 중...
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] px-2 py-1.5 rounded-lg">에러: {error}</div>
        )}
      </div>

      {/* input */}
      <div className="border-t border-slate-200 bg-white p-2 flex gap-1.5 items-end shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="명령 입력..."
          rows={1}
          disabled={loading}
          className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-900 resize-none max-h-24 focus:outline-none focus:border-slate-500"
          style={{ minHeight: 34 }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:bg-slate-300"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

export default function BlocksAdminClient({ students }: { students: Student[] }) {
  const [chatOpen, setChatOpen] = useState(true);

  const groups: Array<{ grade: number | null; students: Student[] }> = [];
  for (const s of students) {
    const last = groups[groups.length - 1];
    if (last && last.grade === s.grade) last.students.push(s);
    else groups.push({ grade: s.grade, students: [s] });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      {/* ── 좌측: 캘린더 ── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-[#F8F9FA] border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-700">← 어드민</Link>
            <h1 className="text-base font-bold text-slate-900">학습 블럭 어드민</h1>
            <span className="text-xs text-slate-400">{students.length}명</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/calendars" className="text-xs text-slate-400 hover:text-slate-700">구 캘린더</Link>
            <button
              onClick={() => setChatOpen(o => !o)}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600"
              title="챗 사이드바"
            >
              {chatOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="px-5 py-5 space-y-8">
          {groups.map(g => (
            <div key={g.grade ?? 'none'}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-slate-700">{gradeLabel(g.grade)}</h2>
                <span className="text-xs text-slate-400">{g.students.length}명</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="space-y-4">
                {g.students.map(s => (
                  <section key={s.profileId} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-sm text-slate-900">{s.name}</span>
                        {s.school && <span className="text-xs text-slate-400 ml-2">{s.school}</span>}
                        <span className="text-xs text-slate-400 ml-2">
                          세션 {s.sessions.length} · 개념 {s.concepts.length}
                        </span>
                      </div>
                      <Link href={`/s/${s.slug}`} target="_blank" className="text-xs text-red-500 hover:underline">학생 페이지 ↗</Link>
                    </div>
                    {s.sessions.length === 0 && s.concepts.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">배정 없음</p>
                    ) : (
                      <SessionCalendarView
                        mode="master"
                        sessions={s.sessions}
                        conceptItems={s.concepts}
                        slug={s.slug}
                        basePath="/s"
                        previewBase="/api/admin/preview"
                      />
                    )}
                  </section>
                ))}
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400">등록된 학생 없음</div>
          )}
        </div>
      </div>

      {/* ── 우측: 챗 사이드바 ── */}
      {chatOpen && (
        <div className="w-80 shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-700">블럭 AI 비서</span>
            <span className="text-[10px] text-slate-400 font-mono">haiku-4-5</span>
          </div>
          <div className="flex-1 min-h-0">
            <ChatSidebar apiPath="/api/admin/blocks/chat" />
          </div>
        </div>
      )}
    </div>
  );
}
