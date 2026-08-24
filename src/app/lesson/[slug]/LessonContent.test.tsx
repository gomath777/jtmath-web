import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LessonContent from './LessonContent';
import type { WebLessonContext } from '@/lib/ai-tutor/web-lesson-context';

const tutorContext = {
  contextKey: 'ctx_test',
  lessonSlug: 'gs2-midterm-2026-w1s2-plane-line',
  subjectSlug: 'gs2',
  unit: '직선의 방정식',
  lessonTitle: '직선의 방정식 2차시',
  variant: 'default',
  materials: [
    {
      materialKey: 'material-level-42',
      level: 42,
      label: '레벨4-2',
      fileName: '직선의 방정식 레벨4-2.pdf',
      order: 1,
    },
  ],
} as const satisfies WebLessonContext;

test('LessonContent places the AI tutor directly after the lesson heading and before study blocks', () => {
  const markup = renderToStaticMarkup(
    <LessonContent
      lessonSlug="gs2-midterm-2026-w1s2-plane-line"
      heading="직선의 방정식 2차시"
      subjectLabel="공통수학2"
      subjectSlug="gs2"
      blocks={[]}
      progress={{}}
      assignedDate="2026-08-24"
      isAuthenticated
      tutorContext={tutorContext}
    />,
  );

  const headingIndex = markup.indexOf('직선의 방정식 2차시');
  const tutorIndex = markup.indexOf('AI 튜터에게 힌트 묻기');
  const worksheetIndex = markup.indexOf('아직 콘텐츠가 없습니다.');

  assert.ok(headingIndex >= 0);
  assert.ok(tutorIndex > headingIndex);
  assert.ok(worksheetIndex > tutorIndex);
});
