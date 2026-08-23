import 'server-only';

import { WebTutorRequestSchema, type WebTutorRequest } from './web-input';

export type ReadWebTutorRequestResult =
  | { readonly ok: true; readonly request: WebTutorRequest }
  | { readonly ok: false };

export async function readWebTutorRequest(request: Request): Promise<ReadWebTutorRequestResult> {
  const body = await readJson(request);
  if (body === invalidJson) return { ok: false };
  const parsed = WebTutorRequestSchema.safeParse(body);
  return parsed.success ? { ok: true, request: parsed.data } : { ok: false };
}

async function readJson(request: Request): Promise<unknown | typeof invalidJson> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof Error) return invalidJson;
    throw error;
  }
}

const invalidJson = Symbol('invalidJson');
