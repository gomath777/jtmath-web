export function getPdfDownloadHref(rawUrl: string): string {
  if (!rawUrl) return '#';
  try {
    const url = new URL(rawUrl);
    const isMathgoPdf =
      url.protocol === 'https:' &&
      url.hostname === 'mathgo-pdfs.b-cdn.net' &&
      decodeURIComponent(url.pathname).toLowerCase().endsWith('.pdf');

    if (!isMathgoPdf) return rawUrl;
  } catch {
    return rawUrl;
  }

  return `/api/public/pdf-download?url=${encodeURIComponent(rawUrl)}`;
}
