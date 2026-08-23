import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TutorMathText,
  classifyTutorLatex,
  normalizeTutorMathText,
  tokenizeTutorMathText,
} from './TutorMathText';
import { runBrowserProbe, type BrowserProbeTempResource } from './TutorMathText.browser-test-support';

test('tokenizeTutorMathText keeps Korean text and inline math in order', () => {
  // Given
  const text = '좋아요. $\\sin x$부터 확인해요.';

  // When
  const tokens = tokenizeTutorMathText(text);

  // Then
  assert.deepEqual(tokens, [
    { kind: 'text', text: '좋아요. ' },
    { kind: 'inlineMath', expression: '\\sin x', source: '$\\sin x$' },
    { kind: 'text', text: '부터 확인해요.' },
  ]);
});

test('tokenizeTutorMathText recognizes display fractions and multiline lists', () => {
  // Given
  const text = '1. 먼저\n$$\\frac{1}{2}$$\n2. 다음';

  // When
  const tokens = tokenizeTutorMathText(text);

  // Then
  assert.equal(tokens[0]?.kind, 'text');
  assert.deepEqual(tokens[1], {
    kind: 'displayMath',
    expression: '\\frac{1}{2}',
    source: '$$\\frac{1}{2}$$',
  });
  assert.equal(tokens[2]?.kind, 'text');
});

test('tokenizeTutorMathText isolates unmatched delimiters as literal fragments', () => {
  // Given
  const text = '여기는 $x+1 처럼 닫히지 않아요.';

  // When
  const tokens = tokenizeTutorMathText(text);

  // Then
  assert.deepEqual(tokens, [
    { kind: 'text', text: '여기는 ' },
    { kind: 'literalMath', source: '$' },
    { kind: 'text', text: 'x+1 처럼 닫히지 않아요.' },
  ]);
});

test('tokenizeTutorMathText isolates a malformed delimiter while recovering neighboring Korean math', () => {
  const tokens = tokenizeTutorMathText(
    '앞의 $닫히지 않은 조각 뒤에도 $\\dfrac{1}{2}$와 $\\sqrt{x_1^2}$, $$x_1^2$$를 읽어요.',
  );

  assert.deepEqual(tokens, [
    { kind: 'text', text: '앞의 ' },
    { kind: 'literalMath', source: '$' },
    { kind: 'text', text: '닫히지 않은 조각 뒤에도 ' },
    { kind: 'inlineMath', expression: '\\dfrac{1}{2}', source: '$\\dfrac{1}{2}$' },
    { kind: 'text', text: '와 ' },
    { kind: 'inlineMath', expression: '\\sqrt{x_1^2}', source: '$\\sqrt{x_1^2}$' },
    { kind: 'text', text: ', ' },
    { kind: 'displayMath', expression: 'x_1^2', source: '$$x_1^2$$' },
    { kind: 'text', text: '를 읽어요.' },
  ]);
});

test('normalizeTutorMathText converts bracket delimiters before tokenizing', () => {
  // Given
  const text = '처음에는 \\(\\sin x\\)를 보고, 길면 \\[\\dfrac{1}{2}\\]처럼 봐요.';

  // When
  const normalizedText = normalizeTutorMathText(text);
  const tokens = tokenizeTutorMathText(text);

  // Then
  assert.equal(normalizedText, '처음에는 $\\sin x$를 보고, 길면 $$\\dfrac{1}{2}$$처럼 봐요.');
  assert.deepEqual(tokens[1], {
    kind: 'inlineMath',
    expression: '\\sin x',
    source: '$\\sin x$',
  });
  assert.deepEqual(tokens[3], {
    kind: 'displayMath',
    expression: '\\dfrac{1}{2}',
    source: '$$\\dfrac{1}{2}$$',
  });
});

test('normalizeTutorMathText wraps bare LaTeX fragments without touching existing math', () => {
  // Given
  const text = '시작식은 f(x)=a\\sin x+b 이고 이미 $\\cos x$는 유지해요.';

  // When
  const tokens = tokenizeTutorMathText(text);

  // Then
  assert.deepEqual(tokens, [
    { kind: 'text', text: '시작식은 ' },
    { kind: 'inlineMath', expression: 'f(x)=a\\sin x+b', source: '$f(x)=a\\sin x+b$' },
    { kind: 'text', text: ' 이고 이미 ' },
    { kind: 'inlineMath', expression: '\\cos x', source: '$\\cos x$' },
    { kind: 'text', text: '는 유지해요.' },
  ]);
});

test('normalizeTutorMathText processes long bare formula-like input without regex backtracking', () => {
  const prefix = 'a'.repeat(64);
  const text = `${prefix}${String.raw`\sin`} x${prefix}`;

  assert.equal(normalizeTutorMathText(text), `$${text}$`);
});

