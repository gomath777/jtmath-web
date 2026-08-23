import assert from 'node:assert/strict';
import test from 'node:test';
import { parseWebAiTutorConfig, type WebAiTutorEnvironment } from './web-config';
import { createWebAiTutorRuntime } from './web-runtime';

const completeWebEnv: WebAiTutorEnvironment = {
  AI_TUTOR_WEB_ENABLED: 'true',
  AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
  GEMINI_API_KEY: 'synthetic-gemini-secret-never-returned',
  AI_TUTOR_GEMINI_FAST_MODEL: 'gemini-3.1-flash-lite',
  AI_TUTOR_GEMINI_REASONING_MODEL: 'gemini-3.1-pro',
  AI_TUTOR_GEMINI_FALLBACK_MODEL: 'gemini-3.1-flash',
  AI_TUTOR_MODEL_TIMEOUT_MS: '20000',
  AI_TUTOR_RECENT_TURN_COUNT_CAP: '6',
  AI_TUTOR_RECENT_TURN_CHARACTER_CAP: '1200',
  AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP: '6000',
  STUDENT_TOKEN_SECRET: 'synthetic-student-secret-never-returned',
  NEXT_PUBLIC_SUPABASE_URL: 'https://synthetic-project.supabase.co',
  SUPABASE_SERVICE_KEY: 'synthetic-service-key-never-returned',
  VERCEL_ENV: 'preview',
};

type Constructed = {
  readonly ready: true;
};

test('web runtime entry returns disabled before constructors for closed config', () => {
  // Given
  const counters = { supabase: 0, pdf: 0, gemini: 0, admission: 0, chat: 0 };
  const constructors = createCountingConstructors(counters);

  // When
  const production = createWebAiTutorRuntime(
    parseWebAiTutorConfig({ ...completeWebEnv, VERCEL_ENV: 'production' }),
    constructors,
  );
  const fallback = createWebAiTutorRuntime(
    parseWebAiTutorConfig({ ...completeWebEnv, STUDENT_TOKEN_SECRET: 'dev-fallback-secret-change-me' }),
    constructors,
  );

  // Then
  assert.deepEqual(production, { status: 'disabled', reason: 'config_closed' });
  assert.deepEqual(fallback, { status: 'disabled', reason: 'config_closed' });
  assert.deepEqual(counters, { supabase: 0, pdf: 0, gemini: 0, admission: 0, chat: 0 });
});

test('web runtime entry wraps constructed dependencies only when enabled', () => {
  // Given
  const counters = { supabase: 0, pdf: 0, gemini: 0, admission: 0, chat: 0 };

  // When
  const runtime = createWebAiTutorRuntime(parseWebAiTutorConfig(completeWebEnv), createCountingConstructors(counters));

  // Then
  assert.equal(runtime.status, 'enabled');
  if (runtime.status !== 'enabled') {
    assert.fail('Expected enabled runtime');
  }
  assert.deepEqual(runtime.dependencies, { ready: true });
  assert.equal(runtime.config.status, 'enabled');
  assert.deepEqual(counters, { supabase: 1, pdf: 1, gemini: 1, admission: 1, chat: 0 });
});

function createCountingConstructors(counters: {
  supabase: number;
  pdf: number;
  gemini: number;
  admission: number;
  chat: number;
}) {
  return {
    createSupabase: () => {
      counters.supabase += 1;
      return 'supabase';
    },
    createPdf: () => {
      counters.pdf += 1;
      return 'pdf';
    },
    createGemini: () => {
      counters.gemini += 1;
      return 'gemini';
    },
    createAdmission: () => {
      counters.admission += 1;
      return 'admission';
    },
    assemble: (): Constructed => ({ ready: true }),
  };
}
