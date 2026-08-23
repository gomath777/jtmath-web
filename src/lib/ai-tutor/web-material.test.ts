import assert from 'node:assert/strict';
import test from 'node:test';
import { loadWebPdfMaterial, WEB_PDF_MAX_BYTES, type WebPdfFetchPort } from './web-material';
import type { WebLessonMaterialDescriptor } from './web-lesson-context';

const allowedUrl = 'https://mathgo-pdfs.b-cdn.net/concept/ds2/trig.pdf';

test('loadWebPdfMaterial returns bytes hash and coarse metadata for a valid streaming PDF', async () => {
  // Given
  const pdf = pdfBytes(128);
  const requests: CapturedRequest[] = [];
  const fetchPort = fakeFetch([{ status: 200, headers: pdfHeaders(pdf.byteLength), body: [pdf] }], requests);

  // When
  const result = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort });

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail('Expected material load to succeed');
  assert.equal(result.material.mimeType, 'application/pdf');
  assert.equal(result.material.bytes.byteLength, pdf.byteLength);
  assert.equal(result.material.coarseSizeBytes, 1024);
  assert.equal(result.material.sha256Hex.length, 64);
  assert.equal(requests.length, 1);
});

test('loadWebPdfMaterial accepts the exact 5 MiB boundary without a Content-Length header', async () => {
  // Given
  const pdf = pdfBytes(WEB_PDF_MAX_BYTES);
  const fetchPort = fakeFetch([{ status: 200, headers: { 'content-type': 'application/pdf' }, body: chunks(pdf, 512 * 1024) }]);

  // When
  const result = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort });

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail('Expected material load to succeed');
  assert.equal(result.material.bytes.byteLength, WEB_PDF_MAX_BYTES);
});

test('loadWebPdfMaterial rejects lying or oversized Content-Length before reading the stream', async () => {
  // Given
  const fetchPort = fakeFetch([
    {
      status: 200,
      headers: pdfHeaders(WEB_PDF_MAX_BYTES + 1),
      body: streamFromGenerator(async function* () {
        yield pdfBytes(8);
      }),
    },
  ]);

  // When
  const result = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'too_large' });
});

test('loadWebPdfMaterial rejects streams that exceed the cap when length is missing', async () => {
  // Given
  const pdf = pdfBytes(WEB_PDF_MAX_BYTES + 1);
  const fetchPort = fakeFetch([{ status: 200, headers: { 'content-type': 'application/pdf' }, body: chunks(pdf, 1024 * 1024) }]);

  // When
  const result = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'too_large' });
});

test('loadWebPdfMaterial rejects streams that exceed a lying smaller Content-Length', async () => {
  // Given
  const pdf = pdfBytes(WEB_PDF_MAX_BYTES + 1);
  const fetchPort = fakeFetch([{ status: 200, headers: pdfHeaders(1), body: chunks(pdf, 1024 * 1024) }]);

  // When
  const result = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'too_large' });
});

test('loadWebPdfMaterial rejects HTML MIME invalid magic HTTP errors and timeout', async () => {
  // Given
  const htmlMime = fakeFetch([{ status: 200, headers: { 'content-type': 'text/html' }, body: [pdfBytes(8)] }]);
  const invalidMagic = fakeFetch([{ status: 200, headers: pdfHeaders(10), body: [new TextEncoder().encode('<html></html>')] }]);
  const httpError = fakeFetch([{ status: 503, headers: {}, body: [] }]);
  const timeout: WebPdfFetchPort = {
    fetch: async (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      }),
  };

  // When
  const htmlResult = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort: htmlMime });
  const magicResult = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort: invalidMagic });
  const httpResult = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort: httpError });
  const timeoutResult = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort: timeout, deadlineMs: 1 });

  // Then
  assert.deepEqual(htmlResult, { ok: false, reason: 'invalid_mime' });
  assert.deepEqual(magicResult, { ok: false, reason: 'invalid_magic' });
  assert.deepEqual(httpResult, { ok: false, reason: 'http_error' });
  assert.deepEqual(timeoutResult, { ok: false, reason: 'timeout' });
});

test('loadWebPdfMaterial times out when the response body stalls after headers', async () => {
  // Given
  const stalledAfterHeaders = fakeFetch([
    {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
      body: stalledBody(),
    },
  ]);

  // When
  const result = await loadWebPdfMaterial({
    descriptor: descriptor(allowedUrl),
    fetchPort: stalledAfterHeaders,
    deadlineMs: 10,
  });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'timeout' });
});

