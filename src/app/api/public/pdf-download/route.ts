import { parseAllowedPdfUrl, pdfDownloadFilename } from '../../../../lib/pdf-download';

const headersTimeoutMilliseconds = 10_000;

export type PdfFetchResponse = Readonly<{
  readonly body: ReadableStream<Uint8Array> | null;
  readonly headers: Pick<Headers, 'get'>;
  readonly status: number;
}>;

type TimeoutHandle = Readonly<{ readonly cancel: () => void }>;

type PdfDownloadDependencies = Readonly<{
  readonly fetch: (input: URL, init: RequestInit) => Promise<PdfFetchResponse>;
  readonly scheduleTimeout?: (callback: () => void, milliseconds: number) => TimeoutHandle;
}>;

export function createPdfDownloadGet(dependencies: PdfDownloadDependencies): (request: Request) => Promise<Response> {
  const scheduleTimeout = dependencies.scheduleTimeout ?? defaultScheduleTimeout;

  return async (request) => {
    const pdfUrl = parseAllowedPdfUrl(new URL(request.url).searchParams.get('url'));
    if (pdfUrl === null) return errorResponse('invalid_pdf_url', 400);

    const controller = new AbortController();
    let timedOut = false;
    const timeout = scheduleTimeout(() => {
      timedOut = true;
      controller.abort();
    }, headersTimeoutMilliseconds);

    let upstream: PdfFetchResponse;
    try {
      upstream = await dependencies.fetch(pdfUrl, {
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch {
      timeout.cancel();
      if (timedOut) return errorResponse('pdf_timeout', 504);
      return errorResponse('pdf_unavailable', 502);
    }
    timeout.cancel();

    if (!isSuccessfulPdfResponse(upstream)) return errorResponse('pdf_unavailable', 502);

    const contentType = upstream.headers.get('content-type');
    if (contentType === null) return errorResponse('pdf_unavailable', 502);
    const filename = pdfDownloadFilename(pdfUrl);
    const headers = new Headers({
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${filename.ascii}"; filename*=UTF-8''${filename.encoded}`,
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    });
    const contentLength = upstream.headers.get('content-length');
    if (isValidContentLength(contentLength)) headers.set('Content-Length', contentLength);

    return new Response(upstream.body, { headers, status: 200 });
  };
}

export const GET = createPdfDownloadGet({
  fetch: (input, init) => globalThis.fetch(input, init),
});

function defaultScheduleTimeout(callback: () => void, milliseconds: number): TimeoutHandle {
  const timeout = setTimeout(callback, milliseconds);
  return { cancel: () => clearTimeout(timeout) };
}

function errorResponse(error: 'invalid_pdf_url' | 'pdf_timeout' | 'pdf_unavailable', status: 400 | 502 | 504): Response {
  return Response.json({ error }, { status });
}

function isSuccessfulPdfResponse(response: PdfFetchResponse): boolean {
  const contentType = response.headers.get('content-type');
  return response.status >= 200 && response.status < 300 && response.body !== null && isPdfContentType(contentType);
}

function isPdfContentType(contentType: string | null): boolean {
  if (contentType === null) return false;
  const baseType = contentType.split(';', 1)[0]?.trim().toLowerCase();
  return baseType === 'application/pdf' || baseType === 'application/octet-stream';
}

function isValidContentLength(contentLength: string | null): contentLength is string {
  return contentLength !== null && /^(0|[1-9]\d*)$/.test(contentLength);
}
