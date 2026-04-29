'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Loader2, Wrench, ArrowLeft, MessageSquare } from 'lucide-react';

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
  id?: string;
  tool_use_id?: string;
  content?: string;
}

interface UiMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface ToolCallLog {
  name: string;
  input: unknown;
  result: string;
}

interface AssistantTurn {
  role: 'assistant';
  text: string;
  toolCalls: ToolCallLog[];
}

const SUGGESTIONS = [
  '학생 전체 명단 보여줘',
  '송승원 학년 고2로 바꿔',
  '커리큘럼 목록',
  '김태은 카톡 메시지 만들어줘',
];

export default function AdminChatClient() {
  const [history, setHistory] = useState<UiMessage[]>([]);
  const [turns, setTurns] = useState<Array<
    { role: 'user'; text: string } | AssistantTurn
  >>([]);
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
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setHistory(prev => [...prev, { role: 'assistant', content: data.assistantContent || data.text }]);
      setTurns(prev => [...prev, {
        role: 'assistant',
        text: data.text || '',
        toolCalls: data.toolCalls || [],
      }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setHistory(prev => prev.slice(0, -1));
      setTurns(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const renderText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <p key={i} className="leading-relaxed">{line || ' '}</p>
    ));
  };

  return (
    <div className="admin-root flex flex-col h-screen bg-slate-50">
      <header className="bg-slate-900 text-white shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-base font-black flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              어드민 채팅
            </h1>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">claude-haiku-4-5</span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {turns.length === 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="text-slate-400 text-sm">
                자연어로 학생/커리큘럼 관리 명령을 내릴 수 있습니다.
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-100"
                  >
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
                  <div className="max-w-[85%] bg-slate-900 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm">
                    {renderText(turn.text)}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[90%] space-y-2">
                  {turn.toolCalls.length > 0 && (
                    <div className="space-y-1">
                      {turn.toolCalls.map((tc, j) => (
                        <details key={j} className="bg-slate-100 border border-slate-200 rounded-lg text-xs">
                          <summary className="px-3 py-1.5 cursor-pointer flex items-center gap-1.5 text-slate-600 select-none">
                            <Wrench className="w-3 h-3" />
                            <span className="font-mono font-semibold">{tc.name}</span>
                          </summary>
                          <div className="px-3 py-2 border-t border-slate-200 space-y-1 font-mono text-[11px]">
                            {Object.keys((tc.input as object) || {}).length > 0 && (
                              <div className="text-slate-500 break-all">
                                {JSON.stringify(tc.input)}
                              </div>
                            )}
                            <div className="text-slate-700 whitespace-pre-wrap break-all">
                              {tc.result.length > 400 ? tc.result.slice(0, 400) + '…' : tc.result}
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                  {turn.text && (
                    <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-slate-900">
                      {renderText(turn.text)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-slate-500 inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                생각 중...
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
              에러: {error}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto px-3 py-2 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="명령을 입력하세요..."
            rows={1}
            disabled={loading}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-2xl text-sm text-slate-900 resize-none max-h-32 focus:outline-none focus:border-slate-500"
            style={{ minHeight: 38 }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:bg-slate-300 disabled:cursor-not-allowed"
            aria-label="보내기"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
