import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type { TutorImageInput } from './contracts';
import {
  mediaReviewOutcome,
  type AiTutorMediaReviewOutcome,
  type RasterImageMimeType,
} from './chat-media';

export type NormalizedTutorImage = {
  readonly image: TutorImageInput;
  readonly normalizedSizeBytes: number;
  readonly width: number;
  readonly height: number;
};

export type NormalizeTutorImageInput = {
  readonly declaredMimeType: RasterImageMimeType;
  readonly bytes: Uint8Array;
  readonly maxBytes: number;
};

export type NormalizeTutorImageResult =
  | { readonly ok: true; readonly value: NormalizedTutorImage }
  | { readonly ok: false; readonly outcome: AiTutorMediaReviewOutcome };

const maxOutputEdge = 2048;
const maxInputEdge = 12_000;
const maxInputPixels = 50_000_000;
const jpegQuality = 82;

export async function normalizeTutorImage(
  input: NormalizeTutorImageInput,
): Promise<NormalizeTutorImageResult> {
  if (input.bytes.byteLength > input.maxBytes) {
    return { ok: false, outcome: mediaReviewOutcome('download_too_large') };
  }
  if (!magicMatches(input.bytes, input.declaredMimeType)) {
    return { ok: false, outcome: mediaReviewOutcome('mime_magic_mismatch') };
  }
  if (isAnimatedWebp(input.bytes)) {
    return { ok: false, outcome: mediaReviewOutcome('animated_image') };
  }
  const earlyPngDimensions = input.declaredMimeType === 'image/png' ? readPngDimensions(input.bytes) : null;
  if (earlyPngDimensions !== null && hasExtremeDimensions(earlyPngDimensions)) {
    return { ok: false, outcome: mediaReviewOutcome('extreme_dimensions') };
  }

  try {
    const metadata = await sharp(input.bytes, { limitInputPixels: maxInputPixels }).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width <= 0 || height <= 0) return { ok: false, outcome: mediaReviewOutcome('corrupt_image') };
    if ((metadata.pages ?? 1) > 1) return { ok: false, outcome: mediaReviewOutcome('animated_image') };
    if (hasExtremeDimensions({ width, height })) {
      return { ok: false, outcome: mediaReviewOutcome('extreme_dimensions') };
    }
    const output = await sharp(input.bytes, { limitInputPixels: maxInputPixels })
      .rotate()
      .resize({ width: maxOutputEdge, height: maxOutputEdge, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: jpegQuality })
      .toBuffer({ resolveWithObject: true });
    if (output.data.byteLength > input.maxBytes) {
      return { ok: false, outcome: mediaReviewOutcome('normalized_too_large') };
    }
    return {
      ok: true,
      value: {
        image: {
          mimeType: 'image/jpeg',
          bytes: output.data,
          sha256Hex: createHash('sha256').update(output.data).digest('hex'),
        },
        normalizedSizeBytes: output.data.byteLength,
        width: output.info.width,
        height: output.info.height,
      },
    };
  } catch (error) {
    if (error instanceof Error) return { ok: false, outcome: mediaReviewOutcome('corrupt_image') };
    return { ok: false, outcome: mediaReviewOutcome('corrupt_image') };
  }
}

function magicMatches(bytes: Uint8Array, mimeType: RasterImageMimeType): boolean {
  switch (mimeType) {
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/webp':
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]);
  }
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function isAnimatedWebp(bytes: Uint8Array): boolean {
  return magicMatches(bytes, 'image/webp') &&
    startsWith(bytes.subarray(12), [0x56, 0x50, 0x38, 0x58]) &&
    (bytes[20] ?? 0) % 4 >= 2;
}

function readPngDimensions(bytes: Uint8Array): { readonly width: number; readonly height: number } | null {
  if (bytes.byteLength < 24 || !magicMatches(bytes, 'image/png')) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function hasExtremeDimensions(dimensions: { readonly width: number; readonly height: number }): boolean {
  return dimensions.width > maxInputEdge ||
    dimensions.height > maxInputEdge ||
    dimensions.width * dimensions.height > maxInputPixels;
}
