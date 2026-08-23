const INLINE_DELIMITER = '$';
const DISPLAY_DELIMITER = '$$';
const MAX_LATEX_LENGTH = 2_000;
const BLOCKED_LATEX_COMMAND = /\\(?:href|url|includegraphics|html|htmlClass|htmlId|htmlStyle|htmlData|class|style|id|def|gdef|edef|xdef|let|futurelet|newcommand|renewcommand|catcode|openout|write|read|input|include|csname)\b/;
const LATEX_COMMAND = /\\([A-Za-z]+)/g;
const BARE_LATEX_FRAGMENT = /((?:[A-Za-z0-9()[\]{}_^+\-=.,/:|<>]+\s*)*\\(?:alpha|beta|theta|pi|sin|cos|tan|cot|sec|csc|log|ln|sqrt|d?frac|cdot|times|pm|leq?|geq?|neq|approx|varnothing|text|mathrm|left|right)(?:\s*[A-Za-z0-9()[\]{}_^+\-=.,/:|<>\\]+)*)/g;
const ALLOWED_LATEX_COMMANDS = new Set([
  'alpha',
  'approx',
  'beta',
  'binom',
  'cap',
  'cdot',
  'circ',
  'cos',
  'cot',
  'csc',
  'deg',
  'Delta',
  'div',
  'dfrac',
  'frac',
  'ge',
  'geq',
  'gt',
  'in',
  'infty',
  'implies',
  'le',
  'leq',
  'left',
  'ln',
  'log',
  'lt',
  'mathrm',
  'neq',
  'notin',
  'overline',
  'pi',
  'pm',
  'right',
  'sec',
  'sin',
  'sqrt',
  'subset',
  'subseteq',
  'tan',
  'text',
  'theta',
  'to',
  'times',
  'cup',
  'varnothing',
]);

type TextToken = {
  readonly kind: 'text';
  readonly text: string;
};

export type MathToken = {
  readonly kind: 'inlineMath' | 'displayMath';
  readonly expression: string;
  readonly source: string;
};

export type TutorMathToken = TextToken | MathToken;

export type LatexClassification =
  | { readonly kind: 'renderable' }
  | { readonly kind: 'literal'; readonly reason: 'oversized' | 'blocked-command' | 'unknown-command' };

export function tokenizeTutorMathText(text: string): readonly TutorMathToken[] {
  const normalizedText = normalizeTutorMathText(text);
  const tokens: TutorMathToken[] = [];
  let cursor = 0;

  while (cursor < normalizedText.length) {
    const dollarIndex = normalizedText.indexOf(INLINE_DELIMITER, cursor);
    if (dollarIndex === -1) {
      pushTextToken(tokens, normalizedText.slice(cursor));
      break;
    }

    const isDisplay = normalizedText.startsWith(DISPLAY_DELIMITER, dollarIndex);
    const delimiter = isDisplay ? DISPLAY_DELIMITER : INLINE_DELIMITER;
    const expressionStart = dollarIndex + delimiter.length;
    const expressionEnd = normalizedText.indexOf(delimiter, expressionStart);

    if (expressionEnd === -1) {
      pushTextToken(tokens, normalizedText.slice(cursor));
      break;
    }

    pushTextToken(tokens, normalizedText.slice(cursor, dollarIndex));
    const source = normalizedText.slice(dollarIndex, expressionEnd + delimiter.length);
    tokens.push({
      kind: isDisplay ? 'displayMath' : 'inlineMath',
      expression: normalizedText.slice(expressionStart, expressionEnd),
      source,
    });
    cursor = expressionEnd + delimiter.length;
  }

  return tokens;
}

export function normalizeTutorMathText(text: string): string {
  return wrapBareLatexFragments(convertBracketDelimiters(text));
}

function convertBracketDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_source, expression: string) => `$$${expression}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_source, expression: string) => `$${expression}$`);
}

function wrapBareLatexFragments(text: string): string {
  const tokens: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const dollarIndex = text.indexOf(INLINE_DELIMITER, cursor);
    if (dollarIndex === -1) {
      tokens.push(wrapBareLatexText(text.slice(cursor)));
      break;
    }
    const isDisplay = text.startsWith(DISPLAY_DELIMITER, dollarIndex);
    const delimiter = isDisplay ? DISPLAY_DELIMITER : INLINE_DELIMITER;
    const expressionStart = dollarIndex + delimiter.length;
    const expressionEnd = text.indexOf(delimiter, expressionStart);
    if (expressionEnd === -1) {
      tokens.push(wrapBareLatexText(text.slice(cursor)));
      break;
    }
    tokens.push(wrapBareLatexText(text.slice(cursor, dollarIndex)));
    tokens.push(text.slice(dollarIndex, expressionEnd + delimiter.length));
    cursor = expressionEnd + delimiter.length;
  }

  return tokens.join('');
}

function wrapBareLatexText(text: string): string {
  BARE_LATEX_FRAGMENT.lastIndex = 0;
  return text.replace(BARE_LATEX_FRAGMENT, (source) => {
    if (!source.includes('\\')) return source;
    const leading = source.match(/^\s*/)?.[0] ?? '';
    const trailing = source.match(/\s*$/)?.[0] ?? '';
    const expression = source.trim();
    if (expression.length === 0) return source;
    return `${leading}$${expression}$${trailing}`;
  });
}

export function classifyTutorLatex(expression: string): LatexClassification {
  if (expression.length > MAX_LATEX_LENGTH) {
    return { kind: 'literal', reason: 'oversized' };
  }

  if (BLOCKED_LATEX_COMMAND.test(expression)) {
    return { kind: 'literal', reason: 'blocked-command' };
  }

  LATEX_COMMAND.lastIndex = 0;
  let match = LATEX_COMMAND.exec(expression);
  while (match !== null) {
    const command = match[1];
    if (command !== undefined && !ALLOWED_LATEX_COMMANDS.has(command)) {
      return { kind: 'literal', reason: 'unknown-command' };
    }
    match = LATEX_COMMAND.exec(expression);
  }

  return { kind: 'renderable' };
}

function pushTextToken(tokens: TutorMathToken[], text: string): void {
  if (text.length > 0) {
    tokens.push({ kind: 'text', text });
  }
}
