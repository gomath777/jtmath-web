import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiTutorWidget, TutorConversationHistory } from './AiTutorWidget';
import { TutorEmptyState } from './TutorEmptyState';
import { appendTutorTurn, createTutorTurnId, handleTutorResponse, hasTutorMaterialSource, isTutorSubmitShortcut, parseTutorResponse, type TutorTurn } from './AiTutorWidget.helpers';
import type { WebLessonContext } from '@/lib/ai-tutor/web-lesson-context';

const tutorContext = {
  contextKey: 'ctx_test',
  lessonSlug: 'gs2-midterm-2026-w1s2-plane-line',
  subjectSlug: 'gs2',
  unit: '직선의 방정식',
  lessonTitle: '직선의 방정식',
  variant: 'default',
  materials: [
    { materialKey: 'm-1-content-pdf', level: 42, label: '레벨4-2', fileName: '직선의 방정식 레벨4-2.pdf', order: 1 },
    { materialKey: 'm-2-content-pdf', level: 401, label: '심화유형 1단계', fileName: '직선의 방정식 심화유형 1단계.pdf', order: 2 },
  ],
} as const satisfies WebLessonContext;

test('AiTutorWidget renders nothing when the server says the lesson is not eligible', () => {
  const markup = renderToStaticMarkup(<AiTutorWidget lessonSlug="any-lesson" tutorContext={null} />);

  assert.equal(markup, '');
});

test('AiTutorWidget launcher serializes only the lesson slug and no private context', () => {
  const markup = renderToStaticMarkup(<AiTutorWidget lessonSlug="gs2-midterm-2026-w1s2-plane-line" tutorContext={tutorContext} />);

  assert.match(markup, /AI 튜터에게 힌트 묻기/);
  assert.match(markup, /공통수학2 · 직선의 방정식/);
  assert.doesNotMatch(markup, /직선의 방정식 레벨4-2.pdf/);
  assert.doesNotMatch(markup, /pdfUrl|profileId|assignmentId|cdn_url|student-token|provider|prompt/);
});

test('AiTutorWidget baseline keeps tutor and student turns in compact paragraph bubbles', () => {
  // Given: the unchanged widget server surface has no conversation history yet.
  // When: it renders its expanded conversation log shell.
  const markup = renderToStaticMarkup(<AiTutorWidget lessonSlug="gs2-midterm-2026-w1s2-plane-line" tutorContext={tutorContext} />);

  // Then: the launcher remains a compact, accessible entry point with no rich-answer markup.
  assert.match(markup, /AI 튜터에게 힌트 묻기/);
  assert.match(markup, /aria-label="AI 튜터"/);
  assert.doesNotMatch(markup, /<article|<ol|<ul/);
});

test('TutorEmptyState preserves the initial hint guidance contract', () => {
  const markup = renderToStaticMarkup(<TutorEmptyState />);

  assert.match(markup, /문제 번호와 원하는 도움을 짧게 적어 주세요/);
  assert.match(markup, /정답보다 힌트부터 차근히 도와줄게요/);
  assert.match(markup, /rounded-xl/);
});

test('appendTutorTurn caps the volatile log at six turns', () => {
  const turns = Array.from({ length: 8 }, (_, index) => ({
    id: `turn-${index}`,
    role: index % 2 === 0 ? 'student' as const : 'tutor' as const,
    text: `turn ${index}`,
  })).reduce((history, turn) => appendTutorTurn(history, turn), [] as ReturnType<typeof appendTutorTurn>);

  assert.equal(turns.length, 6);
  assert.equal(turns[0]?.id, 'turn-2');
  assert.equal(turns[5]?.id, 'turn-7');
});

test('isTutorSubmitShortcut keeps Enter send and Shift Enter newline distinct', () => {
  assert.equal(isTutorSubmitShortcut('Enter', false), true);
  assert.equal(isTutorSubmitShortcut('Enter', true), false);
  assert.equal(isTutorSubmitShortcut('Enter', false, true), false);
  assert.equal(isTutorSubmitShortcut('Tab', false), false);
});

test('hasTutorMaterialSource accepts every material label, a selected worksheet, or the active target', () => {
  const labels = [
    { materialKey: 'm-1', label: '레벨1' },
    { materialKey: 'm-2', label: '레벨2' },
    { materialKey: 'm-3', label: '레벨3' },
    { materialKey: 'm-41', label: '레벨4-1' },
    { materialKey: 'm-42', label: '레벨4-2' },
    { materialKey: 'm-5', label: '레벨5' },
    { materialKey: 'm-s1', label: '심화유형 1단계' },
    { materialKey: 'm-s2', label: '심화유형 2단계' },
    { materialKey: 'm-s3', label: '심화유형 3단계' },
    { materialKey: 'm-all', label: '올스캔' },
  ] as const;

  assert.equal(hasTutorMaterialSource('2번 힌트 줘', labels), false);
  assert.equal(hasTutorMaterialSource('2번 힌트 줘', labels, 'm-2'), true);
  assert.equal(hasTutorMaterialSource('다음 단계 알려줘', labels, undefined, { contextKey: 'ds2-trigonometry-lv1-3', materialKey: 'm-3', problemNumber: 2 }), true);
  for (const material of labels) {
    assert.equal(hasTutorMaterialSource(`${material.label} 2번 힌트 줘`, labels), true);
  }
});

