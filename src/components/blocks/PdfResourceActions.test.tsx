import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PdfResourceActions } from './PdfResourceActions';

const bunnyPdfUrl = 'https://mathgo-pdfs.b-cdn.net/materials/%ED%95%99%EC%8A%B5%EC%A7%80.pdf';
const downloadHref = '/api/public/pdf-download?url=https%3A%2F%2Fmathgo-pdfs.b-cdn.net%2Fmaterials%2F%25ED%2595%2599%25EC%258A%25B5%25EC%25A7%2580.pdf';

function anchorTags(markup: string): readonly string[] {
  return markup.match(/<a\b[^>]*>/g) ?? [];
}

test('renders exactly two descriptive PDF actions for an allowed Bunny PDF', () => {
  const name = '아주 긴 한국어 학습 자료 이름입니다.pdf';
  const markup = renderToStaticMarkup(<PdfResourceActions name={name} sourceUrl={bunnyPdfUrl} />);
  const [openAnchor, downloadAnchor] = anchorTags(markup);

  assert.equal(anchorTags(markup).length, 2);
  assert.ok(openAnchor);
  assert.ok(downloadAnchor);
  assert.ok(openAnchor.includes(`href="${bunnyPdfUrl}"`));
  assert.match(openAnchor, /target="_blank"/);
  assert.match(openAnchor, /rel="noopener noreferrer"/);
  assert.ok(openAnchor.includes(`aria-label="${name} 브라우저에서 열기"`));
  assert.ok(downloadAnchor.includes(`href="${downloadHref}"`));
  assert.doesNotMatch(downloadAnchor, /target="_blank"/);
  assert.ok(downloadAnchor.includes(`aria-label="${name} 다운로드"`));
  assert.match(markup, />열기<\/a>/);
  assert.match(markup, />다운로드<\/a>/);
  assert.match(markup, /focus-visible:ring-2/);
  assert.match(markup, /flex-wrap/);
});

test('renders no fake or actionable link for blank and unsupported sources', () => {
  for (const sourceUrl of ['', 'https://example.com/material.pdf', 'https://mathgo-pdfs.b-cdn.net/materials/not-a-pdf.txt']) {
    const markup = renderToStaticMarkup(<PdfResourceActions name="학습지.pdf" sourceUrl={sourceUrl} />);

    assert.equal(anchorTags(markup).length, 0);
    assert.doesNotMatch(markup, /href=/);
    assert.doesNotMatch(markup, /href="#"/);
  }
});
