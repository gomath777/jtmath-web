import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PDF_HOST = 'mathgo-pdfs.b-cdn.net';

function parsePdfUrl(rawUrl: string | null): URL | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    const isAllowedHost = url.protocol === 'https:' && url.hostname === ALLOWED_PDF_HOST;
    const isPdf = decodeURIComponent(url.pathname).toLowerCase().endsWith('.pdf');
    return isAllowedHost && isPdf ? url : null;
  } catch {
    return null;
  }
}

function fallbackFilename(url: URL): string {
  const lastSegment = url.pathname.split('/').filter(Boolean).at(-1);
  if (!lastSegment) return 'jtmath.pdf';

  const decoded = decodeURIComponent(lastSegment).replace(/[\r\n"]/g, '').trim();
  return decoded || 'jtmath.pdf';
}

export async function GET(req: NextRequest): Promise<Response> {
  const pdfUrl = parsePdfUrl(req.nextUrl.searchParams.get('url'));
  if (!pdfUrl) {
    return NextResponse.json({ error: 'invalid_pdf_url' }, { status: 400 });
  }

  const upstream = await fetch(pdfUrl, { cache: 'no-store' });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'pdf_unavailable' }, { status: 502 });
  }

  const filename = fallbackFilename(pdfUrl);
  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('content-type') ?? 'application/pdf');
  headers.set(
    'Content-Disposition',
    `attachment; filename="jtmath.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );

  const contentLength = upstream.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);

  return new Response(upstream.body, { status: 200, headers });
}
