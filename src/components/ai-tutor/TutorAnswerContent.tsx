'use client';

import React from 'react';
import { TutorMathText } from './TutorMathText';
import type { TutorTurn } from './AiTutorWidget.helpers';

const STAGE_LABELS = ['핵심 힌트', '풀이 시작', '결정적 힌트', '풀이', '정답', '주의'] as const;
type TutorStageLabel = (typeof STAGE_LABELS)[number];

export type TutorAnswerBlock =
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'label'; readonly label: TutorStageLabel; readonly text: string }
  | { readonly kind: 'ordered-list'; readonly items: readonly string[] }
  | { readonly kind: 'unordered-list'; readonly items: readonly string[] }
  | { readonly kind: 'display-math'; readonly source: string };

type TutorAnswerContentProps = {
  readonly text: string;
};

export function TutorTurnList({ history }: { readonly history: readonly TutorTurn[] }) {
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

type PendingLines = {
  readonly kind: 'paragraph' | 'ordered-list' | 'unordered-list';
  readonly lines: readonly string[];
};

export function parseTutorAnswerBlocks(text: string): readonly TutorAnswerBlock[] {
  const lines = normalizeTutorAnswerText(text).split('\n');
  const blocks: TutorAnswerBlock[] = [];
  let pending: PendingLines | undefined;

  const flushPending = (): void => {
    if (pending === undefined || pending.lines.length === 0) return;
    if (pending.kind === 'paragraph') {
      blocks.push({ kind: 'paragraph', text: pending.lines.join('\n') });
    } else {
      blocks.push({ kind: pending.kind, items: pending.lines });
    }
    pending = undefined;
  };

  for (const line of lines) {
    if (line.trim().length === 0) {
      flushPending();
      continue;
    }

    const label = parseLabel(line);
    if (label !== undefined) {
      flushPending();
      blocks.push(label);
      continue;
    }

    const displayMath = parseDisplayMath(line);
    if (displayMath !== undefined) {
      flushPending();
      blocks.push(displayMath);
      continue;
    }

    const listItem = parseListItem(line);
    if (listItem !== undefined) {
      if (pending?.kind !== listItem.kind) flushPending();
      pending = {
        kind: listItem.kind,
        lines: [...(pending?.lines ?? []), listItem.text],
      };
      continue;
    }

    if (pending?.kind !== 'paragraph') flushPending();
    pending = { kind: 'paragraph', lines: [...(pending?.lines ?? []), line] };
  }
  flushPending();
  return blocks;
}

function normalizeTutorAnswerText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*\[\[method:[^\]\n]*\]\]\s*/gim, '')
    .replace(/^\s*(?:hint|start|decisive_hint|solution)\s*:?\s*(?:\n|$)/i, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function parseLabel(line: string): Extract<TutorAnswerBlock, { readonly kind: 'label' }> | undefined {
  const match = /^(핵심 힌트|풀이 시작|결정적 힌트|풀이|정답|주의):(?:[ \t]+(.*))?$/.exec(line);
  if (match === null) return undefined;
  const label = match[1];
  if (!isTutorStageLabel(label)) return undefined;
  return { kind: 'label', label, text: match[2] ?? '' };
}

function isTutorStageLabel(value: string): value is TutorStageLabel {
  return (STAGE_LABELS as readonly string[]).includes(value);
}

function parseDisplayMath(line: string): Extract<TutorAnswerBlock, { readonly kind: 'display-math' }> | undefined {
  const match = /^\s*(\$\$)([^\n]*?)\1\s*$/.exec(line);
  if (match === null || match[2]?.trim().length === 0) return undefined;
  return { kind: 'display-math', source: `$$${match[2]}$$` };
}

function parseListItem(line: string):
  | { readonly kind: 'ordered-list'; readonly text: string }
  | { readonly kind: 'unordered-list'; readonly text: string }
  | undefined {
  const ordered = /^\s*\d+[.)][ \t]+(.+)$/.exec(line);
  if (ordered !== null && ordered[1] !== undefined) return { kind: 'ordered-list', text: ordered[1] };
  const unordered = /^\s*[-•*][ \t]+(.+)$/.exec(line);
  if (unordered !== null && unordered[1] !== undefined) return { kind: 'unordered-list', text: unordered[1] };
  return undefined;
}

export function TutorAnswerContent({ text }: TutorAnswerContentProps) {
  const blocks = parseTutorAnswerBlocks(text);
  return (
    <article className="tutor-answer-content">
      {blocks.map((block, index) => (
        <TutorAnswerBlockView key={`${block.kind}-${index}`} block={block} />
      ))}
    </article>
  );
}

function TutorAnswerBlockView({ block }: { readonly block: TutorAnswerBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return <p className="tutor-answer-paragraph"><SafeTutorMathText text={block.text} /></p>;
    case 'label':
      return (
        <p className="tutor-answer-label">
          <strong className="tutor-answer-stage-label">{block.label}:</strong>
          {block.text.length > 0 ? <span className="tutor-answer-label-copy"><SafeTutorMathText text={block.text} /></span> : null}
        </p>
      );
    case 'ordered-list':
      return (
        <ol className="tutor-answer-list tutor-answer-list-ordered">
          {block.items.map((item, index) => <li key={`${index}-${item}`}><SafeTutorMathText text={item} /></li>)}
        </ol>
      );
    case 'unordered-list':
      return (
        <ul className="tutor-answer-list tutor-answer-list-unordered">
          {block.items.map((item, index) => <li key={`${index}-${item}`}><SafeTutorMathText text={item} /></li>)}
        </ul>
      );
    case 'display-math':
      return <p className="tutor-answer-display-math"><TutorMathText text={block.source} /></p>;
    default:
      return assertNever(block);
  }
}

function SafeTutorMathText({ text }: { readonly text: string }) {
  return <TutorMathText text={text} />;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected tutor answer block: ${JSON.stringify(value)}`);
}
