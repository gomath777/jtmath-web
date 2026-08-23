import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import PdfBlock, { HintbookBlock } from './PdfBlock';

const bunnyPdfUrl = 'https://mathgo-pdfs.b-cdn.net/materials/%ED%95%99%EC%8A%B5%EC%A7%80.pdf';
const downloadHref = '/api/public/pdf-download?url=https%3A%2F%2Fmathgo-pdfs.b-cdn.net%2Fmaterials%2F%25ED%2595%2599%25EC%258A%25B5%25EC%25A7%2580.pdf';

function anchorTags(markup: string): readonly string[] {
  return markup.match(/<a\b[^>]*>/g) ?? [];
}

test('PDF and hintbook leaves use a noninteractive card with the shared two-action pattern', () => {
  const pdfMarkup = renderToStaticMarkup(
    <PdfBlock content={{ url: bunnyPdfUrl, original_name: '개념 학습지.pdf' }} />,
  );
  const hintbookMarkup = renderToStaticMarkup(
    <HintbookBlock content={{ url: bunnyPdfUrl, original_name: '힌트북.pdf' }} />,
  );

  for (const markup of [pdfMarkup, hintbookMarkup]) {
    const [openAnchor, downloadAnchor] = anchorTags(markup);

    assert.equal(anchorTags(markup).length, 2);
    assert.ok(openAnchor);
    assert.ok(downloadAnchor);
    assert.doesNotMatch(markup, /^<a\b/);
    const firstAnchorIndex = markup.indexOf('<a');
    const firstAnchorCloseIndex = markup.indexOf('</a>', firstAnchorIndex);
    const secondAnchorIndex = markup.indexOf('<a', firstAnchorIndex + 1);

    assert.ok(firstAnchorIndex > 0);
    assert.ok(secondAnchorIndex > firstAnchorCloseIndex);
    assert.ok(openAnchor.includes(`href="${bunnyPdfUrl}"`));
    assert.match(openAnchor, /target="_blank"/);
    assert.match(openAnchor, /rel="noopener noreferrer"/);
    assert.ok(downloadAnchor.includes(`href="${downloadHref}"`));
    assert.match(markup, /focus-visible:ring-2/);
    assert.match(markup, />열기<\/a>/);
    assert.match(markup, />다운로드<\/a>/);
  }
});

test('PDF and hintbook leaves do not expose an action for invalid or empty URLs', () => {
  for (const Block of [PdfBlock, HintbookBlock]) {
    for (const sourceUrl of ['', 'https://example.com/material.pdf']) {
      const markup = renderToStaticMarkup(<Block content={{ url: sourceUrl, original_name: '학습지.pdf' }} />);

      assert.equal(anchorTags(markup).length, 0);
      assert.doesNotMatch(markup, /href=/);
      assert.doesNotMatch(markup, /href="#"/);
    }
  }
});
