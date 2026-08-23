import { createHash } from 'node:crypto';
import type { TutorImageInput } from './contracts';
import type { NormalizedTutorImage } from './image-pipeline';
import {
  mediaReviewOutcome,
  type AiTutorMediaReviewOutcome,
  type RasterImageMimeType,
} from './chat-media';

export const AI_TUTOR_PRIVATE_BUCKET = 'ai-tutor-private';

export type PrivateImageUploadInput = {
  readonly bucket: typeof AI_TUTOR_PRIVATE_BUCKET;
  readonly objectPath: string;
  readonly bytes: Uint8Array;
  readonly contentType: 'image/jpeg';
  readonly upsert: false;
};
export type PrivateImageUploadResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: { readonly code: 'storage_unavailable' | 'permission_denied' } };
export interface PrivateImageStoragePort {
  uploadPrivateObject(input: PrivateImageUploadInput): Promise<PrivateImageUploadResult>;
}

export type PrivateImageMetadataInput = {
  readonly profileId: string;
  readonly turnId: string;
  readonly attachmentResourceName: string;
  readonly declaredMimeType: RasterImageMimeType;
  readonly normalizedMimeType: 'image/jpeg';
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly privateStoragePath: string;
  readonly status: 'stored';
};
export type PrivateImageMetadataResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: { readonly code: 'metadata_unavailable' | 'permission_denied' } };
export interface PrivateImageMetadataPort {
  recordPrivateImage(input: PrivateImageMetadataInput): Promise<PrivateImageMetadataResult>;
}

export type StorePrivateTutorImageInput = {
  readonly profileId: string;
  readonly turnId: string;
  readonly attachmentResourceName: string;
  readonly declaredMimeType: RasterImageMimeType;
  readonly normalized: NormalizedTutorImage;
  readonly storagePort: PrivateImageStoragePort;
  readonly metadataPort: PrivateImageMetadataPort;
};
export type StorePrivateTutorImageResult =
  | {
      readonly ok: true;
      readonly value: {
        readonly image: TutorImageInput;
        readonly privateStoragePath: string;
      };
    }
  | { readonly ok: false; readonly outcome: AiTutorMediaReviewOutcome };

export async function storePrivateTutorImage(
  input: StorePrivateTutorImageInput,
): Promise<StorePrivateTutorImageResult> {
  const objectPath = buildPrivateObjectPath(input.profileId, input.turnId, input.normalized.image.sha256Hex);
  const privateStoragePath = `${AI_TUTOR_PRIVATE_BUCKET}/${objectPath}`;
  const uploaded = await input.storagePort.uploadPrivateObject({
    bucket: AI_TUTOR_PRIVATE_BUCKET,
    objectPath,
    bytes: input.normalized.image.bytes,
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (!uploaded.ok) return { ok: false, outcome: mediaReviewOutcome('storage_failed') };

  const recorded = await input.metadataPort.recordPrivateImage({
    profileId: input.profileId,
    turnId: input.turnId,
    attachmentResourceName: hashResourceName(input.attachmentResourceName),
    declaredMimeType: input.declaredMimeType,
    normalizedMimeType: 'image/jpeg',
    sizeBytes: input.normalized.normalizedSizeBytes,
    sha256: input.normalized.image.sha256Hex,
    privateStoragePath,
    status: 'stored',
  });
  if (!recorded.ok) return { ok: false, outcome: mediaReviewOutcome('metadata_failed') };

  return {
    ok: true,
    value: {
      image: input.normalized.image,
      privateStoragePath,
    },
  };
}

function buildPrivateObjectPath(profileId: string, turnId: string, sha256Hex: string): string {
  return `${hashHex(profileId)}/${safePathSegment(turnId)}/${sha256Hex}.jpg`;
}

function hashResourceName(resourceName: string): string {
  return `sha256:${hashHex(resourceName)}`;
}

function hashHex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, '');
}
