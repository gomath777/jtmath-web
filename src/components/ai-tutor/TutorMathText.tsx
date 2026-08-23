'use client';

import { useEffect, useMemo, useRef } from 'react';
import React from 'react';
import katex from 'katex';
import {
  classifyTutorLatex,
  tokenizeTutorMathText,
  type MathToken,
} from './TutorMathText.logic';
export {
  classifyTutorLatex,
  normalizeTutorMathText,
  tokenizeTutorMathText,
  type TutorMathToken,
} from './TutorMathText.logic';

export const KATEX_RENDER_OPTIONS = {
  trust: false,
  throwOnError: false,
  maxExpand: 100,
  maxSize: 5,
} as const;

type TutorMathTextProps = {
  readonly text: string;
};

type MathFragmentProps = {
  readonly token: MathToken;
};

export function TutorMathText({ text }: TutorMathTextProps) {
  const tokens = useMemo(() => tokenizeTutorMathText(text), [text]);

  return (
    <span className="tutor-math-text">
      {tokens.map((token, index) => {
        const key = `${index}:${token.kind}`;
        if (token.kind === 'text') {
          return <span key={key}>{token.text}</span>;
        }

        if (token.kind === 'literalMath') {
          return <span key={key} data-tutor-math="literal">{token.source}</span>;
        }

        return <MathFragment key={key} token={token} />;
      })}
    </span>
  );
}

function MathFragment({ token }: MathFragmentProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const classification = classifyTutorLatex(token.expression);

  useEffect(() => {
    const element = elementRef.current;
    if (element === null) {
      return;
    }

    try {
      katex.render(token.expression, element, {
        ...KATEX_RENDER_OPTIONS,
        displayMode: token.kind === 'displayMath',
      });
      if (element.matches('.katex-error') || element.querySelector('.katex-error') !== null) {
        element.textContent = token.source;
        element.dataset.tutorMath = 'literal';
      }
    } catch (error) {
      if (error instanceof Error) {
        element.textContent = token.source;
        element.dataset.tutorMath = 'literal';
        return;
      }
      throw error;
    }
  }, [classification.kind, token.expression, token.kind, token.source]);

  if (classification.kind === 'literal') {
    return <span data-tutor-math="literal">{token.source}</span>;
  }

  return (
    <span
      ref={elementRef}
      aria-label={token.expression}
      className={token.kind === 'displayMath' ? 'block overflow-x-auto py-2' : 'inline-block align-baseline'}
      data-tutor-math={token.kind === 'displayMath' ? 'display' : 'inline'}
    />
  );
}
