import 'server-only';

import { createHash } from 'node:crypto';
import { createLocalTutorGuideStore, type TutorGuideStore } from './tutor-guide-store';
import type { WebTutorLevel } from './web-input';

export type WebProblemImageTarget = Readonly<{
  readonly lessonSlug: string;
  readonly level: WebTutorLevel;
  readonly problemNumber: number;
}>;

export type LoadedWebProblemImage = {
  readonly bytes: Uint8Array;
  readonly mimeType: 'image/png';
  readonly sha256Hex: string;
  readonly coarseSizeBytes: number;
};

export type LoadWebProblemImageResult =
  | { readonly ok: true; readonly image: LoadedWebProblemImage }
  | { readonly ok: false; readonly reason: 'disabled' | 'not_found' | 'invalid_manifest' | 'unsafe_path' | 'invalid_png' | 'invalid_mime' | 'too_large' | 'hash_mismatch' | 'unverified' };

export interface WebProblemImageStore {
  load(target: WebProblemImageTarget): Promise<LoadWebProblemImageResult>;
  isRegistered?(target: WebProblemImageTarget): boolean;
}

export function createLocalWebProblemImageStore(options: Readonly<{ cwd?: string; nodeEnv?: string; guideStore?: TutorGuideStore }> = {}): WebProblemImageStore {
  const guideStore = options.guideStore ?? createLocalTutorGuideStore(options);
  return createWebProblemImageStore(guideStore);
}

export function createPrivateWebProblemImageStore(options: Readonly<{ readonly guideStore: TutorGuideStore }>): WebProblemImageStore {
  return createWebProblemImageStore(options.guideStore);
}

function createWebProblemImageStore(guideStore: TutorGuideStore): WebProblemImageStore {
  return { isRegistered: (target) => guideStore.has?.({ lessonKey: target.lessonSlug, level: target.level, problemNumber: target.problemNumber }) ?? false, load: async (target) => {
    const result = await guideStore.load({ lessonKey: target.lessonSlug, level: target.level, problemNumber: target.problemNumber });
    if (!result.ok) return { ok: false, reason: result.reason };
    return { ok: true, image: { bytes: result.problemImage, mimeType: 'image/png', sha256Hex: createHash('sha256').update(result.problemImage).digest('hex'), coarseSizeBytes: Math.ceil(result.problemImage.byteLength / 1024) * 1024 } };
  } };
}