test('parseTutorResponse handles answered clarification and retryable responses', () => {
  assert.deepEqual(
    parseTutorResponse({
      status: 'answered',
      message: '$\\frac{1}{2}$',
      resolvedTarget: { contextKey: 'ds2-trigonometry-lv1-3', materialKey: 'm-1', problemNumber: 2 },
    }),
    {
      status: 'answered',
      message: '$\\frac{1}{2}$',
      resolvedTarget: { contextKey: 'ds2-trigonometry-lv1-3', materialKey: 'm-1', problemNumber: 2 },
    },
  );
  assert.deepEqual(parseTutorResponse({ status: 'ambiguous_material', message: '학습지를 선택해 주세요.' }), {
    status: 'ambiguous_material',
    message: '학습지를 선택해 주세요.',
  });
  assert.deepEqual(parseTutorResponse({ status: 'rate_limited', message: '잠시 후 다시 시도해 주세요.' }), {
    status: 'rate_limited',
    message: '잠시 후 다시 시도해 주세요.',
  });
  assert.deepEqual(parseTutorResponse({
    status: 'provider_unavailable',
    message: '답변 생성이 끊겼어요. 같은 문제로 다시 보내면 이어서 도와줄게요.',
    resolvedTarget: { contextKey: 'ds2-trigonometry-lv1-3', materialKey: 'm-1', problemNumber: 2 },
  }), {
    status: 'provider_unavailable',
    message: '답변 생성이 끊겼어요. 같은 문제로 다시 보내면 이어서 도와줄게요.',
    resolvedTarget: { contextKey: 'ds2-trigonometry-lv1-3', materialKey: 'm-1', problemNumber: 2 },
  });
});

test('parseTutorResponse drops visualSpec even if the server sends one', () => {
  assert.deepEqual(
    parseTutorResponse({
      status: 'answered',
      message: '그래프와 함께 볼게요.',
      resolvedTarget: { contextKey: 'ds2-trigonometry-lv41-3', materialKey: 'm-41', problemNumber: 2 },
      visualSpec: { kind: 'functionPlot' },
    }),
    {
      status: 'answered',
      message: '그래프와 함께 볼게요.',
      resolvedTarget: { contextKey: 'ds2-trigonometry-lv41-3', materialKey: 'm-41', problemNumber: 2 },
    },
  );
});

test('handleTutorResponse keeps retryable provider failures on the resolved problem target', () => {
  const targets: Array<unknown> = [];
  let history: readonly TutorTurn[] = [];
  let retryCopy: string | null = null;

  handleTutorResponse(
    {
      status: 'provider_unavailable',
      message: '답변 생성이 끊겼어요. 같은 문제로 다시 보내면 이어서 도와줄게요.',
      resolvedTarget: { contextKey: 'ds2-trigonometry-lv1-3', materialKey: 'm-1', problemNumber: 2 },
    },
    (updater) => {
      history = updater(history);
    },
    (target) => {
      targets.push(target);
    },
    (copy) => {
      retryCopy = copy;
    },
    () => 'turn-retry',
  );

  assert.deepEqual(targets, [{ contextKey: 'ds2-trigonometry-lv1-3', materialKey: 'm-1', problemNumber: 2 }]);
  assert.equal(retryCopy, '잠시 후 다시 시도해 주세요.');
  assert.equal(history.at(-1)?.text.includes('AI 답변을 잠시 사용할 수 없습니다'), false);
});

test('TutorConversationHistory has no graph card surface in the rollout widget', () => {
  const markup = renderToStaticMarkup(
    <TutorConversationHistory
      history={[
        { id: 'student-turn', role: 'student', text: '학생 질문' },
        { id: 'tutor-turn', role: 'tutor', text: '그래프 기능은 현재 꺼져 있어요.' },
      ]}
    />,
  );

  assert.match(markup, /학생 질문/);
  assert.match(markup, /그래프 기능은 현재 꺼져 있어요/);
  assert.doesNotMatch(markup, /data-graph-card=""/);
  assert.doesNotMatch(markup, /border-t border-border-cream pt-3/);
});

test('createTutorTurnId returns volatile nonempty ids for browser logs', () => {
  assert.match(createTutorTurnId(), /^[-a-zA-Z0-9]+/);
});
