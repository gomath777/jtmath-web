export function getPdfDownloadHref(rawUrl: string): string {
  if (!rawUrl) return '#';
  return `/api/public/pdf-download?url=${encodeURIComponent(rawUrl)}`;
}
