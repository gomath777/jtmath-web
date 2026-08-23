import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewWebAdmission, type PreviewWebAdmission } from '../../../../../lib/ai-tutor/web-admission';
import { signStrictWebStudentToken } from '../../../../../lib/ai-tutor/web-auth';
import type { TutorProvider } from '../../../../../lib/ai-tutor/contracts';
import { createWebAiTutorRoutePost, type WebAiTutorRouteConstructors } from '../../../../../lib/ai-tutor/web-route';
import type { WebLessonContextQueryPort } from '../../../../../lib/ai-tutor/web-lesson-context';
import {
  activeToken,
  baseIdentity,
  lesson,
  now,
  releasedAssignment,
} from '../../../../../lib/ai-tutor/web-lesson-context.test-support';

const secret = 'explicit-web-secret';
const env = {
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

test('Given one route factory When four default admission requests are posted Then the fourth is rate limited', async () => {
  // Given
  const constructors = createStatefulConstructors();
  const post = createWebAiTutorRoutePost({ env, now: () => now, constructors, fetchPort: pdfFetchPort() });
  const token = await studentToken();

  // When
  const responses = [await post(request(token)), await post(request(token)), await post(request(token))];
  const fourth = await post(request(token));

  // Then
  assert.deepEqual(responses.map((response) => response.status), [200, 200, 200]);
  assert.equal(fourth.status, 429);
  assert.equal(constructors.admissionConstructions(), 1);
});

test('Given one route factory When a duplicate arrives during an active answer Then the second request is rejected', async () => {
  // Given
  const blocker = deferredAnswer();
  const constructors = createStatefulConstructors(blocker.provider);
  const post = createWebAiTutorRoutePost({ env, now: () => now, constructors, fetchPort: pdfFetchPort() });
  const token = await studentToken();
  const first = post(request(token));
  await blocker.started;

  // When
  const duplicate = await post(request(token));
  blocker.finish();
  const completed = await first;

  // Then
  assert.equal(duplicate.status, 429);
  assert.equal(duplicate.headers.get('Retry-After'), '1');
  assert.equal(completed.status, 200);
  assert.equal(constructors.admissionConstructions(), 1);
});

function createStatefulConstructors(provider: TutorProvider = answeringProvider()): WebAiTutorRouteConstructors & {
  readonly admissionConstructions: () => number;
} {
  let admissionConstructions = 0;
  return {
    createLessonPort: () => lessonPort(),
    createAdmission: (inputSecret) => {
      admissionConstructions += 1;
      return createPreviewWebAdmission({ secret: inputSecret, clock: { nowMs: () => now.getTime() } });
    },
    createProvider: () => provider,
    admissionConstructions: () => admissionConstructions,
  };
}

function answeringProvider(): TutorProvider {
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

function deferredAnswer(): Readonly<{ readonly provider: TutorProvider; readonly started: Promise<void>; readonly finish: () => void }> {
  let startAnswer: () => void = () => undefined;
  let finishAnswer: () => void = () => undefined;
  let calls = 0;
  const started = new Promise<void>((resolve) => {
    startAnswer = resolve;
  });
  const finished = new Promise<void>((resolve) => {
    finishAnswer = resolve;
  });
  return {
    started,
    finish: finishAnswer,
    provider: {
      answer: async () => {
        calls += 1;
        if (calls === 1) {
          startAnswer();
          await finished;
        }
        return {
          answerText: '힌트입니다.',
          confidence: 0.9,
          subjectSlug: 'ds2',
          conceptTags: ['trigonometry'],
          errorType: null,
          needsTeacherReview: false,
          escalationReason: null,
        };
      },
    },
  };
}

function lessonPort(): WebLessonContextQueryPort {
  return {
    loadCurriculumItemBySlug: async () => lesson,
    loadStudentToken: async () => activeToken,
    loadStudentLessonAssignments: async () => [releasedAssignment],
    loadSessionBlocks: async () => [{
      id: 'block-trig-route-admission',
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

function pdfFetchPort(): { readonly fetch: () => Promise<Response> } {
  return {
    fetch: async () =>
      new Response(new Blob([new TextEncoder().encode('%PDF- synthetic')]), {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      }),
  };
}

async function studentToken(): Promise<string> {
  return signStrictWebStudentToken({
    payload: baseIdentity,
    secret,
    nowSeconds: Math.floor(now.getTime() / 1000),
  });
}

function request(token: string): Request {
  return new Request('https://jtmath.kr/api/public/student/ai-tutor', {
    method: 'POST',
    headers: { cookie: `student_session=${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ lessonSlug: 'ds2-trig', selectedMaterialKey: 'm-1-content-pdfs-0', message: '2번 힌트 줘' }),
  });
}
