import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_TUTOR_ENV_NAMES,
  parseAiTutorConfig,
  type AiTutorEnvironment,
} from './config';

const completeEnv: AiTutorEnvironment = {
  AI_TUTOR_ENABLED: 'true',
  AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
  GEMINI_API_KEY: 'synthetic-secret-never-returned',
  AI_TUTOR_PAIRING_HMAC_SECRET: 'synthetic-hmac-secret-never-returned',
  AI_TUTOR_GEMINI_TEXT_MODEL: 'gemini-2.5-flash',
  AI_TUTOR_GEMINI_VISION_MODEL: 'gemini-2.5-flash',
};

test('parseAiTutorConfig returns typed enabled config when production requirements are present', () => {
  // Given
  const env = completeEnv;

  // When
  const result = parseAiTutorConfig(env);

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail('Expected config to parse');
  }
  assert.equal(result.config.status, 'enabled');
  assert.equal(result.config.geminiApiKey.present, true);
  assert.equal(result.config.pairingHmacSecret.present, true);
  assert.equal('value' in result.config.geminiApiKey, false);
  assert.equal('value' in result.config.pairingHmacSecret, false);
  assert.equal(result.config.textModel.id, 'gemini-3.1-flash-lite');
  assert.equal(result.config.modelTimeoutMs, 20_000);
  assert.equal(result.config.image.maxBytes, 8 * 1024 * 1024);
  assert.deepEqual(result.config.retentionDays, {
    rawContent: 90,
    image: 30,
    metadata: 365,
  });
});

test('parseAiTutorConfig accepts feature-off config without constructing provider requirements', () => {
  // Given
  const env: AiTutorEnvironment = {
    AI_TUTOR_ENABLED: 'false',
  };

  // When
  const result = parseAiTutorConfig(env);

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail('Expected disabled config to parse');
  }
  assert.equal(result.config.status, 'disabled');
  assert.equal(result.config.enabled, false);
});

test('parseAiTutorConfig fails closed when enabled without paid billing acknowledgement', () => {
  // Given
  const env: AiTutorEnvironment = {
    ...completeEnv,
    AI_TUTOR_PAID_BILLING_CONFIRMED: 'false',
  };

  // When
  const result = parseAiTutorConfig(env);

  // Then
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('Expected config to fail');
  }
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['paid_billing_required'],
  );
  assert.equal(JSON.stringify(result).includes('synthetic-secret-never-returned'), false);
});

test('parseAiTutorConfig fails closed when enabled without Gemini key presence', () => {
  // Given
  const env: AiTutorEnvironment = {
    ...completeEnv,
    GEMINI_API_KEY: '',
  };

  // When
  const result = parseAiTutorConfig(env);

  // Then
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('Expected config to fail');
  }
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['missing_secret'],
  );
});

test('parseAiTutorConfig fails closed when enabled without pairing HMAC secret presence', () => {
  // Given
  const env: AiTutorEnvironment = {
    ...completeEnv,
    AI_TUTOR_PAIRING_HMAC_SECRET: '',
  };

  // When
  const result = parseAiTutorConfig(env);

  // Then
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('Expected config to fail');
  }
  assert.deepEqual(
    result.issues.map((issue) => `${issue.envName}:${issue.code}`),
    ['AI_TUTOR_PAIRING_HMAC_SECRET:missing_secret'],
  );
});

test('parseAiTutorConfig rejects latest and preview model aliases in production', () => {
  // Given
  const env: AiTutorEnvironment = {
    ...completeEnv,
    AI_TUTOR_GEMINI_TEXT_MODEL: 'gemini-2.5-flash-latest',
    AI_TUTOR_GEMINI_VISION_MODEL: 'gemini-2.5-pro-preview-06-05',
  };

  // When
  const result = parseAiTutorConfig(env);

  // Then
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('Expected config to fail');
  }
  assert.deepEqual(
    result.issues.map((issue) => `${issue.envName}:${issue.code}`),
    [
      'AI_TUTOR_GEMINI_TEXT_MODEL:unstable_model_alias',
      'AI_TUTOR_GEMINI_VISION_MODEL:unstable_model_alias',
    ],
  );
});

