import { z } from 'zod';

const allowedPdfHost = 'mathgo-pdfs.b-cdn.net';
const sourceUrlSchema = z.string().min(1);

export function parseAllowedPdfUrl(rawUrl: string | null): URL | null {
  const parsedInput = sourceUrlSchema.safeParse(rawUrl);
  if (!parsedInput.success) return null;

  let url: URL;
  try {
    url = new URL(parsedInput.data);
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }

  return isAllowedPdfUrl(url) ? url : null;
}

export function isAllowedPdfUrl(url: URL): boolean {
  const pathname = decodePathname(url.pathname);
  return (
    pathname !== null &&
    url.protocol === 'https:' &&
    url.hostname === allowedPdfHost &&
    url.username === '' &&
    url.password === '' &&
    url.port === '' &&
    pathname.toLowerCase().endsWith('.pdf')
  );
}

export function getPdfDownloadHref(rawUrl: string): string | null {
  const url = parseAllowedPdfUrl(rawUrl);
  return url === null ? null : `/api/public/pdf-download?url=${encodeURIComponent(url.href)}`;
}

export function pdfDownloadFilename(url: URL): Readonly<{ readonly ascii: string; readonly encoded: string }> {
  const pathname = decodePathname(url.pathname);
  const segment = pathname?.split('/').filter(Boolean).at(-1) ?? 'jtmath.pdf';
  const cleaned = segment.normalize('NFC').replace(/[\u0000-\u001F\u007F-\u009F\\/]/g, '').trim() || 'jtmath.pdf';
  const ascii = cleaned.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^[_ .-]+|[_ .-]+$/g, '') || 'jtmath.pdf';
  return { ascii, encoded: encodeRfc5987(cleaned) };
}

function decodePathname(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname);
  } catch (error) {
    if (error instanceof URIError) return null;
    throw error;
  }
}

function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}
