import assert from 'node:assert/strict';
import test from 'node:test';
import { createPdfDownloadGet, type PdfFetchResponse } from './route';

const sourceUrl = 'https://mathgo-pdfs.b-cdn.net/worksheets/lesson.PDF?v=20260824';

test('Given an allowlisted streamed PDF When it is requested Then the route returns an attachment without buffering its body', async () => {
  // Given
  const body = streamFromChunks([new TextEncoder().encode('%PDF-first'), new TextEncoder().encode('-chunk')]);
  const get = createPdfDownloadGet({
    fetch: async (input, init) => {
      assert.equal(String(input), sourceUrl);
      assert.equal(init?.redirect, 'manual');
      assert.equal(init?.cache, 'no-store');
      return upstreamResponse(body, {
        status: 200,
        headers: { 'content-type': 'Application/PDF; charset=binary', 'content-length': '16' },
      });
    },
  });

  // When
  const response = await get(request(sourceUrl));

  // Then
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'Application/PDF; charset=binary');
  assert.equal(response.headers.get('content-length'), '16');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-disposition') ?? '', /^attachment; filename="lesson\.PDF"; filename\*=UTF-8''lesson\.PDF$/);
  assert.equal(await response.text(), '%PDF-first-chunk');
});

test('Given malformed or disallowed input When it is requested Then the route returns invalid_pdf_url before fetching', async () => {
  // Given
  let fetchCalls = 0;
  const get = createPdfDownloadGet({
    fetch: async () => {
      fetchCalls += 1;
      return upstreamResponse(null);
    },
  });
  const invalidInputs = [null, 'http://mathgo-pdfs.b-cdn.net/a.pdf', 'https://mathgo-pdfs.b-cdn.net.evil.invalid/a.pdf', 'https://mathgo-pdfs.b-cdn.net/a%2Etxt'];

  // When / Then
  for (const input of invalidInputs) {
    const response = await get(request(input));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'invalid_pdf_url' });
  }
  assert.equal(fetchCalls, 0);
});

test('Given an upstream redirect, failure, non-PDF response, or fetch error When it is requested Then the route returns pdf_unavailable', async () => {
  // Given
  const cases = [
    () => upstreamResponse(null, { status: 302, headers: { location: 'https://mathgo-pdfs.b-cdn.net.evil.invalid/a.pdf' } }),
    () => upstreamResponse(null, { status: 503 }),
    () => upstreamResponse(streamFromChunks([new TextEncoder().encode('html')]), { status: 200, headers: { 'content-type': 'text/html' } }),
    () => Promise.reject(new TypeError('connection unavailable')),
  ];

  // When / Then
  for (const upstream of cases) {
    const get = createPdfDownloadGet({ fetch: async () => upstream() });
    const response = await get(request(sourceUrl));
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: 'pdf_unavailable' });
  }
});

test('Given the header deadline expires When the upstream fetch observes abort Then the route returns pdf_timeout', async () => {
  // Given
  let abortObserved = false;
  let scheduledMilliseconds = 0;
  const get = createPdfDownloadGet({
    fetch: async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          abortObserved = true;
          reject(new DOMException('deadline exceeded', 'AbortError'));
        });
      }),
    scheduleTimeout: (callback, milliseconds) => {
      scheduledMilliseconds = milliseconds;
      queueMicrotask(callback);
      return { cancel: () => undefined };
    },
  });

  // When
  const response = await get(request(sourceUrl));

  // Then
  assert.equal(scheduledMilliseconds, 10_000);
  assert.equal(abortObserved, true);
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), { error: 'pdf_timeout' });
});

test('Given hostile filename characters and an invalid content length When an octet-stream PDF is requested Then attachment headers are safe', async () => {
  // Given
  const hostileUrl = 'https://mathgo-pdfs.b-cdn.net/%0D%0Ainjected%22.pdf';
  const get = createPdfDownloadGet({
    fetch: async () => upstreamResponse(streamFromChunks([new Uint8Array([1])]), {
      status: 200,
      headers: { 'content-type': 'application/octet-stream; charset=binary', 'content-length': '1\r\nX-Injected: yes' },
    }),
  });

  // When
  const response = await get(request(hostileUrl));

  // Then
  const disposition = response.headers.get('content-disposition') ?? '';
  assert.equal(response.status, 200);
  assert.equal(disposition, `attachment; filename="injected_.pdf"; filename*=UTF-8''injected%22.pdf`);
  assert.doesNotMatch(disposition, /[\r\n]/);
  assert.equal(response.headers.get('content-length'), null);
});

test('Given a large upstream-only ReadableStream When it is returned Then the route preserves its streamed first chunk', async () => {
  // Given
  const body = streamFromChunks([new Uint8Array(1024 * 1024), new Uint8Array([37, 80, 68, 70])]);
  const get = createPdfDownloadGet({
    fetch: async () => upstreamResponse(body, { headers: { 'content-type': 'application/pdf' } }),
  });

  // When
  const response = await get(request(sourceUrl));

  // Then
  const reader = response.body?.getReader();
  assert.notEqual(reader, undefined);
  const firstChunk = await reader?.read();
  assert.equal(firstChunk?.value?.byteLength, 1024 * 1024);
});

function request(url: string | null): Request {
  const query = url === null ? '' : `?url=${encodeURIComponent(url)}`;
  return new Request(`https://jtmath.kr/api/public/pdf-download${query}`);
}

function streamFromChunks(chunks: readonly Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

function upstreamResponse(
  body: ReadableStream<Uint8Array> | null,
  init: Readonly<{ readonly status?: number; readonly headers?: Readonly<Record<string, string>> }> = {},
): PdfFetchResponse {
  const headers = new Map(
    Object.entries(init.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return { body, headers: { get: (name) => headers.get(name.toLowerCase()) ?? null }, status: init.status ?? 200 };
}
