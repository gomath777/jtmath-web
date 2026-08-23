import type { IncomingMessage, ServerResponse } from 'node:http';
import { createPdfDownloadGet } from '../../../src/lib/pdf-download-route';

const downloadGet = createPdfDownloadGet({
  fetch: async () => ({
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('%PDF-1.7 qa fixture'));
        controller.close();
      },
    }),
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/pdf' : null) },
    status: 200,
  }),
});

export async function handlePdfDownloadRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (requestUrl.pathname !== '/api/public/pdf-download' || request.method !== 'GET') return false;
  const downloadResponse = await downloadGet(new Request(requestUrl));
  response.writeHead(downloadResponse.status, Object.fromEntries(downloadResponse.headers));
  const reader = downloadResponse.body?.getReader();
  if (reader === undefined) {
    response.end();
    return true;
  }
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    response.write(chunk.value);
  }
  response.end();
  return true;
}
