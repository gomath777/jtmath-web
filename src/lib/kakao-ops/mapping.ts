const KAKAO_CONTACT_ROLES = ['student', 'parent', 'guardian'] as const;
const KAKAO_ROOM_TYPES = ['direct', 'open_profile', 'open_chat'] as const;
const STUDENT_PORTAL_KINDS = ['online_s', 'offline_c'] as const;
const STUDENT_TYPES = ['online', 'offline'] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const OPEN_ROOM_DRY_RUN_MIN_SAMPLES = 3;
export const OPEN_ROOM_DRY_RUN_RECOMMENDED_MAX_SAMPLES = 5;

export type KakaoContactRole = (typeof KAKAO_CONTACT_ROLES)[number];
export type KakaoRoomType = (typeof KAKAO_ROOM_TYPES)[number];
export type StudentPortalKind = (typeof STUDENT_PORTAL_KINDS)[number];
export type StudentType = (typeof STUDENT_TYPES)[number];

export type BuildStudentRoomMappingInput = {
  readonly profileId: string;
  readonly contactRole?: KakaoContactRole;
  readonly roomType: KakaoRoomType;
  readonly displayName: string;
  readonly portalKind: StudentPortalKind;
};

export type StudentRoomMappingDraft = {
  readonly profileId: string;
  readonly contactRole: 'student';
  readonly roomType: KakaoRoomType;
  readonly displayName: string;
  readonly displayNameNormalized: string;
  readonly matchStrategy: 'exact';
  readonly verificationStatus: 'unverified';
  readonly portalKind: StudentPortalKind;
  readonly portalBasePath: '/s' | '/c';
};

export type DisplayNameCollision = {
  readonly displayNameNormalized: string;
  readonly count: number;
};

export type OpenRoomVerificationInput = {
  readonly roomType: KakaoRoomType;
  readonly successfulDryRunSamples: number;
};

export class KakaoMappingError extends Error {
  readonly name = 'KakaoMappingError';

  constructor(
    readonly code:
      | 'duplicate_display_name'
      | 'empty_display_name'
      | 'invalid_profile_id'
      | 'invalid_dry_run_sample_count'
      | 'insufficient_open_room_samples'
      | 'non_student_contact_role',
    message: string,
  ) {
    super(message);
  }
}

export function normalizeKakaoDisplayName(displayName: string): string {
  const normalized = displayName.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  if (normalized.length === 0) {
    throw new KakaoMappingError('empty_display_name', 'display name is required');
  }
  return normalized;
}

export function portalKindForStudentType(studentType: StudentType): StudentPortalKind {
  switch (studentType) {
    case 'online':
      return 'online_s';
    case 'offline':
      return 'offline_c';
    default:
      return assertNever(studentType);
  }
}

export function portalBasePathFor(portalKind: StudentPortalKind): '/s' | '/c' {
  switch (portalKind) {
    case 'online_s':
      return '/s';
    case 'offline_c':
      return '/c';
    default:
      return assertNever(portalKind);
  }
}

export function buildStudentRoomMappingDraft(input: BuildStudentRoomMappingInput): StudentRoomMappingDraft {
  const contactRole = input.contactRole ?? 'student';
  if (contactRole !== 'student') {
    throw new KakaoMappingError('non_student_contact_role', 'only student contact mappings are sendable in v1');
  }
  if (!UUID_PATTERN.test(input.profileId)) {
    throw new KakaoMappingError('invalid_profile_id', 'profile id must be a UUID');
  }

  return {
    profileId: input.profileId,
    contactRole,
    roomType: input.roomType,
    displayName: input.displayName.trim(),
    displayNameNormalized: normalizeKakaoDisplayName(input.displayName),
    matchStrategy: 'exact',
    verificationStatus: 'unverified',
    portalKind: input.portalKind,
    portalBasePath: portalBasePathFor(input.portalKind),
  };
}

export function isExactNormalizedDisplayNameMatch(
  mapping: StudentRoomMappingDraft,
  candidateDisplayName: string,
): boolean {
  return mapping.displayNameNormalized === normalizeKakaoDisplayName(candidateDisplayName);
}

export function findDisplayNameCollisions(
  mappings: readonly StudentRoomMappingDraft[],
): readonly DisplayNameCollision[] {
  const counts = new Map<string, number>();
  for (const mapping of mappings) {
    counts.set(mapping.displayNameNormalized, (counts.get(mapping.displayNameNormalized) ?? 0) + 1);
  }

  const collisions: DisplayNameCollision[] = [];
  for (const [displayNameNormalized, count] of counts) {
    if (count > 1) collisions.push({ displayNameNormalized, count });
  }
  return collisions;
}

export function assertNoDisplayNameCollisions(mappings: readonly StudentRoomMappingDraft[]): void {
  const collisions = findDisplayNameCollisions(mappings);
  if (collisions.length > 0) {
    throw new KakaoMappingError('duplicate_display_name', 'duplicate normalized display name detected');
  }
}

export function isOpenKakaoRoomType(roomType: KakaoRoomType): boolean {
  return roomType === 'open_profile' || roomType === 'open_chat';
}

export function canVerifyRoomWithDryRunSamples(input: OpenRoomVerificationInput): boolean {
  if (!Number.isInteger(input.successfulDryRunSamples) || input.successfulDryRunSamples < 0) {
    throw new KakaoMappingError('invalid_dry_run_sample_count', 'dry-run sample count must be a non-negative integer');
  }
  if (!isOpenKakaoRoomType(input.roomType)) return true;
  return input.successfulDryRunSamples >= OPEN_ROOM_DRY_RUN_MIN_SAMPLES;
}

export function assertOpenRoomDryRunGate(input: OpenRoomVerificationInput): void {
  if (!canVerifyRoomWithDryRunSamples(input)) {
    throw new KakaoMappingError('insufficient_open_room_samples', 'open rooms require more successful dry-run samples');
  }
}

function assertNever(value: never): never {
  throw new KakaoMappingError('non_student_contact_role', `unreachable mapping value: ${String(value)}`);
}
