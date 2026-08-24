import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ContentGroupBlock from './ContentGroupBlock';

const bunnyPdfUrl = 'https://mathgo-pdfs.b-cdn.net/qa/content-group.pdf';

function renderContent(content: Record<string, unknown>, progress = {}): string {
  return renderToStaticMarkup(
    <ContentGroupBlock content={content} progress={progress} subjectSlug="test" />,
  );
}

type ExpectedResource = Readonly<{
  readonly name: string;
  readonly sourceUrl: string;
}>;

type ContentGroupActionCase = Readonly<{
  readonly name: string;
  readonly content: Record<string, unknown>;
  readonly expectedResources: readonly ExpectedResource[];
}>;

type StaticAnchor = Readonly<{
  readonly attributes: string;
  readonly contents: string;
}>;

function staticAnchors(markup: string): readonly StaticAnchor[] {
  return Array.from(markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g), ([, attributes, contents]) => ({
    attributes,
    contents,
  }));
}

function attributeValue(attributes: string, name: string): string | null {
  return new RegExp(`${name}="([^"]*)"`).exec(attributes)?.[1] ?? null;
}

const resourceOne = 'https://mathgo-pdfs.b-cdn.net/qa/content-group-one.pdf';
const resourceTwo = 'https://mathgo-pdfs.b-cdn.net/qa/content-group-two.pdf';
const resourceThree = 'https://mathgo-pdfs.b-cdn.net/qa/content-group-three.pdf';
const resourceFour = 'https://mathgo-pdfs.b-cdn.net/qa/content-group-four.pdf';

const contentGroupActionCases = [
  {
    name: 'Concept single PDF',
    content: {
      label: '개념 학습',
      page_range: '12~15쪽',
      pdf: { url: resourceOne, original_name: '개념 단일 학습지.pdf' },
    },
    expectedResources: [{ name: '개념 단일 학습지.pdf', sourceUrl: resourceOne }],
  },
  {
    name: 'Concept multiple PDFs',
    content: {
      label: '개념 학습',
      page_range: '12~15쪽',
      pdfs: [
        { url: resourceOne, original_name: '개념 첫 학습지.pdf' },
        { url: resourceTwo, original_name: '개념 둘째 학습지.pdf' },
      ],
    },
    expectedResources: [
      { name: '개념 첫 학습지.pdf', sourceUrl: resourceOne },
      { name: '개념 둘째 학습지.pdf', sourceUrl: resourceTwo },
    ],
  },
  {
    name: 'Side A/B PDFs plus both hintbooks',
    content: {
      label: '심화유형 1단계',
      side_a: {
        label: 'A',
        pdf: { url: resourceOne, original_name: 'A 학습지.pdf' },
        hintbook: { url: resourceTwo, original_name: 'A 힌트북.pdf' },
      },
      side_b: {
        label: 'B',
        pdf: { url: resourceThree, original_name: 'B 학습지.pdf' },
        hintbook: { url: resourceFour, original_name: 'B 힌트북.pdf' },
      },
    },
    expectedResources: [
      { name: 'A 학습지.pdf', sourceUrl: resourceOne },
      { name: 'A 힌트북.pdf', sourceUrl: resourceTwo },
      { name: 'B 학습지.pdf', sourceUrl: resourceThree },
      { name: 'B 힌트북.pdf', sourceUrl: resourceFour },
    ],
  },
  {
    name: 'Bonus PDF plus hintbook',
    content: {
      label: '보충 학습',
      is_bonus: true,
      pdf: { url: resourceOne, original_name: '보충 학습지.pdf' },
      hintbook: { url: resourceTwo, original_name: '보충 힌트북.pdf' },
    },
    expectedResources: [
      { name: '보충 학습지.pdf', sourceUrl: resourceOne },
      { name: '보충 힌트북.pdf', sourceUrl: resourceTwo },
    ],
  },
  {
    name: 'Gichul single PDF plus hintbook',
    content: {
      label: '레벨4 기출',
      pdf: { url: resourceOne, original_name: '기출 단일 문제지.pdf' },
      hintbook: { url: resourceTwo, original_name: '기출 단일 힌트북.pdf' },
    },
    expectedResources: [
      { name: '기출 단일 문제지.pdf', sourceUrl: resourceOne },
      { name: '기출 단일 힌트북.pdf', sourceUrl: resourceTwo },
    ],
  },
  {
    name: 'Gichul multiple PDFs plus hintbook',
    content: {
      label: '레벨5 기출',
      pdfs: [
        { url: resourceOne, original_name: '기출 첫 문제지.pdf' },
        { url: resourceTwo, original_name: '기출 둘째 문제지.pdf' },
      ],
      hintbook: { url: resourceThree, original_name: '기출 다중 힌트북.pdf' },
    },
    expectedResources: [
      { name: '기출 첫 문제지.pdf', sourceUrl: resourceOne },
      { name: '기출 둘째 문제지.pdf', sourceUrl: resourceTwo },
      { name: '기출 다중 힌트북.pdf', sourceUrl: resourceThree },
    ],
  },
] as const satisfies readonly ContentGroupActionCase[];

