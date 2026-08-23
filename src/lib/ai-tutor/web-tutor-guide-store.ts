import 'server-only';

import {
  createLocalTutorGuideStore,
  type TutorGuideStore,
  type TutorGuideStoreResult,
  type TutorGuideStoreTarget,
} from './tutor-guide-store';

export type WebTutorGuideStoreTarget = TutorGuideStoreTarget;
export type WebTutorGuideStoreResult = TutorGuideStoreResult;

export interface WebTutorGuideStore {
  readonly isRegistered: (target: WebTutorGuideStoreTarget) => boolean;
  readonly load: (target: WebTutorGuideStoreTarget) => Promise<WebTutorGuideStoreResult>;
}

export function createLocalWebTutorGuideStore(
  options: Readonly<{ readonly guideStore?: TutorGuideStore; readonly cwd?: string; readonly nodeEnv?: string }> = {},
): WebTutorGuideStore {
  const guideStore = options.guideStore ?? createLocalTutorGuideStore(options);
  return {
    isRegistered: (target) => guideStore.has?.(target) ?? false,
    load: (target) => guideStore.load(target),
  };
}

export function createPrivateWebTutorGuideStore(
  options: Readonly<{ readonly guideStore: TutorGuideStore }>,
): WebTutorGuideStore {
  return {
    isRegistered: (target) => options.guideStore.has?.(target) ?? false,
    load: (target) => options.guideStore.load(target),
  };
}
