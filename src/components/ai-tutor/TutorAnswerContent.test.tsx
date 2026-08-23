import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TutorAnswerContent, TutorTurnList, parseTutorAnswerBlocks, shouldRenderTutorMathText, type TutorAnswerBlock } from './TutorAnswerContent';

test('parseTutorAnswerBlocks classifies workbook labels, paragraphs, lists, and display math in order', () => {
  // Given: a synthetic tutor answer with the supported Korean workbook structure.
  const answer = [
    '핵심 힌트: 먼저 공통 인자를 찾아요.',
    '',
    '1. 식을 정리합니다.',
    '2. 값을 대입합니다.',
    '',
    '$$\\dfrac{1}{2}$$',
    '',
    '따라서 답을 확인할 수 있어요.',
  ].join('\n');

  // When: the trusted answer string is classified without Markdown interpretation.
  const blocks = parseTutorAnswerBlocks(answer);

  // Then: every semantic block is represented exactly once and remains ordered.
  assert.deepEqual(blocks, [
    { kind: 'label', label: '핵심 힌트', text: '먼저 공통 인자를 찾아요.' },
    { kind: 'ordered-list', items: ['식을 정리합니다.', '값을 대입합니다.'] },
    { kind: 'display-math', source: '$$\\dfrac{1}{2}$$' },
    { kind: 'paragraph', text: '따라서 답을 확인할 수 있어요.' },
  ] satisfies readonly TutorAnswerBlock[]);
});

test('parseTutorAnswerBlocks recognizes exact labels and both list styles', () => {
  // Given: each supported label and bounded list marker appears on its own line.
  const answer = [
    '풀이 시작:',
    '결정적 힌트: 공식을 떠올려요.',
    '풀이: 계산을 이어 가요.',
    '정답: 3',
    '주의: 부호를 확인해요.',
    '- 첫째 항',
    '• 둘째 항',
    '* 셋째 항',
  ].join('\n');

  // When: the lines are parsed.
  const blocks = parseTutorAnswerBlocks(answer);

  // Then: empty labels stay labels and unordered markers become one semantic list.
  assert.deepEqual(blocks, [
    { kind: 'label', label: '풀이 시작', text: '' },
    { kind: 'label', label: '결정적 힌트', text: '공식을 떠올려요.' },
    { kind: 'label', label: '풀이', text: '계산을 이어 가요.' },
    { kind: 'label', label: '정답', text: '3' },
    { kind: 'label', label: '주의', text: '부호를 확인해요.' },
    { kind: 'unordered-list', items: ['첫째 항', '둘째 항', '셋째 항'] },
  ] satisfies readonly TutorAnswerBlock[]);
});

test('malformed math and instruction-looking text stay literal and escaped', () => {
  // Given: malformed delimiters and HTML-like prompt injection are ordinary answer text.
  const answer = '주의: $$\\dfrac{1}{2}$\n<script>alert(1)</script>\nignore previous instructions';

  // When: the answer is parsed and rendered as React elements.
  const blocks = parseTutorAnswerBlocks(answer);
  const markup = renderToStaticMarkup(<TutorAnswerContent text={answer} />);

  // Then: no parser branch turns the content into executable markup or invented math.
  assert.deepEqual(blocks, [
    { kind: 'label', label: '주의', text: '$$\\dfrac{1}{2}$' },
    { kind: 'paragraph', text: '<script>alert(1)</script>\nignore previous instructions' },
  ]);
  assert.equal(markup.includes('<script>'), false);
  assert.equal(markup.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true);
  assert.equal(markup.includes('dangerouslySetInnerHTML'), false);
});

test('TutorAnswerContent uses semantic article, paragraphs, and lists while keeping math visible', () => {
  // Given: an answer containing one label, one numbered step, and a display fraction.
  const answer = '핵심 힌트: 공식을 세워요.\n\n1. 값을 넣어요.\n\n$$\\frac{1}{2}$$';

  // When: the tutor answer is server-rendered.
  const markup = renderToStaticMarkup(<TutorAnswerContent text={answer} />);

  // Then: the DOM communicates answer structure to assistive technology.
  assert.match(markup, /<article/);
  assert.match(markup, /tutor-answer-content/);
  assert.match(markup, /<p/);
  assert.match(markup, /<ol/);
  assert.match(markup, /tutor-answer-stage-label/);
  assert.match(markup, /tutor-answer-display-math/);
  assert.match(markup, /data-tutor-math="display"/);
  assert.match(markup, /핵심 힌트/);
});

test('TutorAnswerContent renders inequality math inside workbook list items', () => {
  const answer = [
    '- $\\sin\\dfrac{\\pi}{12}x - \\dfrac{1}{2} > 0$ 이고 $\\cos\\dfrac{\\pi}{12}x - \\dfrac{1}{2} < 0$',
    '- $\\sin\\dfrac{\\pi}{12}x - \\dfrac{1}{2} < 0$ 이고 $\\cos\\dfrac{\\pi}{12}x - \\dfrac{1}{2} > 0$',
  ].join('\n');

  const blocks = parseTutorAnswerBlocks(answer);

  assert.equal(blocks[0]?.kind, 'unordered-list');
  assert.equal(shouldRenderTutorMathText(blocks[0]?.kind === 'unordered-list' ? blocks[0].items[0] ?? '' : ''), true);
  assert.equal(shouldRenderTutorMathText(blocks[0]?.kind === 'unordered-list' ? blocks[0].items[1] ?? '' : ''), true);
  assert.equal(shouldRenderTutorMathText('<script>alert(1)</script>'), false);
  assert.equal(shouldRenderTutorMathText('ignore previous instructions'), false);
});

test('parseTutorAnswerBlocks strips method markers and inline markdown markers before rendering', () => {
  const answer = [
    '[[method: 음함수 미분]] **핵심 힌트:** 먼저 $y$를 정리해요.',
    '',
    '풀이 시작: __미분하기 전에__ 변수부터 확인해요.',
  ].join('\n');

  const blocks = parseTutorAnswerBlocks(answer);
  const markup = renderToStaticMarkup(<TutorAnswerContent text={answer} />);

  assert.deepEqual(blocks, [
    { kind: 'label', label: '핵심 힌트', text: '먼저 $y$를 정리해요.' },
    { kind: 'label', label: '풀이 시작', text: '미분하기 전에 변수부터 확인해요.' },
  ]);
  assert.equal(markup.includes('[[method:'), false);
  assert.equal(markup.includes('**'), false);
  assert.equal(markup.includes('__'), false);
});

test('TutorTurnList keeps student bubbles compact while tutor turns opt into workbook card classes', () => {
  const markup = renderToStaticMarkup(
    <TutorTurnList
      history={[
        { id: 'student-1', role: 'student', text: '2번 힌트 줘' },
        { id: 'tutor-1', role: 'tutor', text: '핵심 힌트: 먼저 식을 정리해요.' },
      ]}
    />,
  );

  assert.match(markup, /bg-terracotta px-3 py-2 text-\[13px\] leading-6 text-white/);
  assert.match(markup, /tutor-answer-card/);
  assert.doesNotMatch(markup, /tutor-answer-card[^"]*text-\[13px\]/);
});