test('Given each existing lesson content-group layout, When it is statically rendered, Then its metadata, side labels, order, and card styling remain characterized', () => {
  const conceptMarkup = renderContent({
    label: '개념 학습',
    page_range: '12~15쪽',
    pdf: { url: bunnyPdfUrl, original_name: '개념 학습지.pdf', file_size: '1 MB' },
  });
  const sideMarkup = renderContent({
    label: '심화유형 1단계',
    side_a: {
      label: 'A',
      pdf: { url: bunnyPdfUrl, original_name: 'A 학습지.pdf', file_size: '1 MB' },
    },
    side_b: {
      label: 'B',
      pdf: { url: bunnyPdfUrl, original_name: 'B 학습지.pdf', file_size: '2 MB' },
    },
  });
  const bonusMarkup = renderContent({
    label: '보충 학습',
    is_bonus: true,
    pdf: { url: bunnyPdfUrl, original_name: '보충 학습지.pdf', file_size: '3 MB' },
  });
  const gichulMarkup = renderContent({
    label: '레벨4 기출',
    description: '기출 문제를 풀어 보세요.',
    pdf: { url: bunnyPdfUrl, original_name: '기출 문제지.pdf', file_size: '4 MB' },
  });

  assert.match(conceptMarkup, /학습지 받기/);
  assert.match(conceptMarkup, /개념 학습지\.pdf/);
  assert.match(conceptMarkup, /1 MB/);
  assert.match(conceptMarkup, /rounded-xl bg-sand/);
  assert.ok(sideMarkup.indexOf('>A<') < sideMarkup.indexOf('>B<'));
  assert.ok(sideMarkup.indexOf('A 학습지.pdf') < sideMarkup.indexOf('B 학습지.pdf'));
  assert.match(sideMarkup, /grid grid-cols-2/);
  assert.match(bonusMarkup, /보충 학습지/);
  assert.match(bonusMarkup, /보충 학습지\.pdf/);
  assert.match(gichulMarkup, /기출 문제를 풀어 보세요\./);
  assert.match(gichulMarkup, /기출 문제지\.pdf/);
  assert.match(gichulMarkup, /심화 문제/);
});

