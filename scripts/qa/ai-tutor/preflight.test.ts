import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runAiTutorPreflight, type AiTutorPreflightEnv } from '../ai-tutor-preflight';

test('preflight reports names only and fails closed when paid/media/storage controls are missing', () => {
  const result = runAiTutorPreflight({
    env: { AI_TUTOR_ENABLED: 'true' },
    mode: 'local',
    namesOnly: true,
  });

  assert.equal(result.exitCode, 1);
  assert.ok(result.lines.every((line) => !line.includes('secret-value')));
  assert.ok(result.lines.some((line) => line === 'FAIL AI_TUTOR_PAID_BILLING_CONFIRMED'));
  assert.ok(result.lines.some((line) => line === 'FAIL GOOGLE_CHAT_MEDIA_AUTH_READY'));
  assert.ok(result.lines.some((line) => line === 'FAIL AI_TUTOR_PRIVATE_STORAGE_READY'));
});

test('preflight passes with a synthetic complete env-name manifest without printing values', () => {
  const result = runAiTutorPreflight({
    env: completeEnv(),
    mode: 'preview',
    namesOnly: true,
  });

  assert.equal(result.exitCode, 0);
  assert.ok(result.lines.some((line) => line === 'PASS AI_TUTOR_RUNTIME_CONFIG'));
  assert.doesNotMatch(result.lines.join('\n'), /secret-value|https:\/\/preview\.example\.test|service-key/);
});

test('preflight refuses production feature enablement before an explicit deployment window', () => {
  const result = runAiTutorPreflight({
    env: completeEnv(),
    mode: 'production',
    namesOnly: false,
  });

  assert.equal(result.exitCode, 1);
  assert.ok(result.lines.some((line) => line.includes('FAIL PRODUCTION_ENABLEMENT_GATE')));
});

test('preflight emits formula-only cost scenarios from caller-supplied current rates', () => {
  const result = runAiTutorPreflight({
    env: completeEnv(),
    mode: 'local',
    namesOnly: true,
    rates: {
      textInputPerMillion: 1,
      textOutputPerMillion: 2,
      imageInputPerUnit: 0.01,
      storageGbMonth: 0.1,
      vercelOveragePerMillionRequests: 1,
      supabaseOveragePerGb: 0.2,
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.lines.filter((line) => line.startsWith('INFO COST_ESTIMATE')).length, 3);
  assert.match(result.lines.join('\n'), /students=5/);
  assert.match(result.lines.join('\n'), /students=30/);
  assert.match(result.lines.join('\n'), /students=100/);
});

test('operations runbook documents preview gates rollback and formula-only pricing', async () => {
  const runbook = await readFile(new URL('../../../docs/google-chat-ai-tutor-operations.md', import.meta.url), 'utf8');

  assert.match(runbook, /preview-only/);
  assert.match(runbook, /AI_TUTOR_ENABLED=false/);
  assert.match(runbook, /Do not hardcode model prices/);
  assert.match(runbook, /Google AI Pro is not the same thing as Gemini API billing/);
});

function completeEnv(overrides: AiTutorPreflightEnv = {}): AiTutorPreflightEnv {
  return {
    AI_TUTOR_ENABLED: 'true',
    AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
    GEMINI_API_KEY: 'secret-value',
    AI_TUTOR_PAIRING_HMAC_SECRET: 'hmac-secret',
    AI_TUTOR_GEMINI_TEXT_MODEL: 'gemini-2.5-flash',
    AI_TUTOR_GEMINI_VISION_MODEL: 'gemini-2.5-flash',
    AI_TUTOR_MODEL_TIMEOUT_MS: '20000',
    AI_TUTOR_RECENT_TURN_COUNT_CAP: '6',
    AI_TUTOR_RECENT_TURN_CHARACTER_CAP: '1200',
    AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP: '6000',
    AI_TUTOR_IMAGE_MAX_BYTES: '8388608',
    AI_TUTOR_RAW_RETENTION_DAYS: '90',
    AI_TUTOR_IMAGE_RETENTION_DAYS: '30',
    AI_TUTOR_METADATA_RETENTION_DAYS: '365',
    AI_TUTOR_ALLOW_UNSTABLE_MODELS_IN_TESTS: 'false',
    GOOGLE_CHAT_ENDPOINT_URL: 'https://preview.example.test/api/google-chat',
    GOOGLE_CHAT_SERVICE_ACCOUNT_EMAIL: 'service-account@example.iam.gserviceaccount.com',
    GOOGLE_CHAT_MEDIA_CLIENT_EMAIL: 'media-service@example.iam.gserviceaccount.com',
    GOOGLE_CHAT_MEDIA_PRIVATE_KEY: 'secret-media-private-key',
    GOOGLE_CHAT_MEDIA_AUTH_READY: 'true',
    AI_TUTOR_PRIVATE_STORAGE_READY: 'true',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_KEY: 'service-key',
    ...overrides,
  };
}
