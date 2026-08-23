import assert from 'node:assert/strict';
import test from 'node:test';
import { signStrictWebStudentToken } from './web-auth';
import { completeWebEnv } from './web-config.test-support';
import {
  baseIdentity,
  now,
} from './web-lesson-context.test-support';
import { createWebAiTutorRoutePost } from './web-route';

test('Given default preview route with absent persistence When a student posts Then API disables before provider fetch', async () => {
  const calls: string[] = [];
  await withFetch(readinessFetch({ calls, mode: 'missing_tables' }), async () => {
    const response = await createWebAiTutorRoutePost({ env: completeWebEnv, now: () => now })(request(await token()));

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { status: 'disabled', message: 'AI 튜터를 사용할 수 없습니다.' });
  });
  assert.equal(calls.some((url) => url.includes('/rest/v1/ai_tutor_web_conversations')), true);
  assert.equal(calls.some((url) => url.includes('/rest/v1/ai_tutor_web_turns')), true);
  assert.equal(calls.some((url) => url.includes('generativelanguage')), false);
});

test('Given default preview route with missing private assets When a student posts Then API disables before provider fetch', async () => {
  const calls: string[] = [];
  await withFetch(readinessFetch({ calls, mode: 'missing_private_assets' }), async () => {
    const response = await createWebAiTutorRoutePost({ env: completeWebEnv, now: () => now })(request(await token()));

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { status: 'disabled', message: 'AI 튜터를 사용할 수 없습니다.' });
  });
  assert.equal(calls.some((url) => url.includes('/storage/v1/object/ai-tutor-guides/')), true);
  assert.equal(calls.some((url) => url.includes('generativelanguage')), false);
});

type ReadinessFetchMode = 'missing_tables' | 'missing_private_assets';

function readinessFetch(input: Readonly<{
  readonly calls: string[];
  readonly mode: ReadinessFetchMode;
}>): typeof fetch {
  return async (requestInput) => {
    const url = requestUrl(requestInput);
    input.calls.push(url);
    if (url.includes('/rest/v1/ai_tutor_web_conversations') || url.includes('/rest/v1/ai_tutor_web_turns')) {
      return input.mode === 'missing_tables'
        ? json({ code: 'PGRST205', message: 'table missing' }, 404)
        : json([], 200);
    }
    if (url.includes('/storage/v1/object/ai-tutor-guides/')) {
      return json({ error: 'not_found' }, 404);
    }
    throw new Error(`Unexpected default route fetch: ${url}`);
  };
}

async function withFetch<T>(replacement: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = replacement;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function request(studentToken: string): Request {
  return new Request('https://jtmath.kr/api/public/student/ai-tutor', {
    method: 'POST',
    headers: { cookie: `student_session=${studentToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ lessonSlug: 'ds2-trig', selectedMaterialKey: 'm-1-content-pdfs-0', message: '2번 힌트 줘' }),
  });
}

async function token(): Promise<string> {
  return signStrictWebStudentToken({
    payload: baseIdentity,
    secret: completeWebEnv.STUDENT_TOKEN_SECRET ?? '',
    nowSeconds: Math.floor(now.getTime() / 1000),
  });
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (input instanceof Request) return input.url;
  return String(input);
}
