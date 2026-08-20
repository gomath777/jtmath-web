import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAiTutorConfig } from './config';
import {
  AI_TUTOR_PRIVATE_BUCKET,
  applyRetentionCleanup,
  buildRetentionCutoffs,
  formatRetentionScopeConfirmation,
  hashStudentReference,
  parsePrivateStoragePath,
  retentionScopeHash,
  type RetentionCandidateSet,
} from './retention';

const now = new Date('2026-08-19T12:00:00.000Z');
const profileId = '20000000-0000-4000-8000-000000000001';
const imageAttachmentId = '30000000-0000-4000-8000-000000000001';
const rawTurnId = '40000000-0000-4000-8000-000000000001';
const metadataTurnId = '50000000-0000-4000-8000-000000000001';

test('hashStudentReference returns a deterministic non-PII label', () => {
  // Given
  const first = hashStudentReference(profileId);

  // When
  const second = hashStudentReference(profileId);

  // Then
  assert.equal(first, second);
  assert.match(first, /^student:sha256:[a-f0-9]{16}$/);
  assert.equal(first.includes(profileId), false);
});

test('retentionScopeHash is deterministic over sorted preview ids', () => {
  // Given
  const candidates = candidateSet({
    rawContentTurnIds: [rawTurnId],
    metadataTurnIds: [metadataTurnId],
    imageAttachmentIds: [imageAttachmentId],
  });

  // When
  const hash = retentionScopeHash(candidates);

  // Then
  assert.equal(hash, retentionScopeHash(candidateSet({
    rawContentTurnIds: [rawTurnId],
    metadataTurnIds: [metadataTurnId],
    imageAttachmentIds: [imageAttachmentId],
  })));
  assert.equal(formatRetentionScopeConfirmation(candidates), `3:${hash}`);
});

test('buildRetentionCutoffs uses config retention defaults', () => {
  // Given
  const parsed = parseAiTutorConfig({});
  assert.equal(parsed.ok, true);

  // When
  const cutoffs = buildRetentionCutoffs(now, parsed.config.retentionDays);

  // Then
  assert.equal(cutoffs.rawContentCutoff, '2026-05-21T12:00:00.000Z');
  assert.equal(cutoffs.imageCutoff, '2026-07-20T12:00:00.000Z');
  assert.equal(cutoffs.metadataCutoff, '2025-08-19T12:00:00.000Z');
});

test('parsePrivateStoragePath accepts only private tutor bucket paths', () => {
  // Given
  const validPath = `${AI_TUTOR_PRIVATE_BUCKET}/profile/turn/hash.jpg`;

  // When
  const parsed = parsePrivateStoragePath(validPath);

  // Then
  assert.deepEqual(parsed, { ok: true, objectPath: 'profile/turn/hash.jpg' });
  assert.deepEqual(parsePrivateStoragePath('public-bucket/profile/turn/hash.jpg'), { ok: false, reason: 'invalid_bucket' });
  assert.deepEqual(parsePrivateStoragePath(`${AI_TUTOR_PRIVATE_BUCKET}/`), { ok: false, reason: 'missing_object_path' });
});

test('applyRetentionCleanup deletes storage before marking attachment rows', async () => {
  // Given
  const store = new FakeRetentionStore();
  const candidates = candidateSet({});

  // When
  const result = await applyRetentionCleanup({
    candidates,
    confirmScope: formatRetentionScopeConfirmation(candidates),
    deletedAt: now.toISOString(),
    store,
  });

  // Then
  assert.deepEqual(result, { ok: true, appliedCount: 3 });
  assert.deepEqual(store.operations, [
    `storage:${imageAttachmentId}:profile/turn/hash.jpg`,
    `mark-image:${imageAttachmentId}`,
    `raw:${rawTurnId}`,
    `metadata:${metadataTurnId}`,
  ]);
});

test('applyRetentionCleanup stops on storage failure before destructive row writes', async () => {
  // Given
  const store = new FakeRetentionStore({ failStorage: true });
  const candidates = candidateSet({});

  // When
  const result = await applyRetentionCleanup({
    candidates,
    confirmScope: formatRetentionScopeConfirmation(candidates),
    deletedAt: now.toISOString(),
    store,
  });

  // Then
  assert.equal(result.ok, false);
  assert.deepEqual(store.operations, [`storage:${imageAttachmentId}:profile/turn/hash.jpg`]);
});

test('applyRetentionCleanup requires matching confirmation and is idempotent for already-cleared images', async () => {
  // Given
  const alreadyCleared = candidateSet({
    imageAttachments: [{ attachmentId: imageAttachmentId, privateStoragePath: null }],
  });
  const store = new FakeRetentionStore();

  // When
  const rejected = await applyRetentionCleanup({
    candidates: alreadyCleared,
    confirmScope: '1:bad',
    deletedAt: now.toISOString(),
    store,
  });
  const accepted = await applyRetentionCleanup({
    candidates: alreadyCleared,
    confirmScope: formatRetentionScopeConfirmation(alreadyCleared),
    deletedAt: now.toISOString(),
    store,
  });

  // Then
  assert.equal(rejected.ok, false);
  assert.deepEqual(store.operations, [`mark-image:${imageAttachmentId}`, `raw:${rawTurnId}`, `metadata:${metadataTurnId}`]);
  assert.deepEqual(accepted, { ok: true, appliedCount: 3 });
});

type CandidateInput = {
  readonly imageAttachments?: RetentionCandidateSet['imageAttachments'];
  readonly imageAttachmentIds?: readonly string[];
  readonly rawContentTurnIds?: readonly string[];
  readonly metadataTurnIds?: readonly string[];
};

function candidateSet(input: CandidateInput): RetentionCandidateSet {
  const imageAttachments = input.imageAttachments ?? (input.imageAttachmentIds ?? [imageAttachmentId]).map((attachmentId) => ({
    attachmentId,
    privateStoragePath: `${AI_TUTOR_PRIVATE_BUCKET}/profile/turn/hash.jpg`,
  }));
  return {
    imageAttachments,
    rawContentTurnIds: input.rawContentTurnIds ?? [rawTurnId],
    metadataTurnIds: input.metadataTurnIds ?? [metadataTurnId],
  };
}

class FakeRetentionStore {
  readonly operations: string[] = [];

  constructor(private readonly options: { readonly failStorage?: boolean } = {}) {}

  async deletePrivateObject(input: { readonly attachmentId: string; readonly objectPath: string }): Promise<{ readonly ok: true } | { readonly ok: false; readonly operation: string }> {
    this.operations.push(`storage:${input.attachmentId}:${input.objectPath}`);
    return this.options.failStorage ? { ok: false, operation: 'delete_private_object' } : { ok: true };
  }

  async markAttachmentImageDeleted(input: { readonly attachmentId: string }): Promise<{ readonly ok: true }> {
    this.operations.push(`mark-image:${input.attachmentId}`);
    return { ok: true };
  }

  async markRawContentDeleted(input: { readonly turnId: string }): Promise<{ readonly ok: true }> {
    this.operations.push(`raw:${input.turnId}`);
    return { ok: true };
  }

  async deleteTurnMetadata(input: { readonly turnId: string }): Promise<{ readonly ok: true }> {
    this.operations.push(`metadata:${input.turnId}`);
    return { ok: true };
  }
}
