import { createHmac, randomInt as cryptoRandomInt } from 'node:crypto';
import type { AiTutorIdentity, AiTutorRepository, AiTutorRepositoryResult } from './repository';

const PAIRING_CODE_LENGTH = 8;
const PAIRING_TTL_MS = 15 * 60 * 1000;
const PAIRING_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CHAT_USER_NAME_PATTERN = /^users\/[A-Za-z0-9_.-]+$/;

export type GoogleChatIdentityPairingResult =
  | {
      readonly kind: 'pairing_created';
      readonly identityId: string;
      readonly pairingCode: string;
      readonly expiresAt: string;
    }
  | { readonly kind: 'linked'; readonly identityId: string; readonly profileId: string }
  | { readonly kind: 'pending_exists'; readonly identityId: string }
  | { readonly kind: 'revoked'; readonly identityId: string }
  | { readonly kind: 'invalid_identity' }
  | { readonly kind: 'repository_error'; readonly operation: string; readonly code: string };

export type GoogleChatIdentityPairingInput = {
  readonly repository: Pick<AiTutorRepository, 'lookupIdentity' | 'createPendingIdentity'>;
  readonly chatUserName: string;
  readonly hmacSecret: string;
  readonly now: Date;
  readonly randomInt?: (maxExclusive: number) => number;
};

export function isStableGoogleChatUserName(value: string): boolean {
  return CHAT_USER_NAME_PATTERN.test(value);
}

export function normalizeGoogleChatPairingCode(code: string): string {
  return code.trim().replace(/[\s-]/g, '').toLocaleUpperCase('en-US');
}

export function hashGoogleChatPairingCode(code: string, hmacSecret: string): string {
  return createHmac('sha256', hmacSecret)
    .update(normalizeGoogleChatPairingCode(code), 'utf8')
    .digest('hex');
}

export function generateGoogleChatPairingCode(randomInt = cryptoRandomInt): string {
  return Array.from({ length: PAIRING_CODE_LENGTH }, () =>
    PAIRING_ALPHABET[randomInt(PAIRING_ALPHABET.length)] ?? '2',
  ).join('');
}

export async function createGoogleChatIdentityPairing(
  input: GoogleChatIdentityPairingInput,
): Promise<GoogleChatIdentityPairingResult> {
  if (!isStableGoogleChatUserName(input.chatUserName)) return { kind: 'invalid_identity' };

  const existing = await input.repository.lookupIdentity({ chatUserName: input.chatUserName });
  if (!existing.ok) return repositoryError(existing);
  if (existing.value !== null) return existingIdentityResult(existing.value);

  const pairingCode = generateGoogleChatPairingCode(input.randomInt);
  const expiresAt = new Date(input.now.getTime() + PAIRING_TTL_MS).toISOString();
  const created = await input.repository.createPendingIdentity({
    chatUserName: input.chatUserName,
    pairingCodeHash: hashGoogleChatPairingCode(pairingCode, input.hmacSecret),
    pairingCodeExpiresAt: expiresAt,
  });
  if (!created.ok) {
    if (created.error.code === 'conflict') return { kind: 'pending_exists', identityId: 'redacted' };
    return repositoryError(created);
  }

  return {
    kind: 'pairing_created',
    identityId: created.value.id,
    pairingCode,
    expiresAt,
  };
}

function existingIdentityResult(identity: AiTutorIdentity): GoogleChatIdentityPairingResult {
  switch (identity.status) {
    case 'active':
      return identity.profileId === null
        ? { kind: 'repository_error', operation: 'lookup_identity', code: 'invalid_response' }
        : { kind: 'linked', identityId: identity.id, profileId: identity.profileId };
    case 'pending':
      return { kind: 'pending_exists', identityId: identity.id };
    case 'revoked':
      return { kind: 'revoked', identityId: identity.id };
    default:
      return assertNever(identity.status);
  }
}

function repositoryError(result: AiTutorRepositoryResult<unknown>): GoogleChatIdentityPairingResult {
  if (result.ok) return { kind: 'repository_error', operation: 'unknown', code: 'invalid_response' };
  return { kind: 'repository_error', operation: result.error.operation, code: result.error.code };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected identity status: ${String(value)}`);
}
