import { createPdfDownloadGet } from '@/lib/pdf-download-route';

export const GET = createPdfDownloadGet({
  fetch: (input, init) => globalThis.fetch(input, init),
});
