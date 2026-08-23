import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPreviewWebAdmission,
  hashWebAdmissionProfileKey,
  type WebAdmissionClock,
} from './web-admission';

test('preview admission accepts the first request and releases concurrency in finally', async () => {
  // Given
  const clock = mutableClock(1_000);
  const admission = createPreviewWebAdmission({ secret: 'synthetic-secret', clock });
  const key = await hashWebAdmissionProfileKey({ profileId: 'profile-one', secret: 'synthetic-secret' });

  // When
  const first = admission.tryAcquire(key);
  if (!first.accepted) assert.fail('Expected first acquire to be accepted');
  first.release();
  const second = admission.tryAcquire(key);

  // Then
  assert.equal(second.accepted, true);
  if (second.accepted) second.release();
  assert.equal(admission.debugSize(), 1);
});

test('preview admission rejects a concurrent duplicate with integer Retry-After', async () => {
  // Given
  const admission = createPreviewWebAdmission({ secret: 'synthetic-secret', clock: mutableClock(2_000) });
  const key = 'already-hashed-key';
  const first = admission.tryAcquire(key);
  if (!first.accepted) assert.fail('Expected first acquire');

  // When
  const duplicate = admission.tryAcquire(key);

  // Then
  assert.deepEqual(duplicate, { accepted: false, retryAfterSeconds: 1, reason: 'concurrent' });
  first.release();
});

test('preview admission rejects the fourth accepted request per 60 seconds and recovers after clock advance', () => {
  // Given
  const clock = mutableClock(10_000);
  const admission = createPreviewWebAdmission({ secret: 'synthetic-secret', clock });
  const key = 'rate-key';

  // When
  for (let index = 0; index < 3; index += 1) {
    const permit = admission.tryAcquire(key);
    assert.equal(permit.accepted, true);
    if (permit.accepted) permit.release();
  }
  const fourth = admission.tryAcquire(key);
  clock.advance(60_000);
  const afterWindow = admission.tryAcquire(key);

  // Then
  assert.deepEqual(fourth, { accepted: false, retryAfterSeconds: 60, reason: 'rate_limited' });
  assert.equal(afterWindow.accepted, true);
  if (afterWindow.accepted) afterWindow.release();
});

test('preview admission prunes expired entries and keeps a bounded map size', () => {
  // Given
  const clock = mutableClock(0);
  const admission = createPreviewWebAdmission({ secret: 'synthetic-secret', clock, maxEntries: 2 });

  // When
  for (const key of ['one', 'two']) {
    const permit = admission.tryAcquire(key);
    assert.equal(permit.accepted, true);
    if (permit.accepted) permit.release();
  }
  clock.advance(61_000);
  const third = admission.tryAcquire('three');
  if (third.accepted) third.release();
  const held = admission.tryAcquire('held');
  const fourth = admission.tryAcquire('four');

  // Then
  assert.equal(third.accepted, true);
  assert.equal(held.accepted, true);
  assert.deepEqual(fourth, { accepted: false, retryAfterSeconds: 60, reason: 'capacity' });
  assert.equal(admission.debugSize(), 2);
  if (held.accepted) held.release();
});

function mutableClock(initialMs: number): WebAdmissionClock & { readonly advance: (ms: number) => void } {
  let nowMs = initialMs;
  return {
    nowMs: () => nowMs,
    advance: (ms) => {
      nowMs += ms;
    },
  };
}
