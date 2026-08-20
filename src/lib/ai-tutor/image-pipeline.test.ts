import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { normalizeTutorImage } from './image-pipeline';

test('normalizeTutorImage accepts PNG, JPEG, and WebP and emits bounded stripped JPEG bytes', async () => {
  // Given
  const inputs = [
    { declaredMimeType: 'image/png' as const, bytes: await raster('png') },
    { declaredMimeType: 'image/jpeg' as const, bytes: await raster('jpeg') },
    { declaredMimeType: 'image/webp' as const, bytes: await raster('webp') },
  ];

  // When
  const results = await Promise.all(inputs.map((input) => normalizeTutorImage({ ...input, maxBytes: 8 * 1024 * 1024 })));

  // Then
  for (const result of results) {
    assert.equal(result.ok, true);
    if (result.ok) {
      const metadata = await sharp(result.value.image.bytes).metadata();
      assert.equal(result.value.image.mimeType, 'image/jpeg');
      assert.equal(result.value.image.sha256Hex, sha256Hex(result.value.image.bytes));
      assert.equal(metadata.format, 'jpeg');
      assert.equal((metadata.width ?? 0) <= 2048, true);
      assert.equal((metadata.height ?? 0) <= 2048, true);
      assert.equal(metadata.exif, undefined);
      assert.equal(result.value.normalizedSizeBytes <= 8 * 1024 * 1024, true);
    }
  }
});

test('normalizeTutorImage resizes the longest edge to 2048 pixels without metadata', async () => {
  // Given
  const bytes = await sharp({
    create: {
      width: 2600,
      height: 1200,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).jpeg().toBuffer();

  // When
  const result = await normalizeTutorImage({ declaredMimeType: 'image/jpeg', bytes, maxBytes: 8 * 1024 * 1024 });

  // Then
  assert.equal(result.ok, true);
  if (result.ok) {
    const metadata = await sharp(result.value.image.bytes).metadata();
    assert.equal(metadata.width, 2048);
    assert.equal(metadata.exif, undefined);
  }
});

test('normalizeTutorImage rejects MIME spoofing, corrupt bytes, and oversized inputs', async () => {
  // Given
  const jpegBytes = await raster('jpeg');
  const corruptPngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // When
  const spoof = await normalizeTutorImage({ declaredMimeType: 'image/png', bytes: jpegBytes, maxBytes: 8 * 1024 * 1024 });
  const corrupt = await normalizeTutorImage({ declaredMimeType: 'image/png', bytes: corruptPngHeader, maxBytes: 8 * 1024 * 1024 });
  const oversized = await normalizeTutorImage({ declaredMimeType: 'image/jpeg', bytes: jpegBytes, maxBytes: 3 });

  // Then
  assert.equal(spoof.ok, false);
  assert.equal(corrupt.ok, false);
  assert.equal(oversized.ok, false);
  if (!spoof.ok) assert.equal(spoof.outcome.code, 'mime_magic_mismatch');
  if (!corrupt.ok) assert.equal(corrupt.outcome.code, 'corrupt_image');
  if (!oversized.ok) assert.equal(oversized.outcome.code, 'download_too_large');
});

test('normalizeTutorImage rejects animated WebP and extreme PNG dimensions before model/storage use', async () => {
  // Given
  const animatedWebp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x58, 0x0a, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,
  ]);
  const extremePng = pngHeaderWithDimensions(30_000, 30_000);

  // When
  const animated = await normalizeTutorImage({ declaredMimeType: 'image/webp', bytes: animatedWebp, maxBytes: 8 * 1024 * 1024 });
  const extreme = await normalizeTutorImage({ declaredMimeType: 'image/png', bytes: extremePng, maxBytes: 8 * 1024 * 1024 });

  // Then
  assert.equal(animated.ok, false);
  assert.equal(extreme.ok, false);
  if (!animated.ok) assert.equal(animated.outcome.code, 'animated_image');
  if (!extreme.ok) assert.equal(extreme.outcome.code, 'extreme_dimensions');
});

async function raster(format: 'png' | 'jpeg' | 'webp'): Promise<Uint8Array> {
  const image = sharp({
    create: {
      width: 32,
      height: 18,
      channels: 3,
      background: { r: 20, g: 120, b: 240 },
    },
  });
  switch (format) {
    case 'png':
      return image.png().toBuffer();
    case 'jpeg':
      return image.withMetadata().jpeg().toBuffer();
    case 'webp':
      return image.webp().toBuffer();
  }
}

function pngHeaderWithDimensions(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0, 0, 0, 0, 0, 0, 0, 0, 0x08, 0x02, 0, 0, 0,
  ]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
