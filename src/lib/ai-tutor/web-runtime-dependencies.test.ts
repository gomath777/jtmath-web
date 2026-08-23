import assert from 'node:assert/strict';
import test from 'node:test';
import { parseWebAiTutorConfig, type WebAiTutorEnvironment } from './web-config';
import { createWebAiTutorDependenciesWhenEnabled } from './web-runtime-dependencies';

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
  readonly status: 'constructed';
};

test('web runtime dependency factory constructs only after enabled web config', () => {
  // Given
  const counters = { supabase: 0, pdf: 0, gemini: 0, admission: 0, chat: 0 };
  const constructors = {
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
    assemble: (): Constructed => ({ status: 'constructed' }),
  };

  // When
  const production = createWebAiTutorDependenciesWhenEnabled(
    parseWebAiTutorConfig({ ...completeWebEnv, VERCEL_ENV: 'production' }),
    constructors,
  );
  const fallback = createWebAiTutorDependenciesWhenEnabled(
    parseWebAiTutorConfig({ ...completeWebEnv, STUDENT_TOKEN_SECRET: 'dev-fallback-secret-change-me' }),
    constructors,
  );
  const enabled = createWebAiTutorDependenciesWhenEnabled(parseWebAiTutorConfig(completeWebEnv), constructors);

  // Then
  assert.equal(production, undefined);
  assert.equal(fallback, undefined);
  assert.deepEqual(enabled, { status: 'constructed' });
  assert.deepEqual(counters, { supabase: 1, pdf: 1, gemini: 1, admission: 1, chat: 0 });
});