test('parseAiTutorConfig allows unstable aliases only with explicit non-production test flag', () => {
  // Given
  const env: AiTutorEnvironment = {
    ...completeEnv,
    AI_TUTOR_GEMINI_TEXT_MODEL: 'gemini-2.5-flash-latest',
    AI_TUTOR_GEMINI_VISION_MODEL: 'gemini-2.5-pro-preview-06-05',
    AI_TUTOR_ALLOW_UNSTABLE_MODELS_IN_TESTS: 'true',
  };

  // When
  const result = parseAiTutorConfig(env, { runtime: 'test' });

  // Then
  assert.equal(result.ok, true);
});

test('parseAiTutorConfig enforces timeout, recent-context, image, and retention bounds', () => {
  // Given
  const env: AiTutorEnvironment = {
    ...completeEnv,
    AI_TUTOR_MODEL_TIMEOUT_MS: '22001',
    AI_TUTOR_RECENT_TURN_COUNT_CAP: '13',
    AI_TUTOR_RECENT_TURN_CHARACTER_CAP: '2001',
    AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP: '8001',
    AI_TUTOR_IMAGE_MAX_BYTES: `${8 * 1024 * 1024 + 1}`,
    AI_TUTOR_RAW_RETENTION_DAYS: '89',
    AI_TUTOR_IMAGE_RETENTION_DAYS: '29',
    AI_TUTOR_METADATA_RETENTION_DAYS: '364',
  };

  // When
  const result = parseAiTutorConfig(env);

  // Then
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('Expected config to fail');
  }
  assert.deepEqual(
    result.issues.map((issue) => issue.envName),
    [
      'AI_TUTOR_MODEL_TIMEOUT_MS',
      'AI_TUTOR_RECENT_TURN_COUNT_CAP',
      'AI_TUTOR_RECENT_TURN_CHARACTER_CAP',
      'AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP',
      'AI_TUTOR_IMAGE_MAX_BYTES',
      'AI_TUTOR_RAW_RETENTION_DAYS',
      'AI_TUTOR_IMAGE_RETENTION_DAYS',
      'AI_TUTOR_METADATA_RETENTION_DAYS',
    ],
  );
});

test('AI_TUTOR_ENV_NAMES documents the complete runtime config surface', () => {
  // Given
  const names = AI_TUTOR_ENV_NAMES;

  // When / Then
  assert.deepEqual(names, [
    'AI_TUTOR_ENABLED',
    'AI_TUTOR_PAID_BILLING_CONFIRMED',
    'GEMINI_API_KEY',
    'AI_TUTOR_PAIRING_HMAC_SECRET',
    'AI_TUTOR_GEMINI_TEXT_MODEL',
    'AI_TUTOR_GEMINI_VISION_MODEL',
    'AI_TUTOR_GEMINI_FALLBACK_MODEL',
    'AI_TUTOR_MODEL_TIMEOUT_MS',
    'AI_TUTOR_RECENT_TURN_COUNT_CAP',
    'AI_TUTOR_RECENT_TURN_CHARACTER_CAP',
    'AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP',
    'AI_TUTOR_IMAGE_MAX_BYTES',
    'AI_TUTOR_RAW_RETENTION_DAYS',
    'AI_TUTOR_IMAGE_RETENTION_DAYS',
    'AI_TUTOR_METADATA_RETENTION_DAYS',
    'AI_TUTOR_ALLOW_UNSTABLE_MODELS_IN_TESTS',
  ]);
});

test('parseAiTutorConfig maps the retired Gemini 2.5 Flash tutor model to the stable 3.1 Flash Lite model', () => {
  // Given
  const env = completeEnv;

  // When
  const result = parseAiTutorConfig(env);

  // Then
  assert.equal(result.ok, true);
  if (result.ok && result.config.status === 'enabled') {
    assert.equal(result.config.textModel.id, 'gemini-3.1-flash-lite');
    assert.equal(result.config.visionModel.id, 'gemini-3.1-flash-lite');
  } else {
    assert.fail('Expected config to parse');
  }
});

test('parseAiTutorConfig accepts a separately configured stable fallback model', () => {
  // Given
  const env: AiTutorEnvironment = {
    ...completeEnv,
    AI_TUTOR_GEMINI_FALLBACK_MODEL: 'gemini-3.1-flash',
  };

  // When
  const result = parseAiTutorConfig(env);

  // Then
  assert.equal(result.ok, true);
  if (result.ok && result.config.status === 'enabled') {
    assert.deepEqual(result.config.fallbackModel, { id: 'gemini-3.1-flash', alias: 'fallback' });
  } else {
    assert.fail('Expected config to parse');
  }
});
