import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TutorMaterialSelector, type TutorMaterialChoice } from './TutorMaterialSelector';

const materials = [
  { materialKey: 'm-1-content-pdfs-0', level: 1, label: '대표문항', fileName: '대표문항.pdf', order: 1 },
  { materialKey: 'm-1-content-pdfs-1', level: 2, label: '레벨 2', fileName: '레벨2.pdf', order: 2, sideLabel: 'A' },
] as const satisfies readonly TutorMaterialChoice[];

test('TutorMaterialSelector renders client-safe labels in source order and names the target worksheet', () => {
  const markup = renderToStaticMarkup(
    <TutorMaterialSelector materials={materials} selectedMaterialKey="m-1-content-pdfs-1" onSelect={() => undefined} />,
  );

  assert.match(markup, /질문할 학습지/);
  assert.match(markup, /현재 질문: 레벨 2 A/);
  assert.match(markup, /aria-pressed="true"/);
  assert.ok(markup.indexOf('대표문항') < markup.indexOf('레벨 2 A'));
  assert.doesNotMatch(markup, /대표문항\.pdf|pdfUrl|sourceHash|assignmentId/);
});
