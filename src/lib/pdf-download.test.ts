import assert from 'node:assert/strict';
import test from 'node:test';
import { getPdfDownloadHref, isAllowedPdfUrl, parseAllowedPdfUrl } from './pdf-download';

test('Given an allowlisted uppercase PDF URL with a cache buster When it is parsed Then its complete URL is preserved', () => {
  // Given
  const rawUrl = 'https://mathgo-pdfs.b-cdn.net/worksheets/Geometry.PDF?v=20260824';

  // When
  const parsed = parseAllowedPdfUrl(rawUrl);

  // Then
  assert.equal(parsed?.href, rawUrl);
  assert.equal(getPdfDownloadHref(rawUrl), `/api/public/pdf-download?url=${encodeURIComponent(rawUrl)}`);
});

test('Given malformed or unsafe source URLs When they are parsed Then every URL is rejected fail closed', () => {
  // Given
  const unsafeUrls = [
    '',
    'not a URL',
    'http://mathgo-pdfs.b-cdn.net/a.pdf',
    'https://user:password@mathgo-pdfs.b-cdn.net/a.pdf',
    'https://mathgo-pdfs.b-cdn.net:8443/a.pdf',
    'https://cdn.mathgo-pdfs.b-cdn.net/a.pdf',
    'https://mathgo-pdfs.b-cdn.net.evil.invalid/a.pdf',
    'https://mathgo-pdfs.b-cdn.net/a.txt',
    'https://mathgo-pdfs.b-cdn.net/a%2Etxt',
    'https://mathgo-pdfs.b-cdn.net/a%2Epdf%2Fnot-a-pdf',
  ];

  // When / Then
  for (const rawUrl of unsafeUrls) {
    assert.equal(parseAllowedPdfUrl(rawUrl), null, rawUrl);
    assert.equal(getPdfDownloadHref(rawUrl), null, rawUrl);
  }
});

test('Given a possible redirect destination When it is outside the exact allowlist Then redirect revalidation rejects it', () => {
  // Given
  const redirectLocation = new URL('https://mathgo-pdfs.b-cdn.net.evil.invalid/redirect.pdf');

  // When
  const allowed = isAllowedPdfUrl(redirectLocation);

  // Then
  assert.equal(allowed, false);
});
