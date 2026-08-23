import assert from 'node:assert/strict';
import test from 'node:test';
import type { PreviewWebAdmission } from './web-admission';
import { signStrictWebStudentToken } from './web-auth';
import type { TutorProvider } from './contracts';
import type { WebLessonContextQueryPort } from './web-lesson-context';
import {
  activeToken,
  baseIdentity,
  lesson,
  now,
  releasedAssignment,
} from './web-lesson-context.test-support';
import { createWebAiTutorRoutePost, type WebAiTutorRouteConstructors } from './web-route';
import type { WebAiTutorRuntimeDependenciesResult } from './web-runtime-readiness';

const secret = 'explicit-web-secret';
const readyEnv = {
  AI_TUTOR_WEB_ENABLED: 'true',
  AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
  GEMINI_API_KEY: 'present',
  AI_TUTOR_GEMINI_FAST_MODEL: 'gemini-3.1-flash-lite',
  AI_TUTOR_GEMINI_REASONING_MODEL: 'gemini-3.1-pro',
  AI_TUTOR_GEMINI_FALLBACK_MODEL: 'gemini-3.1-flash',
  STUDENT_TOKEN_SECRET: secret,
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.invalid',
  SUPABASE_SERVICE_KEY: 'present',
  VERCEL_ENV: 'preview',
} as const;

test('Given partial preview env When route receives a request Then runtime dependencies are not constructed', async () => {
  const counters = { runtime: 0, provider: 0 };
  const post = createWebAiTutorRoutePost({
    env: { ...readyEnv, SUPABASE_SERVICE_KEY: undefined },
    now: () => now,
    constructors: constructors({ counters, runtime: readyRuntime() }),
  });

  const response = await post(request(await token()));

  assert.equal(response.status, 404);
  assert.deepEqual(counters, { runtime: 0, provider: 0 });
});

test('Given preview runtime reports missing private assets When route receives a request Then API is disabled before provider construction', async () => {
  const counters = { runtime: 0, provider: 0 };
  const post = createWebAiTutorRoutePost({
    env: readyEnv,
    now: () => now,
    constructors: constructors({ counters, runtime: { ok: false, reason: 'private_assets_unavailable' } }),
  });

  const response = await post(request(await token()));

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { status: 'disabled', message: 'AI 튜터를 사용할 수 없습니다.' });
  assert.deepEqual(counters, { runtime: 1, provider: 0 });
});

test('Given ready preview fake When route receives a request Then handler answers with injected ports', async () => {
  const counters = { runtime: 0, provider: 0 };
  const post = createWebAiTutorRoutePost({
    env: readyEnv,
    now: () => now,
    constructors: constructors({ counters, runtime: readyRuntime() }),
    fetchPort: pdfFetchPort(),
  });

  const response = await post(request(await token()));

  assert.equal(response.status, 200);
  assert.deepEqual(counters, { runtime: 1, provider: 1 });
});

test('Given ready runtime dependencies When the same route handles later requests Then the successful readiness result is reused', async () => {
  const counters = { runtime: 0, provider: 0 };
  const post = createWebAiTutorRoutePost({
    env: readyEnv,
    now: () => now,
    constructors: constructors({ counters, runtime: readyRuntime() }),
    fetchPort: pdfFetchPort(),
  });

  const first = await post(request(await token()));
  const second = await post(request(await token()));

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual(counters, { runtime: 1, provider: 2 });
});

test('Given failed readiness When the same route retries later Then the failure is not cached', async () => {
  const counters = { runtime: 0, provider: 0 };
  const runtimes: WebAiTutorRuntimeDependenciesResult[] = [
    { ok: false, reason: 'private_assets_unavailable' },
    readyRuntime(),
  ];
  const post = createWebAiTutorRoutePost({
    env: readyEnv,
    now: () => now,
    constructors: {
      ...constructors({ counters, runtime: readyRuntime() }),
      createRuntimeDependencies: async () => {
        counters.runtime += 1;
        const next = runtimes.shift();
        if (next === undefined) assert.fail('Expected a configured runtime readiness result');
        return next;
      },
    },
    fetchPort: pdfFetchPort(),
  });

  const first = await post(request(await token()));
  const second = await post(request(await token()));

  assert.equal(first.status, 404);
  assert.equal(second.status, 200);
  assert.deepEqual(counters, { runtime: 2, provider: 1 });
});

test('Given invalid cookie When route receives a request Then runtime readiness is not touched', async () => {
  const counters = { runtime: 0, provider: 0 };
  const post = createWebAiTutorRoutePost({
    env: readyEnv,
    now: () => now,
    constructors: constructors({ counters, runtime: readyRuntime() }),
  });

  const response = await post(request('not-a-valid-token'));

  assert.equal(response.status, 401);
  assert.deepEqual(counters, { runtime: 0, provider: 0 });
});

function constructors(input: Readonly<{
  readonly counters: { runtime: number; provider: number };
  readonly runtime: WebAiTutorRuntimeDependenciesResult;
}>): WebAiTutorRouteConstructors {
  return {
    createRuntimeDependencies: async () => {
      input.counters.runtime += 1;
      return input.runtime;
    },
    createAdmission: () => admission(),
    createProvider: () => {
      input.counters.provider += 1;
      return provider();
    },
    createLessonPort: () => lessonPort(),
  };
}

function readyRuntime(): WebAiTutorRuntimeDependenciesResult {
  return {
    ok: true,
    dependencies: {
      lessonPort: lessonPort(),
      conversationRepository: undefined,
      guideStore: undefined,
      problemImageStore: undefined,
    },
  };
}

function admission(): PreviewWebAdmission {
  return {
    tryAcquire: () => ({ accepted: true, release: () => undefined }),
    debugSize: () => 0,
  };
}

function provider(): TutorProvider {
  return {
    answer: async () => ({
      answerText: '힌트입니다.',
      confidence: 0.9,
      subjectSlug: 'ds2',
      conceptTags: ['trigonometry'],
      errorType: null,
      needsTeacherReview: false,
      escalationReason: null,
    }),
  };
}

function lessonPort(): WebLessonContextQueryPort {
  return {
    loadCurriculumItemBySlug: async () => lesson,
    loadStudentToken: async () => activeToken,
    loadStudentLessonAssignments: async () => [releasedAssignment],
    loadSessionBlocks: async () => [{
      id: 'block-route-readiness',
      blockType: 'content_group',
      orderIndex: 1,
      variant: 'honors',
      content: { pdfs: [{ original_name: '삼각함수 레벨1.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv1.pdf' }] },
    }],
  };
}

function pdfFetchPort(): { readonly fetch: () => Promise<Response> } {
  return {
    fetch: async () => new Response(new Blob([new TextEncoder().encode('%PDF- synthetic')]), {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    }),
  };
}

async function token(): Promise<string> {
  return signStrictWebStudentToken({
    payload: baseIdentity,
    secret,
    nowSeconds: Math.floor(now.getTime() / 1000),
  });
}

function request(studentToken: string): Request {
  return new Request('https://jtmath.kr/api/public/student/ai-tutor', {
    method: 'POST',
    headers: { cookie: `student_session=${studentToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ lessonSlug: 'ds2-trig', selectedMaterialKey: 'm-1-content-pdfs-0', message: '2번 힌트 줘' }),
  });
}
