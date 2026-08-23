import 'server-only';

import { createHash } from 'node:crypto';
import type { WebLessonMaterialDescriptor } from './web-lesson-context';

export const WEB_PDF_MAX_BYTES = 5 * 1024 * 1024;
export const WEB_PDF_FETCH_DEADLINE_MS = 8_000;
export const WEB_PDF_ALLOWED_CDN_HOSTS = ['mathgo-pdfs.b-cdn.net'] as const;

const MAX_REDIRECTS = 2;
const PDF_MAGIC = new TextEncoder().encode('%PDF-');

export type LoadedWebPdfMaterial = {
  readonly bytes: Uint8Array;
  readonly mimeType: 'application/pdf';
  readonly sha256Hex: string;
  readonly coarseSizeBytes: number;
};

export type LoadWebPdfMaterialFailureReason =
  | 'disallowed_url'
  | 'http_error'
  | 'missing_body'
  | 'too_large'
  | 'invalid_mime'
  | 'invalid_magic'
  | 'redirect_limit'
  | 'timeout'
  | 'download_failed';

export type LoadWebPdfMaterialResult =
  | { readonly ok: true; readonly material: LoadedWebPdfMaterial }
  | { readonly ok: false; readonly reason: LoadWebPdfMaterialFailureReason };

export interface WebPdfFetchPort {
  fetch(url: URL, init: WebPdfFetchInit): Promise<Response>;
}

export type WebPdfFetchInit = {
  readonly signal: AbortSignal;
  readonly redirect: 'manual';
  readonly credentials: 'omit';
  readonly referrer: '';
  readonly headers: Headers;
};

export type LoadWebPdfMaterialInput = {
  readonly descriptor: WebLessonMaterialDescriptor;
  readonly fetchPort?: WebPdfFetchPort;
  readonly deadlineMs?: number;
};

export async function loadWebPdfMaterial(input: LoadWebPdfMaterialInput): Promise<LoadWebPdfMaterialResult> {
  const firstUrl = parseAllowedWebPdfUrl(input.descriptor.url);
  if (!firstUrl.ok) return firstUrl;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.deadlineMs ?? WEB_PDF_FETCH_DEADLINE_MS);
  try {
    return await fetchAllowedPdf(firstUrl.url, input.fetchPort ?? defaultFetchPort, controller.signal, 0);
  } catch (error) {
    if (isAbortError(error)) return { ok: false, reason: 'timeout' };
    if (error instanceof Error) return { ok: false, reason: 'download_failed' };
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseAllowedWebPdfUrl(rawUrl: string): { readonly ok: true; readonly url: URL } | { readonly ok: false; readonly reason: 'disallowed_url' } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch (error) {
    if (error instanceof TypeError) return { ok: false, reason: 'disallowed_url' };
    throw error;
  }
  return isAllowedWebPdfUrl(url) ? { ok: true, url } : { ok: false, reason: 'disallowed_url' };
}

async function fetchAllowedPdf(
  url: URL,
  fetchPort: WebPdfFetchPort,
  signal: AbortSignal,
  redirectCount: number,
): Promise<LoadWebPdfMaterialResult> {
  const response = await fetchPort.fetch(url, safeFetchInit(signal));
  if (isRedirectStatus(response.status)) {
    if (redirectCount >= MAX_REDIRECTS) return { ok: false, reason: 'redirect_limit' };
    const location = response.headers.get('location');
    if (location === null) return { ok: false, reason: 'http_error' };
    const nextUrl = parseRedirectUrl(location, url);
    if (!nextUrl.ok) return nextUrl;
    return fetchAllowedPdf(nextUrl.url, fetchPort, signal, redirectCount + 1);
  }
  if (!response.ok) return { ok: false, reason: 'http_error' };

  const contentLength = parseContentLength(response.headers.get('content-length'));
  if (contentLength !== null && contentLength > WEB_PDF_MAX_BYTES) return { ok: false, reason: 'too_large' };
  if (!isPdfMime(response.headers.get('content-type'))) return { ok: false, reason: 'invalid_mime' };
  if (!response.body) return { ok: false, reason: 'missing_body' };

  const bytes = await collectPdfBytes(response.body, signal);
  if (!bytes.ok) return bytes;
  if (!hasPdfMagic(bytes.bytes)) return { ok: false, reason: 'invalid_magic' };

  return {
    ok: true,
    material: {
      bytes: bytes.bytes,
      mimeType: 'application/pdf',
      sha256Hex: createHash('sha256').update(bytes.bytes).digest('hex'),
      coarseSizeBytes: coarseSize(bytes.bytes.byteLength),
    },
  };
}

function safeFetchInit(signal: AbortSignal): WebPdfFetchInit {
  return {
    signal,
    redirect: 'manual',
    credentials: 'omit',
    referrer: '',
    headers: new Headers({ accept: 'application/pdf' }),
  };
}

function parseRedirectUrl(location: string, baseUrl: URL): { readonly ok: true; readonly url: URL } | { readonly ok: false; readonly reason: 'disallowed_url' } {
  let url: URL;
  try {
    url = new URL(location, baseUrl);
  } catch (error) {
    if (error instanceof TypeError) return { ok: false, reason: 'disallowed_url' };
    throw error;
  }
  return isAllowedWebPdfUrl(url) ? { ok: true, url } : { ok: false, reason: 'disallowed_url' };
}

function isAllowedWebPdfUrl(url: URL): boolean {
  return url.protocol === 'https:' && WEB_PDF_ALLOWED_CDN_HOSTS.some((host) => url.hostname === host);
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function parseContentLength(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function isPdfMime(value: string | null): boolean {
  return value?.toLocaleLowerCase('en-US').split(';', 1)[0]?.trim() === 'application/pdf';
}

async function collectPdfBytes(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): Promise<{ readonly ok: true; readonly bytes: Uint8Array } | { readonly ok: false; readonly reason: 'too_large' }> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = body.getReader();
  while (true) {
    const next = await readWithAbort(reader, signal);
    if (next.done) break;
    total += next.value.byteLength;
    if (total > WEB_PDF_MAX_BYTES) {
      await reader.cancel();
      return { ok: false, reason: 'too_large' };
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

function readWithAbort(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (signal.aborted) return Promise.reject(new DOMException('aborted', 'AbortError'));
  return new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
    const abort = (): void => {
      void reader.cancel();
      reject(new DOMException('aborted', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    reader.read().then(
      (result) => {
        signal.removeEventListener('abort', abort);
        resolve(result);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort);
        reject(error);
      },
    );
  });
}

function hasPdfMagic(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PDF_MAGIC.byteLength) return false;
  return PDF_MAGIC.every((value, index) => bytes[index] === value);
}

function coarseSize(size: number): number {
  return Math.ceil(size / 1024) * 1024;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

const defaultFetchPort: WebPdfFetchPort = {
  fetch: async (url, init) => fetch(url, init),
};
