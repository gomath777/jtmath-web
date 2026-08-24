const INLINE_DELIMITER = '$';
const DISPLAY_DELIMITER = '$$';
const MAX_LATEX_LENGTH = 2_000;
const BLOCKED_LATEX_COMMAND = /\\(?:href|url|includegraphics|html|htmlClass|htmlId|htmlStyle|htmlData|class|style|id|def|gdef|edef|xdef|let|futurelet|newcommand|renewcommand|catcode|openout|write|read|input|include|csname)\b/;
const HTML_LIKE_TAG = /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s+[^<>]*)?\/?>/u;
const LATEX_COMMAND = /\\([A-Za-z]+)/g;
const ALLOWED_LATEX_COMMANDS = new Set([
  'alpha',
  'angle',
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
  'lim',
  'ln',
  'log',
  'lt',
  'mathrm',
  'ne',
  'neq',
  'notin',
  'overrightarrow',
  'overline',
  'parallel',
  'pi',
  'pm',
  'perp',
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
  'triangle',
  'cup',
  'varnothing',
]);

type TextToken = {
  readonly kind: 'text';
  readonly text: string;
};

type LiteralMathToken = {
  readonly kind: 'literalMath';
  readonly source: string;
};

export type MathToken = {
  readonly kind: 'inlineMath' | 'displayMath';
  readonly expression: string;
  readonly source: string;
};

export type TutorMathToken = TextToken | LiteralMathToken | MathToken;

export type LatexClassification =
  | { readonly kind: 'renderable' }
  | {
    readonly kind: 'literal';
    readonly reason: 'oversized' | 'blocked-command' | 'unknown-command' | 'malformed' | 'instruction-like';
  };

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
      pushTextToken(tokens, normalizedText.slice(cursor, dollarIndex));
      pushLiteralMathToken(tokens, delimiter);
      cursor = expressionStart;
      continue;
    }

    pushTextToken(tokens, normalizedText.slice(cursor, dollarIndex));
    const source = normalizedText.slice(dollarIndex, expressionEnd + delimiter.length);
    const expression = normalizedText.slice(expressionStart, expressionEnd);
    const classification = classifyTutorLatex(expression);
    if (classification.kind === 'literal') {
      if (classification.reason === 'malformed' && isLikelyUnmatchedOpening(expression)) {
        pushLiteralMathToken(tokens, delimiter);
        cursor = expressionStart;
        continue;
      }
      pushLiteralMathToken(tokens, source);
      cursor = expressionEnd + delimiter.length;
      continue;
    }
    tokens.push({
      kind: isDisplay ? 'displayMath' : 'inlineMath',
      expression,
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
    if (expressionEnd === -1) return text;
    const classification = classifyTutorLatex(text.slice(expressionStart, expressionEnd));
    if (classification.kind === 'literal' && classification.reason === 'malformed' && isLikelyUnmatchedOpening(text.slice(expressionStart, expressionEnd))) return text;
    tokens.push(wrapBareLatexText(text.slice(cursor, dollarIndex)));
    tokens.push(text.slice(dollarIndex, expressionEnd + delimiter.length));
    cursor = expressionEnd + delimiter.length;
  }

  return tokens.join('');
}

function wrapBareLatexText(text: string): string {
  const tokens: string[] = [];
  let cursor = 0;
  let commandStart = text.indexOf('\\', cursor);

  while (commandStart !== -1) {
    const commandEnd = findLatexCommandEnd(text, commandStart);
    const command = text.slice(commandStart + 1, commandEnd);
    if (!ALLOWED_LATEX_COMMANDS.has(command)) {
      commandStart = text.indexOf('\\', commandEnd);
      continue;
    }

    const start = findBareMathStart(text, commandStart, cursor);
    const end = findBareMathEnd(text, commandEnd);
    const source = text.slice(start, end);
    const leading = source.match(/^\s*/)?.[0] ?? '';
    const trailing = source.match(/\s*$/)?.[0] ?? '';
    const expression = source.trim();
    tokens.push(text.slice(cursor, start), `${leading}$${expression}$${trailing}`);
    cursor = end;
    commandStart = text.indexOf('\\', cursor);
  }

  tokens.push(text.slice(cursor));
  return tokens.join('');
}

function findLatexCommandEnd(text: string, start: number): number {
  let end = start + 1;
  while (end < text.length && /[A-Za-z]/u.test(text[end] ?? '')) end += 1;
  return end;
}

function findBareMathStart(text: string, start: number, minimum: number): number {
  let cursor = start;
  while (cursor > minimum && isBareMathCharacter(text[cursor - 1] ?? '')) cursor -= 1;
  return cursor;
}

function findBareMathEnd(text: string, start: number): number {
  let cursor = start;
  while (cursor < text.length && isBareMathCharacter(text[cursor] ?? '')) cursor += 1;
  return cursor;
}

function isBareMathCharacter(character: string): boolean {
  return /[A-Za-z0-9()[\]{}_^+\-=.,/:|<>\\\s]/u.test(character);
}

export function classifyTutorLatex(expression: string): LatexClassification {
  if (expression.length > MAX_LATEX_LENGTH) {
    return { kind: 'literal', reason: 'oversized' };
  }

  if (BLOCKED_LATEX_COMMAND.test(expression)) {
    return { kind: 'literal', reason: 'blocked-command' };
  }

  if (isInstructionLike(expression)) {
    return { kind: 'literal', reason: 'instruction-like' };
  }

  if (HTML_LIKE_TAG.test(expression)) {
    return { kind: 'literal', reason: 'malformed' };
  }

  if (!hasBalancedLatexGroups(expression) || isPlainProse(expression)) {
    return { kind: 'literal', reason: 'malformed' };
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

function pushLiteralMathToken(tokens: TutorMathToken[], source: string): void {
  tokens.push({ kind: 'literalMath', source });
}

function isInstructionLike(expression: string): boolean {
  return /^(?:ignore|disregard)\s+previous\s+instructions$/iu.test(expression.trim());
}

function hasBalancedLatexGroups(expression: string): boolean {
  let depth = 0;
  for (const character of expression) {
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function isPlainProse(expression: string): boolean {
  const mathText = expression.replace(/\\mathrm\{([A-Z]{1,4})\}/g, '$1').replace(/\\(?:text|mathrm)\{[^}]*\}/g, '');
  return /[가-힣]/u.test(mathText) || (!/^(?:[A-Za-z]|(?!(?:AI|PDF|HTML|STOP)$)[A-Z]{2,4}|[A-Za-z](?:_(?:[A-Za-z0-9]+|\{[A-Za-z0-9]+\}))?(?:\s*,\s*[A-Za-z](?:_(?:[A-Za-z0-9]+|\{[A-Za-z0-9]+\}))?)+)$/u.test(mathText.trim()) && !/[\\0-9=+\-*/^_{}()[\]<>|]/u.test(mathText));
}

function isLikelyUnmatchedOpening(expression: string): boolean {
  return /[가-힣]/u.test(expression);
}
