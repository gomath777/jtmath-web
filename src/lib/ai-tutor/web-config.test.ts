import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAiTutorConfig, type AiTutorEnvironment } from './config';
import { completeWebEnv } from './web-config.test-support';
import {
  AI_TUTOR_WEB_ENV_NAMES,
  parseWebAiTutorConfig,
  type WebAiTutorEnvironment,
} from './web-config';

test('web config enables only in preview or local runtimes when complete settings are present', () => {
  // Given
  const previewEnv = completeWebEnv;
  const developmentEnv = { ...completeWebEnv, VERCEL_ENV: undefined };

  // When
  const preview = parseWebAiTutorConfig(previewEnv, { nodeEnv: 'production' });
  const development = parseWebAiTutorConfig(developmentEnv, { nodeEnv: 'development' });

  // Then
  assert.equal(preview.ok, true);
  assert.equal(development.ok, true);
  if (!preview.ok || !development.ok) {
    assert.fail('Expected complete preview and development web configs to parse');
  }
  assert.equal(preview.config.status, 'enabled');
  assert.equal(development.config.status, 'enabled');
  assert.deepEqual(preview.config.models, {
    fast: { id: 'gemini-3.1-flash-lite', alias: 'fast' },
    reasoning: { id: 'gemini-3.1-pro', alias: 'reasoning' },
    fallback: { id: 'gemini-3.1-flash', alias: 'fallback' },
  });
  assert.equal(preview.config.modelTimeoutMs, 20_000);
  assert.deepEqual(preview.config.caps, {
    recentTurnCount: 6,
    recentTurnCharacters: 1_200,
    recentTotalCharacters: 6_000,
  });
});

test('web config hard-disables production without the explicit production opt-in', () => {
  // Given
  let constructionCount = 0;

  // When
  const result = parseWebAiTutorConfig({ ...completeWebEnv, VERCEL_ENV: 'production' });
  if (result.ok && result.config.status === 'enabled') {
    constructionCount += 1;
  }

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail('Expected production hard-disable to be a safe parsed state');
  }
  assert.equal(result.config.status, 'disabled');
  assert.equal(result.config.enabled, false);
  assert.equal(constructionCount, 0);
});

test('web config enables production only with the explicit production opt-in and complete settings', () => {
  const result = parseWebAiTutorConfig({
    ...completeWebEnv,
    VERCEL_ENV: 'production',
    AI_TUTOR_WEB_PRODUCTION_ENABLED: 'true',
  });

  assert.equal(result.ok, true);
  if (!result.ok) assert.fail('Expected explicit production opt-in to parse');
  assert.equal(result.config.status, 'enabled');
  assert.equal(result.config.runtime, 'production');
});

test('web config rejects an invalid production opt-in value', () => {
  const result = parseWebAiTutorConfig({
    ...completeWebEnv,
    VERCEL_ENV: 'production',
    AI_TUTOR_WEB_PRODUCTION_ENABLED: 'yes',
  });

  assert.equal(result.ok, false);
  if (result.ok) assert.fail('Expected invalid production opt-in to fail closed');
  assert.deepEqual(result.issues, [
    { envName: 'AI_TUTOR_WEB_PRODUCTION_ENABLED', code: 'invalid_boolean' },
  ]);
});

test('web config fails closed for each missing or blank required variable', () => {
  // Given
  const requiredNames = [
    'AI_TUTOR_WEB_ENABLED',
    'AI_TUTOR_PAID_BILLING_CONFIRMED',
    'GEMINI_API_KEY',
    'AI_TUTOR_GEMINI_FAST_MODEL',
    'AI_TUTOR_GEMINI_REASONING_MODEL',
    'AI_TUTOR_GEMINI_FALLBACK_MODEL',
    'STUDENT_TOKEN_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
  ] as const;

  for (const envName of requiredNames) {
    // When
    const missing = parseWebAiTutorConfig({ ...completeWebEnv, [envName]: undefined });
    const blank = parseWebAiTutorConfig({ ...completeWebEnv, [envName]: '   ' });

    // Then
    assert.equal(missing.ok, false, `${envName} missing should fail`);
    assert.equal(blank.ok, false, `${envName} blank should fail`);
    if (missing.ok || blank.ok) {
      assert.fail(`${envName} unexpectedly enabled web config`);
    }
    assert.equal(missing.issues.some((issue) => issue.envName === envName), true);
    assert.equal(blank.issues.some((issue) => issue.envName === envName), true);
  }
});

test('web config uses bounded defaults for missing or blank timeout and caps', () => {
  // Given
  const missingCaps: WebAiTutorEnvironment = {
    ...completeWebEnv,
    AI_TUTOR_MODEL_TIMEOUT_MS: undefined,
    AI_TUTOR_RECENT_TURN_COUNT_CAP: undefined,
    AI_TUTOR_RECENT_TURN_CHARACTER_CAP: undefined,
    AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP: undefined,
  };
  const blankCaps: WebAiTutorEnvironment = {
    ...completeWebEnv,
    AI_TUTOR_MODEL_TIMEOUT_MS: ' ',
    AI_TUTOR_RECENT_TURN_COUNT_CAP: ' ',
    AI_TUTOR_RECENT_TURN_CHARACTER_CAP: ' ',
    AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP: ' ',
  };

  // When
  const missing = parseWebAiTutorConfig(missingCaps);
  const blank = parseWebAiTutorConfig(blankCaps);

  // Then
  for (const result of [missing, blank]) {
    assert.equal(result.ok, true);
    if (!result.ok || result.config.status !== 'enabled') {
      assert.fail('Expected bounded defaults to keep complete web config enabled');
    }
    assert.equal(result.config.modelTimeoutMs, 90_000);
    assert.deepEqual(result.config.caps, {
      recentTurnCount: 6,
      recentTurnCharacters: 1_200,
      recentTotalCharacters: 6_000,
    });
  }
});

