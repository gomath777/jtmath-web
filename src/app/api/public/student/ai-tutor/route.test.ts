import assert from 'node:assert/strict';
import test from 'node:test';
import { maxDuration } from './route';
import { createWebAiTutorRoutePost, type WebAiTutorRouteConstructors } from '../../../../../lib/ai-tutor/web-route';
import { signStrictWebStudentToken } from '../../../../../lib/ai-tutor/web-auth';
import {
  activeToken,
  baseIdentity,
  lesson,
  now,
  releasedAssignment,
} from '../../../../../lib/ai-tutor/web-lesson-context.test-support';
import type { PreviewWebAdmission } from '../../../../../lib/ai-tutor/web-admission';
import type { TutorProvider } from '../../../../../lib/ai-tutor/contracts';
import type { WebLessonContextQueryPort } from '../../../../../lib/ai-tutor/web-lesson-context';

const explicitSecret = 'explicit-web-secret';
const env = {
  AI_TUTOR_WEB_ENABLED: 'true',
  AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
  GEMINI_API_KEY: 'present',
  AI_TUTOR_GEMINI_FAST_MODEL: 'gemini-3.1-flash-lite',
  AI_TUTOR_GEMINI_REASONING_MODEL: 'gemini-3.1-pro',
  AI_TUTOR_GEMINI_FALLBACK_MODEL: 'gemini-3.1-flash',
  STUDENT_TOKEN_SECRET: explicitSecret,
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.invalid',
  SUPABASE_SERVICE_KEY: 'present',
  VERCEL_ENV: 'preview',
} as const;

test('Given Gemini 3.1 Pro can answer slowly When the route runs Then the platform budget exceeds the provider deadline', () => {
  assert.equal(maxDuration, 120);
});

test('Given fallback cookie When route receives request Then dependencies are not constructed', async () => {
  let constructions = 0;
  const token = await signStrictWebStudentToken({
    payload: baseIdentity,
    secret: 'dev-fallback-secret-change-me',
    nowSeconds: nowSeconds(),
  });
  const post = createWebAiTutorRoutePost({
    env,
    now: () => now,
    constructors: {
      createLessonPort: () => {
        constructions += 1;
        throw new Error('should not construct lesson port');
      },
      createAdmission: () => {
        constructions += 1;
        throw new Error('should not construct admission');
      },
      createProvider: () => {
        constructions += 1;
        throw new Error('should not construct provider');
      },
    },
  });

  const response = await post(request(validBody(), token));

  assert.equal(response.status, 401);
  assert.equal(constructions, 0);
});

test('Given master token When route receives request Then dependencies are not constructed', async () => {
  const counters = constructionCounters();
  const token = await signStrictWebStudentToken({
    payload: { ...baseIdentity, isMaster: true },
    secret: explicitSecret,
    nowSeconds: nowSeconds(),
  });
  const response = await createWebAiTutorRoutePost({
    env,
    now: () => now,
    constructors: throwingConstructors(counters),
  })(request(validBody(), token));

  assert.equal(response.status, 403);
  assert.equal(counters.count, 0);
});

test('Given forbidden body field When route receives request Then dependencies are not constructed', async () => {
  const counters = constructionCounters();
  const token = await signStrictWebStudentToken({
    payload: baseIdentity,
    secret: explicitSecret,
    nowSeconds: nowSeconds(),
  });
  const response = await createWebAiTutorRoutePost({
    env,
    now: () => now,
    constructors: throwingConstructors(counters),
  })(request({
    ...validBodyRecord(),
    pdfUrl: 'https://example.invalid/x.pdf',
    prompt: 'override',
    visualSpec: { kind: 'forged' },
    graph: true,
  }, token));

  assert.equal(response.status, 422);
  assert.equal(counters.count, 0);
});

test('Given route happy responses When selected material keys are repeated Then the server resolves the same target', async () => {
  const post = createWebAiTutorRoutePost({
    env,
    now: () => now,
    constructors: createRouteConstructors(),
    fetchPort: {
      fetch: async () =>
        new Response(new Blob([new TextEncoder().encode('%PDF- synthetic')]), {
          headers: { 'content-type': 'application/pdf' },
        }),
    },
  });
  const token = await signStrictWebStudentToken({
    payload: baseIdentity,
    secret: explicitSecret,
    nowSeconds: nowSeconds(),
  });
  const first = await post(request(validBody(), token));
  const firstBody = await first.json();
  const second = await post(
    request({
      lessonSlug: 'ds2-trig',
      selectedMaterialKey: 'm-1-content-pdfs-0',
      message: '2번 풀이 시작 알려줘',
    }, token),
  );
  const secondBody = await second.json();

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.match(firstBody.resolvedTarget.contextKey, /^ctx_/);
  assert.deepEqual(secondBody.resolvedTarget, firstBody.resolvedTarget);
});

function createRouteConstructors(): WebAiTutorRouteConstructors {
  const admission: PreviewWebAdmission = {
    tryAcquire: () => ({ accepted: true, release: () => undefined }),
    debugSize: () => 0,
  };
  const provider: TutorProvider = {
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
  return {
    createLessonPort: () => fakeLessonPort(),
    createAdmission: () => admission,
    createProvider: () => provider,
  };
}

function constructionCounters(): { count: number } {
  return { count: 0 };
}

function throwingConstructors(counters: { count: number }): WebAiTutorRouteConstructors {
  return {
    createLessonPort: () => {
      counters.count += 1;
      throw new Error('should not construct lesson port');
    },
    createAdmission: () => {
      counters.count += 1;
      throw new Error('should not construct admission');
    },
    createProvider: () => {
      counters.count += 1;
      throw new Error('should not construct provider');
    },
  };
}

function fakeLessonPort(): WebLessonContextQueryPort {
  return {
    loadCurriculumItemBySlug: async () => lesson,
    loadStudentToken: async () => activeToken,
    loadStudentLessonAssignments: async () => [releasedAssignment],
    loadSessionBlocks: async () => [{
      id: 'block-trig-route',
      blockType: 'content_group',
      orderIndex: 1,
      variant: 'honors',
      content: {
      pdfs: [
        { original_name: '삼각함수 레벨1.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv1.pdf' },
        { original_name: '삼각함수 레벨2.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv2.pdf' },
        { original_name: '삼각함수 레벨3.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv3.pdf' },
        { original_name: '삼각함수 레벨4-1.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv4-1.pdf' },
        { original_name: '삼각함수 레벨4-2.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv4-2.pdf' },
        { original_name: '올스캔 #1 하나고 중간.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/allscan.pdf' },
      ],
    },
    }],
  };
}

function request(body: unknown, token: string): Request {
  return new Request('https://jtmath.kr/api/public/student/ai-tutor', {
    method: 'POST',
    headers: { cookie: `student_session=${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validBody(): unknown {
  return validBodyRecord();
}

function validBodyRecord(): Record<string, unknown> {
  return { lessonSlug: 'ds2-trig', selectedMaterialKey: 'm-1-content-pdfs-0', message: '2번 힌트 줘' };
}

function nowSeconds(): number {
  return Math.floor(now.getTime() / 1000);
}