test('loadWebPdfMaterial validates every redirect URL and stops redirect loops', async () => {
  // Given
  const disallowedHost = fakeFetch([{ status: 302, headers: { location: 'https://evil.example.invalid/file.pdf' }, body: [] }]);
  const disallowedProtocol = fakeFetch([{ status: 302, headers: { location: 'http://mathgo-pdfs.b-cdn.net/file.pdf' }, body: [] }]);
  const loopback = fakeFetch([{ status: 302, headers: { location: 'https://127.0.0.1/file.pdf' }, body: [] }]);
  const loop = fakeFetch([
    { status: 302, headers: { location: '/one.pdf' }, body: [] },
    { status: 302, headers: { location: '/two.pdf' }, body: [] },
    { status: 302, headers: { location: '/three.pdf' }, body: [] },
  ]);

  // When
  const hostResult = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort: disallowedHost });
  const protocolResult = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort: disallowedProtocol });
  const loopbackResult = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort: loopback });
  const loopResult = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort: loop });

  // Then
  assert.deepEqual(hostResult, { ok: false, reason: 'disallowed_url' });
  assert.deepEqual(protocolResult, { ok: false, reason: 'disallowed_url' });
  assert.deepEqual(loopbackResult, { ok: false, reason: 'disallowed_url' });
  assert.deepEqual(loopResult, { ok: false, reason: 'redirect_limit' });
});

test('loadWebPdfMaterial sends no credential headers and follows allowed redirects manually', async () => {
  // Given
  const requests: CapturedRequest[] = [];
  const pdf = pdfBytes(16);
  const fetchPort = fakeFetch(
    [
      { status: 302, headers: { location: '/next.pdf' }, body: [] },
      { status: 200, headers: pdfHeaders(pdf.byteLength), body: [pdf] },
    ],
    requests,
  );

  // When
  const result = await loadWebPdfMaterial({ descriptor: descriptor(allowedUrl), fetchPort });

  // Then
  assert.equal(result.ok, true);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.credentials, 'omit');
    assert.equal(request.redirect, 'manual');
    assert.equal(request.referrer, '');
    assert.equal(request.headers.has('cookie'), false);
    assert.equal(request.headers.has('authorization'), false);
  }
});

type CapturedRequest = {
  readonly url: string;
  readonly headers: Headers;
  readonly credentials: RequestCredentials | undefined;
  readonly redirect: RequestRedirect | undefined;
  readonly referrer: string | undefined;
};

type FakeResponse = {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: BodyInit | ReadableStream<Uint8Array> | readonly Uint8Array[];
};

function descriptor(url: string): WebLessonMaterialDescriptor {
  return { level: 1, fileName: '삼각함수 레벨1.pdf', url };
}

function pdfHeaders(length: number): Record<string, string> {
  return { 'content-type': 'application/pdf', 'content-length': String(length) };
}

function pdfBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set(new TextEncoder().encode('%PDF-'));
  return bytes;
}

function chunks(bytes: Uint8Array, size: number): readonly Uint8Array[] {
  const result: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.byteLength; offset += size) {
    result.push(bytes.slice(offset, Math.min(offset + size, bytes.byteLength)));
  }
  return result;
}

function fakeFetch(responses: readonly FakeResponse[], requests: CapturedRequest[] = []): WebPdfFetchPort {
  let index = 0;
  return {
    fetch: async (url, init) => {
      requests.push({
        url: url.toString(),
        headers: new Headers(init.headers),
        credentials: init.credentials,
        redirect: init.redirect,
        referrer: init.referrer,
      });
      const response = responses[index];
      index += 1;
      if (response === undefined) return new Response(null, { status: 500 });
      const body = isUint8ArrayList(response.body) ? streamFromChunks(response.body) : response.body;
      return new Response(body, { status: response.status, headers: response.headers });
    },
  };
}

function isUint8ArrayList(value: BodyInit | ReadableStream<Uint8Array> | readonly Uint8Array[]): value is readonly Uint8Array[] {
  return Array.isArray(value);
}

function streamFromChunks(bodyChunks: readonly Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of bodyChunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

function streamFromGenerator(generator: () => AsyncGenerator<Uint8Array>): ReadableStream<Uint8Array> {
  const iterator = generator();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await iterator.next();
      if (next.done === true) {
        controller.close();
        return;
      }
      controller.enqueue(next.value);
    },
  });
}

function stalledBody(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    pull: () => new Promise<void>(() => {}),
  });
}