test('web config rejects invalid or out-of-range timeout and caps', () => {
  // Given
  const env: WebAiTutorEnvironment = {
    ...completeWebEnv,
    AI_TUTOR_MODEL_TIMEOUT_MS: '110001',
    AI_TUTOR_RECENT_TURN_COUNT_CAP: '7',
    AI_TUTOR_RECENT_TURN_CHARACTER_CAP: '1201',
    AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP: 'not-an-integer',
  };

  // When
  const result = parseWebAiTutorConfig(env);

  // Then
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('Expected invalid cap config to fail');
  }
  assert.deepEqual(
    result.issues.map((issue) => `${issue.envName}:${issue.code}`),
    [
      'AI_TUTOR_MODEL_TIMEOUT_MS:out_of_range',
      'AI_TUTOR_RECENT_TURN_COUNT_CAP:out_of_range',
      'AI_TUTOR_RECENT_TURN_CHARACTER_CAP:out_of_range',
      'AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP:invalid_integer',
    ],
  );
});

test('web config rejects auth development fallback secret', () => {
  // Given
  const env = {
    ...completeWebEnv,
    STUDENT_TOKEN_SECRET: 'dev-fallback-secret-change-me',
  };

  // When
  const result = parseWebAiTutorConfig(env);

  // Then
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('Expected fallback secret rejection');
  }
  assert.deepEqual(
    result.issues.map((issue) => `${issue.envName}:${issue.code}`),
    ['STUDENT_TOKEN_SECRET:forbidden_fallback_secret'],
  );
});

test('web config is isolated from Google Chat flags and pairing secret', () => {
  // Given
  const chatOffWebOn = {
    ...completeWebEnv,
    AI_TUTOR_ENABLED: 'false',
    AI_TUTOR_PAIRING_HMAC_SECRET: undefined,
  };
  const chatEnv: AiTutorEnvironment = {
    AI_TUTOR_ENABLED: 'false',
  };

  // When
  const web = parseWebAiTutorConfig(chatOffWebOn);
  const chat = parseAiTutorConfig(chatEnv);

  // Then
  assert.equal(web.ok, true);
  if (!web.ok) {
    assert.fail('Expected web config to ignore Chat-only disabled flag and pairing secret');
  }
  assert.equal(web.config.status, 'enabled');
  assert.equal(chat.ok, true);
  if (!chat.ok) {
    assert.fail('Expected Chat disabled config to remain parseable');
  }
  assert.equal(chat.config.status, 'disabled');
});

test('web config serialized results never contain env values', () => {
  // Given
  const secretMarkers = [
    completeWebEnv.GEMINI_API_KEY,
    completeWebEnv.STUDENT_TOKEN_SECRET,
    completeWebEnv.SUPABASE_SERVICE_KEY,
    completeWebEnv.NEXT_PUBLIC_SUPABASE_URL,
  ];

  // When
  const enabled = parseWebAiTutorConfig(completeWebEnv);
  const disabled = parseWebAiTutorConfig({
    ...completeWebEnv,
    GEMINI_API_KEY: 'synthetic-missing-secret-marker',
    STUDENT_TOKEN_SECRET: '',
  });
  const serialized = JSON.stringify([enabled, disabled]);

  // Then
  for (const marker of secretMarkers) {
    if (marker === undefined) {
      assert.fail('Expected complete fixture marker');
    }
    assert.equal(serialized.includes(marker), false);
  }
  assert.equal(serialized.includes('synthetic-missing-secret-marker'), false);
});

test('AI_TUTOR_WEB_ENV_NAMES documents the isolated web config surface', () => {
  // Given / When / Then
  assert.deepEqual(AI_TUTOR_WEB_ENV_NAMES, [
    'AI_TUTOR_WEB_ENABLED',
    'AI_TUTOR_WEB_PRODUCTION_ENABLED',
    'AI_TUTOR_PAID_BILLING_CONFIRMED',
    'GEMINI_API_KEY',
    'AI_TUTOR_GEMINI_FAST_MODEL',
    'AI_TUTOR_GEMINI_REASONING_MODEL',
    'AI_TUTOR_GEMINI_FALLBACK_MODEL',
    'AI_TUTOR_MODEL_TIMEOUT_MS',
    'AI_TUTOR_RECENT_TURN_COUNT_CAP',
    'AI_TUTOR_RECENT_TURN_CHARACTER_CAP',
    'AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP',
    'STUDENT_TOKEN_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'VERCEL_ENV',
  ]);
});
