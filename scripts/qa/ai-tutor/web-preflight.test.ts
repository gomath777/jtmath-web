import assert from 'node:assert/strict';
import test from 'node:test';
import { runWebAiTutorPreflight, type WebAiTutorPreflightEnv } from './web-preflight';

const completeEnv: WebAiTutorPreflightEnv = {
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

test('web preflight reports names only without env values', () => {
  // Given
  const env = completeEnv;

  // When
  const result = runWebAiTutorPreflight({ env, nodeEnv: 'production', namesOnly: true });

  // Then
  assert.equal(result.exitCode, 0);
  assert.equal(result.lines.some((line) => line === 'PASS AI_TUTOR_WEB_RUNTIME_CONFIG'), true);
  const serialized = result.lines.join('\n');
  assert.equal(serialized.includes('synthetic-gemini-secret-never-returned'), false);
  assert.equal(serialized.includes('synthetic-student-secret-never-returned'), false);
  assert.equal(serialized.includes('https://synthetic-project.supabase.co'), false);
});

test('web preflight fails closed in production and fallback-secret cases', () => {
  // Given
  const productionEnv = { ...completeEnv, VERCEL_ENV: 'production' };
  const fallbackEnv = { ...completeEnv, STUDENT_TOKEN_SECRET: 'dev-fallback-secret-change-me' };

  // When
  const production = runWebAiTutorPreflight({
    env: productionEnv,
    nodeEnv: 'production',
    namesOnly: true,
  });
  const fallback = runWebAiTutorPreflight({ env: fallbackEnv, nodeEnv: 'production', namesOnly: true });

  // Then
  assert.equal(production.exitCode, 1);
  assert.equal(fallback.exitCode, 1);
  assert.equal(production.lines.includes('FAIL AI_TUTOR_WEB_FEATURE_FLAG'), true);
  assert.equal(fallback.lines.includes('FAIL AI_TUTOR_WEB_RUNTIME_CONFIG'), true);
});

test('web preflight accepts production only with the explicit production opt-in', () => {
  const result = runWebAiTutorPreflight({
    env: {
      ...completeEnv,
      VERCEL_ENV: 'production',
      AI_TUTOR_WEB_PRODUCTION_ENABLED: 'true',
    },
    nodeEnv: 'production',
    namesOnly: true,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.lines.includes('PASS AI_TUTOR_WEB_PRODUCTION_ENABLED'), true);
  assert.equal(result.lines.includes('PASS AI_TUTOR_WEB_FEATURE_FLAG'), true);
});
