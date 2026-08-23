import assert from 'node:assert/strict';
import test from 'node:test';
import {
  categorizeAiTutorError,
  createAiTutorObservability,
  type AiTutorLogRecord,
} from './observability';

test('createAiTutorObservability emits only content-free structured fields', () => {
  // Given
  const records: AiTutorLogRecord[] = [];
  const logger = createAiTutorObservability({
    hashSalt: 'test-salt',
    requestIdFactory: () => '00000000-0000-4000-8000-000000000001',
    sink: (record) => records.push(record),
  });

  // When
  logger.record({
    eventClass: 'provider',
    status: 'completed',
    externalId: 'spaces/raw-space/messages/raw-message',
    turnId: 'turn-raw-id',
    durationMs: 345,
    tokenCounts: {
      input: 120,
      output: 80,
      total: 200,
    },
    attemptCount: 2,
    modelAlias: 'text',
    materialKind: 'guide',
    guideSchemaVersion: 1,
  });

  // Then
  assert.equal(records.length, 1);
  assert.deepEqual(Object.keys(records[0] ?? {}).sort(), [
    'attemptCount',
    'durationMs',
    'eventClass',
    'externalIdHash',
    'guideSchemaVersion',
    'materialKind',
    'modelAlias',
    'requestId',
    'status',
    'tokenCounts',
    'turnIdHash',
  ]);
  assert.equal(JSON.stringify(records).includes('spaces/raw-space'), false);
  assert.equal(JSON.stringify(records).includes('turn-raw-id'), false);
});

test('createAiTutorObservability maps errors to stable categories without logging messages', () => {
  // Given
  const records: AiTutorLogRecord[] = [];
  const logger = createAiTutorObservability({
    hashSalt: 'test-salt',
    requestIdFactory: () => '00000000-0000-4000-8000-000000000002',
    sink: (record) => records.push(record),
  });
  const providerBody = 'provider said: synthetic student content and synthetic token text';

  // When
  logger.record({
    eventClass: 'provider',
    status: 'failed',
    externalId: 'users/raw-user-id',
    durationMs: 99,
    modelAlias: 'vision',
    error: new Error(providerBody),
  });

  // Then
  assert.equal(records.length, 1);
  assert.equal(records[0]?.errorCategory, 'unknown');
  assert.equal(JSON.stringify(records).includes(providerBody), false);
  assert.equal(JSON.stringify(records).includes('users/raw-user-id'), false);
});

test('createAiTutorObservability redacts free-form content by construction', () => {
  // Given
  const records: AiTutorLogRecord[] = [];
  const logger = createAiTutorObservability({
    hashSalt: 'test-salt',
    requestIdFactory: () => '00000000-0000-4000-8000-000000000003',
    sink: (record) => records.push(record),
  });

  // When
  logger.record({
    eventClass: 'request',
    status: 'rejected',
    externalId: 'https://chat.googleapis.com/v1/media?key=secret',
    errorCategory: 'unsupported',
    modelAlias: 'none',
  });

  // Then
  const serialized = JSON.stringify(records);
  assert.equal(serialized.includes('https://'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.equal(records[0]?.externalIdHash?.length, 64);
});

test('categorizeAiTutorError classifies known operational failures', () => {
  // Given / When / Then
  assert.equal(categorizeAiTutorError({ category: 'timeout' }), 'timeout');
  assert.equal(categorizeAiTutorError({ category: 'repository' }), 'repository');
  assert.equal(categorizeAiTutorError(new Error('raw Supabase error body')), 'unknown');
});
