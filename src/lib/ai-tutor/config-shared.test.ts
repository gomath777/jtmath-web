import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAiTutorSharedConfig } from './config-shared';
import type { AiTutorConfigIssue, AiTutorEnvironment } from './config';

test('parseAiTutorSharedConfig returns shared defaults and accumulates bounded integer issues', () => {
  // Given
  const env: AiTutorEnvironment = {
    AI_TUTOR_MODEL_TIMEOUT_MS: '22001',
    AI_TUTOR_RECENT_TURN_COUNT_CAP: '6',
    AI_TUTOR_RECENT_TURN_CHARACTER_CAP: '1200',
    AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP: '6000',
    AI_TUTOR_IMAGE_MAX_BYTES: `${8 * 1024 * 1024}`,
  };
  const issues: AiTutorConfigIssue[] = [];

  // When
  const config = parseAiTutorSharedConfig(env, issues);

  // Then
  assert.equal(config.modelTimeoutMs, 20_000);
  assert.deepEqual(config.caps, {
    recentTurnCount: 6,
    recentTurnCharacters: 1_200,
    recentTotalCharacters: 6_000,
  });
  assert.deepEqual(config.image, { maxBytes: 8 * 1024 * 1024 });
  assert.deepEqual(config.retentionDays, {
    rawContent: 90,
    image: 30,
    metadata: 365,
  });
  assert.deepEqual(issues, [
    { envName: 'AI_TUTOR_MODEL_TIMEOUT_MS', code: 'out_of_range' },
  ]);
});
