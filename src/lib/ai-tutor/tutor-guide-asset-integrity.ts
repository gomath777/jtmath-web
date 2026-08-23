import { createHash } from 'node:crypto';

export const MAX_TUTOR_GUIDE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TUTOR_GUIDE_JSON_BYTES = 1024 * 1024;

export function sha256TutorGuideAsset(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