test('Given ordered videos and saved progress, When concept and gichul layouts render, Then their visible study-state contract remains characterized', () => {
  const conceptMarkup = renderContent(
    {
      label: '개념 학습',
      page_range: '12~15쪽',
      videos: [
        { bunny_video_id: 'later', title: '두 번째 강의', problem_number: 2, order_index: 2 },
        { bunny_video_id: 'first', title: '첫 번째 강의', problem_number: 1, order_index: 1, duration_seconds: 65 },
      ],
    },
    {
      later: { completed: false, watch_percent: 42 },
      first: { completed: true, watch_percent: 100 },
    },
  );
  const gichulMarkup = renderContent({
    label: '레벨4 기출',
    videos: [
      { bunny_video_id: 'one', title: '해설 강의', problem_number: 1, order_index: 1 },
      { bunny_video_id: 'two', title: '해설 강의', problem_number: 2, order_index: 2 },
    ],
  });
  const completedConceptMarkup = renderContent(
    {
      label: '개념 학습',
      page_range: '12~15쪽',
      videos: [{ bunny_video_id: 'complete', title: '완료 강의', problem_number: 1 }],
    },
    { complete: { completed: true, watch_percent: 100 } },
  );

  assert.ok(conceptMarkup.indexOf('1번') < conceptMarkup.indexOf('2번'));
  assert.match(conceptMarkup, /1:05/);
  assert.match(conceptMarkup, /42%/);
  assert.match(conceptMarkup, /line-through/);
  assert.match(conceptMarkup, /강의를 모두 시청한 후 진행하세요 \(1\/2\)/);
  assert.match(completedConceptMarkup, /강의를 모두 시청했습니다 ✓/);
  assert.match(gichulMarkup, /해설강의/);
  assert.match(gichulMarkup, /2개/);
});

test('Given invalid bonus content without its required PDF, When it renders, Then the existing invalid-data failure remains visible', () => {
  assert.throws(
    () => renderContent({ label: '보충 학습', is_bonus: true }),
    TypeError,
  );
});

test('Given falsy malformed PDF and video fields, When a concept block renders, Then existing fallback behavior remains', () => {
  const pdfMarkup = renderContent({ label: '개념 학습', page_range: '1쪽', pdfs: false, pdf: { url: resourceOne, original_name: '대체 학습지.pdf' } });
  const videoMarkup = renderContent({ label: '개념 학습', page_range: '1쪽', videos: false });
  assert.match(pdfMarkup, /대체 학습지\.pdf/);
  assert.match(videoMarkup, /개념서 1쪽/);
});

for (const actionCase of contentGroupActionCases) {
  test(`Given ${actionCase.name}, When ContentGroupBlock renders valid PDF resources, Then every resource exposes ordered accessible open and download actions`, () => {
    const markup = renderContent(actionCase.content);
    const anchors = staticAnchors(markup);
    const openAnchors = anchors.filter((anchor) => attributeValue(anchor.attributes, 'aria-label')?.endsWith('브라우저에서 열기'));
    const downloadAnchors = anchors.filter((anchor) => attributeValue(anchor.attributes, 'aria-label')?.endsWith('다운로드'));

    assert.equal(anchors.length, actionCase.expectedResources.length * 2);
    assert.deepEqual(
      openAnchors.map((anchor) => attributeValue(anchor.attributes, 'aria-label')),
      actionCase.expectedResources.map((resource) => `${resource.name} 브라우저에서 열기`),
    );
    assert.deepEqual(
      downloadAnchors.map((anchor) => attributeValue(anchor.attributes, 'aria-label')),
      actionCase.expectedResources.map((resource) => `${resource.name} 다운로드`),
    );
    assert.deepEqual(
      openAnchors.map((anchor) => attributeValue(anchor.attributes, 'href')),
      actionCase.expectedResources.map((resource) => resource.sourceUrl),
    );
    assert.deepEqual(
      downloadAnchors.map((anchor) => attributeValue(anchor.attributes, 'href')),
      actionCase.expectedResources.map((resource) => `/api/public/pdf-download?url=${encodeURIComponent(resource.sourceUrl)}`),
    );
    assert.ok(anchors.every((anchor) => !anchor.contents.includes('<a')));
    assert.ok(downloadAnchors.every((anchor) => !attributeValue(anchor.attributes, 'href')?.startsWith('https://mathgo-pdfs.b-cdn.net')));
  });
}
