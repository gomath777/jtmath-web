import assert from 'node:assert/strict';
import test from 'node:test';
import type { AiTutorIdentity, AiTutorRepository, AiTutorRepositoryResult } from './repository';
import {
  createGoogleChatIdentityPairing,
  hashGoogleChatPairingCode,
} from './identity';

const chatUserName = 'users/123456789';
const now = new Date('2026-08-19T00:00:00.000Z');
const secret = 'synthetic-hmac-secret-with-enough-length';

test('createGoogleChatIdentityPairing creates one pending identity for an unknown stable Chat user', async () => {
  // Given
  const repository = new FakeIdentityRepository();

  // When
  const result = await createGoogleChatIdentityPairing({
    repository,
    chatUserName,
    hmacSecret: secret,
    now,
    randomInt: () => 0,
  });

  // Then
  assert.equal(result.kind, 'pairing_created');
  assert.equal(result.pairingCode, '22222222');
  assert.equal(result.expiresAt, '2026-08-19T00:15:00.000Z');
  assert.equal(repository.created.length, 1);
  assert.equal(repository.created[0]?.pairingCodeHash, hashGoogleChatPairingCode('22222222', secret));
  assert.equal(JSON.stringify(repository.created).includes('22222222'), false);
});

test('createGoogleChatIdentityPairing returns linked without generating a code for active identities', async () => {
  // Given
  const repository = new FakeIdentityRepository({
    id: '10000000-0000-4000-8000-000000000001',
    chatUserName,
    profileId: '20000000-0000-4000-8000-000000000001',
    status: 'active',
  });
  let randomCalls = 0;

  // When
  const result = await createGoogleChatIdentityPairing({
    repository,
    chatUserName,
    hmacSecret: secret,
    now,
    randomInt: () => {
      randomCalls += 1;
      return 0;
    },
  });

  // Then
  assert.equal(result.kind, 'linked');
  assert.equal(randomCalls, 0);
  assert.equal(repository.created.length, 0);
});

test('createGoogleChatIdentityPairing rejects display-name or email lookup values', async () => {
  // Given
  const repository = new FakeIdentityRepository();

  // When
  const result = await createGoogleChatIdentityPairing({
    repository,
    chatUserName: 'student@example.com',
    hmacSecret: secret,
    now,
    randomInt: () => 0,
  });

  // Then
  assert.equal(result.kind, 'invalid_identity');
  assert.equal(repository.created.length, 0);
});

test('createGoogleChatIdentityPairing refuses to reveal another plaintext code for an existing pending identity', async () => {
  // Given
  const repository = new FakeIdentityRepository({
    id: '10000000-0000-4000-8000-000000000002',
    chatUserName,
    profileId: null,
    status: 'pending',
  });

  // When
  const result = await createGoogleChatIdentityPairing({
    repository,
    chatUserName,
    hmacSecret: secret,
    now,
    randomInt: () => 0,
  });

  // Then
  assert.equal(result.kind, 'pending_exists');
  assert.equal(repository.created.length, 0);
});

test('createGoogleChatIdentityPairing redacts repository failures', async () => {
  // Given
  const repository = new FakeIdentityRepository(null, true);

  // When
  const result = await createGoogleChatIdentityPairing({
    repository,
    chatUserName,
    hmacSecret: secret,
    now,
    randomInt: () => 0,
  });

  // Then
  assert.equal(result.kind, 'repository_error');
  assert.equal(JSON.stringify(result).includes(chatUserName), false);
  assert.equal(JSON.stringify(result).includes(secret), false);
});

class FakeIdentityRepository implements Pick<AiTutorRepository, 'lookupIdentity' | 'createPendingIdentity'> {
  readonly created: Array<{
    readonly chatUserName: string;
    readonly pairingCodeHash: string;
    readonly pairingCodeExpiresAt: string;
  }> = [];

  constructor(
    private readonly identity: AiTutorIdentity | null = null,
    private readonly failLookup = false,
  ) {}

  async lookupIdentity(): Promise<AiTutorRepositoryResult<AiTutorIdentity | null>> {
    if (this.failLookup) return { ok: false, error: { code: 'unavailable', operation: 'lookup_identity' } };
    return { ok: true, value: this.identity };
  }

  async createPendingIdentity(input: {
    readonly chatUserName: string;
    readonly pairingCodeHash: string;
    readonly pairingCodeExpiresAt: string;
  }): Promise<AiTutorRepositoryResult<AiTutorIdentity>> {
    this.created.push(input);
    return {
      ok: true,
      value: {
        id: '10000000-0000-4000-8000-000000000003',
        chatUserName: input.chatUserName,
        profileId: null,
        status: 'pending',
      },
    };
  }
}
