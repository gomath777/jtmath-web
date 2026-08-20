import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_TUTOR_PRIVATE_BUCKET,
  storePrivateTutorImage,
  type PrivateImageMetadataInput,
  type PrivateImageUploadInput,
} from './private-storage';
import type { NormalizedTutorImage } from './image-pipeline';

const normalized: NormalizedTutorImage = {
  image: {
    mimeType: 'image/jpeg',
    bytes: new Uint8Array([255, 216, 255, 224, 1, 2, 3]),
    sha256Hex: 'b'.repeat(64),
  },
  normalizedSizeBytes: 7,
  width: 20,
  height: 12,
};

test('storePrivateTutorImage uploads deterministic private path without public URL or upsert and records redacted metadata', async () => {
  // Given
  const uploads: PrivateImageUploadInput[] = [];
  const records: PrivateImageMetadataInput[] = [];

  // When
  const result = await storePrivateTutorImage({
    profileId: '00000000-0000-4000-8000-000000000001',
    turnId: '10000000-0000-4000-8000-000000000002',
    attachmentResourceName: 'spaces/AAA/messages/BBB/attachments/CCC',
    declaredMimeType: 'image/png',
    normalized,
    storagePort: {
      uploadPrivateObject: async (input) => {
        uploads.push(input);
        return { ok: true };
      },
    },
    metadataPort: {
      recordPrivateImage: async (input) => {
        records.push(input);
        return { ok: true };
      },
    },
  });

  // Then
  assert.equal(result.ok, true);
  assert.equal(uploads.length, 1);
  assert.equal(records.length, 1);
  assert.equal(uploads[0]?.bucket, AI_TUTOR_PRIVATE_BUCKET);
  assert.equal(uploads[0]?.upsert, false);
  assert.equal(uploads[0]?.contentType, 'image/jpeg');
  assert.deepEqual(uploads[0]?.bytes, normalized.image.bytes);
  assert.equal(uploads[0]?.objectPath.endsWith(`/${normalized.image.sha256Hex}.jpg`), true);
  assert.equal(records[0]?.privateStoragePath, `${AI_TUTOR_PRIVATE_BUCKET}/${uploads[0]?.objectPath}`);
  assert.equal(records[0]?.attachmentResourceName.includes('spaces/'), false);
  assert.equal(JSON.stringify([uploads, records]).includes('publicUrl'), false);
  assert.equal(JSON.stringify([uploads, records]).includes('student-upload'), false);
  if (result.ok) {
    assert.deepEqual(result.value.image.bytes, normalized.image.bytes);
    assert.equal(result.value.image.sha256Hex, normalized.image.sha256Hex);
    assert.equal(result.value.privateStoragePath, records[0]?.privateStoragePath);
  }
});

test('storePrivateTutorImage is deterministic for profile, turn, and normalized hash', async () => {
  // Given
  const paths: string[] = [];
  const storagePort = {
    uploadPrivateObject: async (input: PrivateImageUploadInput) => {
      paths.push(input.objectPath);
      return { ok: true as const };
    },
  };
  const metadataPort = {
    recordPrivateImage: async () => ({ ok: true as const }),
  };
  const request = {
    profileId: '00000000-0000-4000-8000-000000000001',
    turnId: '10000000-0000-4000-8000-000000000002',
    attachmentResourceName: 'spaces/AAA/messages/BBB/attachments/CCC',
    declaredMimeType: 'image/webp' as const,
    normalized,
    storagePort,
    metadataPort,
  };

  // When
  await storePrivateTutorImage(request);
  await storePrivateTutorImage(request);

  // Then
  assert.equal(paths.length, 2);
  assert.equal(paths[0], paths[1]);
  assert.equal(paths[0]?.split('/').length, 3);
});

test('storePrivateTutorImage returns review outcomes for storage and metadata failures without model input', async () => {
  // Given
  let metadataCalls = 0;
  const base = {
    profileId: '00000000-0000-4000-8000-000000000001',
    turnId: '10000000-0000-4000-8000-000000000002',
    attachmentResourceName: 'spaces/AAA/messages/BBB/attachments/CCC',
    declaredMimeType: 'image/jpeg' as const,
    normalized,
  };

  // When
  const storageFailure = await storePrivateTutorImage({
    ...base,
    storagePort: { uploadPrivateObject: async () => ({ ok: false, error: { code: 'storage_unavailable' as const } }) },
    metadataPort: { recordPrivateImage: async () => { metadataCalls += 1; return { ok: true }; } },
  });
  const metadataFailure = await storePrivateTutorImage({
    ...base,
    storagePort: { uploadPrivateObject: async () => ({ ok: true }) },
    metadataPort: { recordPrivateImage: async () => ({ ok: false, error: { code: 'metadata_unavailable' as const } }) },
  });

  // Then
  assert.equal(storageFailure.ok, false);
  assert.equal(metadataFailure.ok, false);
  if (!storageFailure.ok) assert.equal(storageFailure.outcome.code, 'storage_failed');
  if (!metadataFailure.ok) assert.equal(metadataFailure.outcome.code, 'metadata_failed');
  assert.equal(metadataCalls, 0);
});
