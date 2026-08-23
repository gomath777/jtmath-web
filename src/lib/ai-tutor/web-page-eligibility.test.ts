import test from 'node:test';
import assert from 'node:assert/strict';
import { signStrictWebStudentToken } from './web-auth';
import type { WebAiTutorEnvironment } from './web-config';
import type { WebLessonContextQueryPort } from './web-lesson-context';
import { shouldShowWebTutorFromPort } from './web-page-eligibility';

const enabledEnv: WebAiTutorEnvironment = {
  AI_TUTOR_WEB_ENABLED: 'true',
  AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
  GEMINI_API_KEY: 'present',
  AI_TUTOR_GEMINI_FAST_MODEL: 'gemini-3.1-flash-lite',
  AI_TUTOR_GEMINI_REASONING_MODEL: 'gemini-3.1-pro',
  AI_TUTOR_GEMINI_FALLBACK_MODEL: 'gemini-3.1-flash',
  STUDENT_TOKEN_SECRET: 'explicit-web-secret',
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.invalid',
  SUPABASE_SERVICE_KEY: 'present',
  VERCEL_ENV: 'preview',
};

test('Given legacy fallback signed cookie When resolving page launcher Then strict web tutor stays hidden', async () => {
  const fallbackToken = await signStrictWebStudentToken({
    payload: { profileId: 'synthetic-profile', slug: 'synthetic-slug' },
    secret: 'dev-fallback-secret-change-me',
    nowSeconds: 1_800_000_000,
  });
  const port = createCountingEligiblePort();

  const visible = await shouldShowWebTutorFromPort({
    cookieHeader: `student_session=${fallbackToken}`,
    lessonSlug: 'trig-lesson',
    env: enabledEnv,
    port,
    now: new Date('2026-08-21T00:00:00.000Z'),
  });

  assert.equal(visible, false);
  assert.deepEqual(port.calls, []);
});

test('Given strict eligible student When resolving page launcher Then tutor is visible', async () => {
  const strictToken = await signStrictWebStudentToken({
    payload: { profileId: 'synthetic-profile', slug: 'synthetic-slug' },
    secret: enabledEnv.STUDENT_TOKEN_SECRET ?? '',
    nowSeconds: 1_800_000_000,
  });
  const port = createCountingEligiblePort();

  const visible = await shouldShowWebTutorFromPort({
    cookieHeader: `student_session=${strictToken}`,
    lessonSlug: 'trig-lesson',
    env: enabledEnv,
    port,
    now: new Date('2026-08-21T00:00:00.000Z'),
  });

  assert.equal(visible, true);
  assert.deepEqual(port.calls, [
    'loadCurriculumItemBySlug',
    'loadStudentToken',
    'loadStudentLessonAssignments',
    'loadSessionBlocks',
  ]);
});

test('Given strict master preview for an eligible student assignment When resolving page launcher Then tutor is visible', async () => {
  const strictMasterToken = await signStrictWebStudentToken({
    payload: { profileId: 'synthetic-profile', slug: 'synthetic-slug', isMaster: true },
    secret: enabledEnv.STUDENT_TOKEN_SECRET ?? '',
    nowSeconds: 1_800_000_000,
  });
  const port = createCountingEligiblePort();

  const visible = await shouldShowWebTutorFromPort({
    cookieHeader: `student_session=${strictMasterToken}`,
    lessonSlug: 'trig-lesson',
    env: enabledEnv,
    port,
    now: new Date('2026-08-21T00:00:00.000Z'),
  });

  assert.equal(visible, true);
  assert.deepEqual(port.calls, [
    'loadCurriculumItemBySlug',
    'loadStudentToken',
    'loadStudentLessonAssignments',
    'loadSessionBlocks',
  ]);
});

function createCountingEligiblePort(): WebLessonContextQueryPort & { readonly calls: readonly string[] } {
  const calls: string[] = [];
  return {
    calls,
    loadCurriculumItemBySlug: async () => {
      calls.push('loadCurriculumItemBySlug');
      return {
        id: 'synthetic-item',
        publicSlug: 'trig-lesson',
        title: '삼각함수',
        label: null,
        curricula: { subjectSlug: 'ds2', title: '대수' },
      };
    },
    loadStudentToken: async () => {
      calls.push('loadStudentToken');
      return {
        id: 'synthetic-token',
        profileId: 'synthetic-profile',
        slug: 'synthetic-slug',
        isActive: true,
        portalExpiresAt: null,
      };
    },
    loadStudentLessonAssignments: async () => {
      calls.push('loadStudentLessonAssignments');
      return [
        {
          id: 'synthetic-assignment',
          curriculumItemId: 'synthetic-item',
          profileId: 'synthetic-profile',
          status: 'released',
          scheduledDate: '2026-08-21',
          releasedAt: '2026-08-20T00:00:00.000Z',
          variant: 'default',
        },
      ];
    },
    loadSessionBlocks: async () => {
      calls.push('loadSessionBlocks');
      return [
        {
          id: 'block-page-eligibility-trig',
          blockType: 'content_group',
          orderIndex: 1,
          variant: 'default',
          content: {
            pdfs: [
              { original_name: '삼각함수 레벨1.pdf', url: 'https://cdn.mathgo.example/level1.pdf' },
              { original_name: '삼각함수 레벨2.pdf', url: 'https://cdn.mathgo.example/level2.pdf' },
              { original_name: '삼각함수 레벨3.pdf', url: 'https://cdn.mathgo.example/level3.pdf' },
              { original_name: '삼각함수 레벨4-1.pdf', url: 'https://cdn.mathgo.example/level4-1.pdf' },
              { original_name: '삼각함수 레벨4-2.pdf', url: 'https://cdn.mathgo.example/level4-2.pdf' },
              { original_name: '올스캔 #1 합성 모의.pdf', url: 'https://cdn.mathgo.example/allscan.pdf' },
            ],
          },
        },
      ];
    },
  };
}