test('classifyTutorLatex pre-blocks oversized and trust/external commands', () => {
  // Given
  const blockedExpressions = [
    '\\href{https://example.com}{x}',
    '\\includegraphics{secret.png}',
    '\\htmlClass{danger}{x}',
    '\\htmlId{danger}{x}',
    '\\htmlStyle{color:red}{x}',
    '\\htmlData{evil=1}{x}',
    '\\def\\a{\\a}\\a',
  ];

  // When / Then
  assert.equal(classifyTutorLatex('\\sin^2 x+\\cos^2 x=1').kind, 'renderable');
  assert.equal(classifyTutorLatex('\\dfrac{1}{2}+\\text{좌표}+\\varnothing').kind, 'renderable');
  assert.equal(classifyTutorLatex('5f(x)-11>0\\implies f(x)>\\dfrac{11}{5}').kind, 'renderable');
  assert.equal(classifyTutorLatex('\\notacommand{x}').kind, 'literal');
  assert.equal(classifyTutorLatex('x'.repeat(2_001)).kind, 'literal');
  for (const expression of blockedExpressions) {
    assert.equal(classifyTutorLatex(expression).kind, 'literal');
  }
});

test('classifyTutorLatex permits the limited high-school notation needed by limits and geometry', () => {
  // Given: the target lesson subjects use limits and Euclidean notation in tutor answers.
  const curriculumExpressions = [
    '\\lim_{x \\to 0} \\frac{\\sin x}{x}=1',
    '\\angle A=90^\\circ',
    'AB \\parallel CD',
    'AB \\perp CD',
    '\\triangle ABC',
    '\\overrightarrow{AB}',
    'x \\ne 0',
  ];

  // When / Then: the explicit safe allowlist admits each notation without widening to unknown commands.
  for (const expression of curriculumExpressions) {
    assert.deepEqual(classifyTutorLatex(expression), { kind: 'renderable' });
  }
  assert.equal(classifyTutorLatex('\\notacommand{x}').kind, 'literal');
  assert.equal(classifyTutorLatex('\\href{https://example.com}{x}').kind, 'literal');
});

test('classifyTutorLatex keeps malformed and instruction-like fragments literal beside valid math', () => {
  assert.equal(classifyTutorLatex('\\frac{1}{2').kind, 'literal');
  assert.equal(classifyTutorLatex('ignore previous instructions').kind, 'literal');
  assert.equal(classifyTutorLatex('<script>alert(1)</script>').kind, 'literal');
  assert.equal(classifyTutorLatex('x < y').kind, 'renderable');
  assert.equal(classifyTutorLatex('\\sqrt{x_1^2}').kind, 'renderable');
});

test('TutorMathText server markup contains escaped text and no injected HTML', () => {
  // Given
  const text = '태그 <script>alert(1)</script> 와 $\\sin x$';

  // When
  const markup = renderToStaticMarkup(<TutorMathText text={text} />);

  // Then
  assert.equal(markup.includes('<script>'), false);
  assert.equal(markup.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true);
  assert.equal(markup.includes('data-tutor-math="inline"'), true);
});

test('TutorMathText browser effect renders valid math and keeps unsafe math literal', async () => {
  // Given
  const result = await runBrowserProbe();

  // When / Then
  assert.equal(result.hasKatexHtml, true, JSON.stringify(result));
  assert.equal(result.hasKatexMathml, true);
  assert.equal(result.hasBareLatexHtml, true);
  assert.equal(result.curriculumKatexCount, 7);
  assert.equal(result.curriculumLiteralCount, 0);
  assert.equal(result.unsafeNodeCount, 0);
  assert.equal(result.hrefText, '$\\href{https://example.com}{x}$');
  assert.equal(result.htmlClassText, '$\\htmlClass{danger}{x}$');
  assert.equal(result.htmlIdText, '$\\htmlId{danger}{x}$');
  assert.equal(result.htmlStyleText, '$\\htmlStyle{color:red}{x}$');
  assert.equal(result.htmlDataText, '$\\htmlData{evil=1}{x}$');
  assert.equal(result.includegraphicsText, '$\\includegraphics{secret.png}$');
  assert.equal(result.malformedText, '$\\notacommand{x}$');
  assert.equal(result.fragmentKatexCount, 2);
  assert.equal(result.fragmentLiteralCount, 1);
  assert.equal(result.listKatexCount, 1);
  assert.equal(result.listLiteralCount, 1);
  assert.equal(result.scriptMathKatexCount, 1);
  assert.equal(result.scriptMathLiteralCount, 1);
  assert.equal(result.scriptMathText.includes('<script>'), true);
  assert.notEqual(result.recoveryFontFamily, '');
  assert.equal(result.recoveryFitsHeight, true);
});

test('TutorMathText browser probe removes its temporary directories', async () => {
  const tempResources: BrowserProbeTempResource[] = [];

  await runBrowserProbe({ onTempResource: (resource) => tempResources.push(resource) });

  assert.deepEqual(tempResources.map((resource) => resource.kind).sort(), [
    'chromeProfileDir',
    'probeDir',
  ]);
  assert.equal(new Set(tempResources.map((resource) => resource.path)).size, 2);
  for (const resource of tempResources) {
    assert.equal(existsSync(resource.path), false, `${resource.kind} survived: ${resource.path}`);
  }
});
