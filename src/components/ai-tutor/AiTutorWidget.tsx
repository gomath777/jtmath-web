'use client';

import React, { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { TutorEmptyState } from './TutorEmptyState';
import { TutorAnswerContent } from './TutorAnswerContent';
import { TutorMathText } from './TutorMathText';
import { TutorMaterialSelector } from './TutorMaterialSelector';
import {
  appendTutorTurn,
  createTutorTurnId,
  handleTutorResponse,
  hasTutorMaterialSource,
  isTutorSubmitShortcut,
  parseTutorResponse,
  type TutorTurn,
} from './AiTutorWidget.helpers';
import type { WebTutorTarget } from '@/lib/ai-tutor/web-input';
import type { WebLessonContext } from '@/lib/ai-tutor/web-lesson-context';

const SUBJECT_LABELS = {
  gs2: '공통수학2',
  mj1: '미적분1',
  gh: '기하',
  ds2: '대수',
} as const satisfies Record<WebLessonContext['subjectSlug'], string>;

export type AiTutorWidgetProps = {
  readonly lessonSlug: string;
  readonly tutorContext: WebLessonContext | null;
};

export function AiTutorWidget({ lessonSlug, tutorContext }: AiTutorWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedMaterialKey, setSelectedMaterialKey] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<readonly TutorTurn[]>([]);
  const [message, setMessage] = useState('');
  const [resolvedTarget, setResolvedTarget] = useState<WebTutorTarget | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [retryCopy, setRetryCopy] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isComposingRef = useRef(false);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => void (expanded ? inputRef.current?.focus() : launcherRef.current?.focus()), [expanded]);
  useEffect(() => {
    const log = logRef.current;
    if (log !== null) log.scrollTop = log.scrollHeight;
    inputRef.current?.scrollIntoView({ block: 'nearest' });
  }, [history]);
  useEffect(() => {
    if (retryCopy === null) return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
    });
  }, [retryCopy]);

  const canSend = message.trim().length > 0 && !isSending;

  const submit = useCallback(async (rawMessage?: string) => {
    const trimmed = (rawMessage ?? message).trim();
    if (trimmed.length === 0 || isSending) return;
    if (!hasTutorMaterialSource(trimmed, tutorContext?.materials ?? [], selectedMaterialKey, resolvedTarget)) {
      setRetryCopy('질문할 학습지를 선택하거나, “레벨4-2 2번”처럼 학습지와 문제 번호를 적어 주세요.');
      inputRef.current?.focus();
      return;
    }
    const studentTurn: TutorTurn = { id: createTutorTurnId(), role: 'student', text: trimmed };
    const nextHistory = appendTutorTurn(history, studentTurn);
    setHistory(nextHistory);
    setMessage('');
    if (inputRef.current !== null) inputRef.current.value = '';
    setRetryCopy(null);
    setIsSending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch('/api/public/student/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonSlug,
          message: trimmed,
          ...(selectedMaterialKey === undefined ? {} : { selectedMaterialKey }),
        }),
        signal: controller.signal,
      });
      const body = parseTutorResponse(await response.json());
      handleTutorResponse(body, setHistory, setResolvedTarget, setRetryCopy, createTutorTurnId);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setRetryCopy('연결이 잠시 불안정합니다. 다시 시도해 주세요.');
      setHistory((current) =>
        appendTutorTurn(current, {
          id: createTutorTurnId(),
          role: 'tutor',
          text: '연결이 잠시 불안정합니다. 다시 시도해 주세요.',
        }),
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsSending(false);
      inputRef.current?.scrollIntoView({ block: 'nearest' });
      inputRef.current?.focus();
    }
  }, [history, isSending, lessonSlug, message, resolvedTarget, selectedMaterialKey, tutorContext]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isComposing = event.nativeEvent.isComposing || isComposingRef.current;
    if (isTutorSubmitShortcut(event.key, event.shiftKey, isComposing)) {
      event.preventDefault();
      const rawMessage = event.currentTarget.value;
      event.currentTarget.value = '';
      setMessage('');
      void submit(rawMessage);
    }
  };

  if (tutorContext === null || tutorContext.materials.length === 0) return null;

  const contextLabel = `${SUBJECT_LABELS[tutorContext.subjectSlug]} · ${tutorContext.unit}`;
  return (
    <section className="mb-8" aria-label="AI 튜터">
      {!expanded ? (
        <button
          ref={launcherRef}
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(true)}
          className="group flex w-full items-center justify-between rounded-2xl border border-border-warm bg-ivory px-4 py-3 text-left shadow-whisper transition duration-150 ease-out hover:border-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-parchment"
        >
          <span>
            <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <Sparkles className="h-4 w-4 text-terracotta" aria-hidden="true" />
              AI 튜터에게 힌트 묻기
            </span>
            <span className="mt-1 block text-[12px] text-olive">{contextLabel}</span>
          </span>
          <span className="rounded-full bg-sand px-3 py-1 text-[12px] font-medium text-charcoal transition group-hover:bg-terracotta group-hover:text-white">
            열기
          </span>
        </button>
      ) : (
        <div className="rounded-2xl border border-border-warm bg-ivory shadow-whisper">
          <div className="flex items-start justify-between gap-3 border-b border-border-cream px-4 py-3">
            <div><p className="flex items-center gap-2 text-[14px] font-semibold text-ink"><Sparkles className="h-4 w-4 text-terracotta" aria-hidden="true" />AI 튜터</p><p className="mt-1 text-[12px] text-olive">{contextLabel}</p></div>
            <button
              type="button"
              aria-label="AI 튜터 닫기"
              aria-expanded={expanded}
              onClick={() => setExpanded(false)}
              className="rounded-full p-2 text-stone transition hover:bg-sand hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-4 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <TutorMaterialSelector
              materials={tutorContext.materials}
              selectedMaterialKey={selectedMaterialKey}
              resolvedMaterialKey={resolvedTarget?.materialKey}
              resolvedProblemNumber={resolvedTarget?.problemNumber}
              onSelect={(materialKey) => {
                setSelectedMaterialKey(materialKey);
                setResolvedTarget(undefined);
                setRetryCopy(null);
                inputRef.current?.focus();
              }}
            />

            <div ref={logRef} className="max-h-[24dvh] space-y-3 overflow-y-auto pr-1" role="log" aria-live="polite" aria-relevant="additions text">
              {history.length === 0 ? <TutorEmptyState /> : <TutorConversationHistory history={history} />}
            </div>

            {retryCopy !== null && <p className="break-keep text-[12px] text-crimson">{retryCopy}</p>}

            <div className="bg-ivory pt-3">
              <div className="flex gap-2">
                <label className="sr-only" htmlFor="ai-tutor-message">AI 튜터 질문</label>
                <textarea
                  ref={inputRef}
                  id="ai-tutor-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={(event) => {
                    isComposingRef.current = false;
                    setMessage(event.currentTarget.value);
                  }}
                  onKeyDown={onKeyDown}
                  rows={2}
                  maxLength={500}
                  placeholder="예: 2번 힌트 줘"
                  className="min-h-12 flex-1 resize-none rounded-xl border border-border-warm bg-white px-3 py-2 text-[14px] leading-6 text-ink outline-none transition placeholder:text-stone focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
                />
                <button
                  type="button"
                  onClick={() => void submit(inputRef.current?.value)}
                  disabled={!canSend}
                  aria-label="AI 튜터 질문 보내기"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-terracotta text-white transition hover:bg-terracotta-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-stone">Enter로 보내고 Shift+Enter로 줄을 바꿀 수 있습니다.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function TutorConversationHistory({ history }: { readonly history: readonly TutorTurn[] }) {
  return (
    <>
      {history.map((turn) => (
        turn.role === 'student' ? (
          <p key={turn.id} className="ml-8 rounded-xl bg-terracotta px-3 py-2 text-[13px] leading-6 text-white">
            <TutorMathText text={turn.text} />
          </p>
        ) : (
          <div key={turn.id} className="tutor-answer-card rounded-xl bg-parchment text-charcoal">
            <TutorAnswerContent text={turn.text} />
          </div>
        )
      ))}
    </>
  );
}
