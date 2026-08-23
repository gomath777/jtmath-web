import 'server-only';

import { loadWebPdfMaterial, type WebPdfFetchPort } from './web-material';
import type { WebTutorLevel, WebTutorMode } from './web-input';
import type { WebLessonMaterialDescriptor } from './web-lesson-context';
import { createLocalWebProblemImageStore, type WebProblemImageStore } from './web-problem-image';
import { selectTutorGuideContext, type TutorGuideContext } from './tutor-guide-selector';
import { createLocalWebTutorGuideStore, type WebTutorGuideStore } from './web-tutor-guide-store';
import { resolveRegisteredWebTutorTarget } from './web-tutor-rollout-registry';

const WEB_TUTOR_GUIDE_LESSON_SLUG = 'ds2-gichul-03-b1273c';
const WEB_TUTOR_GUIDE_LESSON_KEY = 'ds2-trigonometry';
const WEB_TUTOR_GUIDE_LEVEL = 41;
const WEB_TUTOR_GUIDE_MIN_PROBLEM = 1;
const WEB_TUTOR_GUIDE_MAX_PROBLEM = 9;

export type TutorAttachment =
  | { readonly kind: 'image'; readonly bytes: Uint8Array; readonly sha256Hex: string; readonly coarseSizeBytes: number }
  | { readonly kind: 'pdf'; readonly bytes: Uint8Array; readonly sha256Hex: string; readonly coarseSizeBytes: number };

export type ResolveWebTutorAttachmentInput = {
  readonly lessonSlug: string;
  readonly materials: readonly WebLessonMaterialDescriptor[];
  readonly materialKey: string;
  readonly level: WebTutorLevel;
  readonly problemNumber: number;
  readonly mode: WebTutorMode;
  readonly fetchPort?: WebPdfFetchPort;
  readonly problemImageStore?: WebProblemImageStore;
  readonly guideStore?: WebTutorGuideStore;
};

export type ResolveWebTutorAttachmentResult =
  | { readonly ok: true; readonly attachment: TutorAttachment; readonly guideContext?: TutorGuideContext }
  | { readonly ok: false; readonly reason: 'material_unavailable' | 'registered_guide_unavailable' };

export type PreflightRegisteredGuidePdfFreshnessInput = {
  readonly lessonSlug: string;
  readonly materials: readonly WebLessonMaterialDescriptor[];
  readonly materialKey: string;
  readonly level: WebTutorLevel;
  readonly problemNumber: number;
  readonly fetchPort?: WebPdfFetchPort;
  readonly registeredGuideSourceDeadlineMs?: number;
  readonly guideStore?: WebTutorGuideStore;
};

export type PreflightRegisteredGuidePdfFreshnessResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | 'material_unavailable'
        | 'registered_guide_unavailable'
        | 'source_unavailable'
        | 'source_hash_mismatch';
    };

type RegisteredGuideMaterial =
  | { readonly kind: 'legacy' }
  | { readonly kind: 'guided'; readonly attachment: TutorAttachment; readonly guideContext: TutorGuideContext }
  | { readonly kind: 'unavailable' };

export async function resolveWebTutorAttachment(
  input: ResolveWebTutorAttachmentInput,
): Promise<ResolveWebTutorAttachmentResult> {
  const descriptor = selectMaterial(input.materials, input.materialKey);
  if (descriptor === undefined) return { ok: false, reason: 'material_unavailable' };

  const guidedMaterial = await loadRegisteredGuideMaterial({ ...input, descriptor });
  switch (guidedMaterial.kind) {
    case 'unavailable':
      return { ok: false, reason: 'registered_guide_unavailable' };
    case 'guided':
      return {
        ok: true,
        attachment: guidedMaterial.attachment,
        guideContext: guidedMaterial.guideContext,
      };
    case 'legacy':
      return loadLegacyAttachment({
        lessonSlug: input.lessonSlug,
        level: input.level,
        problemNumber: input.problemNumber,
        descriptor,
        fetchPort: input.fetchPort,
        problemImageStore: input.problemImageStore,
      });
    default:
      return assertNever(guidedMaterial);
  }
}

async function loadRegisteredGuideMaterial(input: {
  readonly lessonSlug: string;
  readonly guideStore?: WebTutorGuideStore;
  readonly level: WebTutorLevel;
  readonly problemNumber: number;
  readonly mode: WebTutorMode;
  readonly descriptor: WebLessonMaterialDescriptor;
}): Promise<RegisteredGuideMaterial> {
  const target = resolveRegisteredGuideTarget(input);
  if (target === undefined) return { kind: 'legacy' };
  const guideStore = input.guideStore ?? createLocalWebTutorGuideStore();
  if (!guideStore.isRegistered(target)) return { kind: 'unavailable' };
  const loaded = await guideStore.load(target);
  if (!loaded.ok) return { kind: 'unavailable' };
  const selection = selectTutorGuideContext({ guide: loaded.guide, manifestEntry: loaded.entry }, input.mode);
  if (selection.kind === 'failure') return { kind: 'unavailable' };
  return {
    kind: 'guided',
    attachment: {
      kind: 'image',
      bytes: loaded.problemImage,
      sha256Hex: loaded.entry.problemAsset.sha256,
      coarseSizeBytes: Math.ceil(loaded.problemImage.byteLength / 1024) * 1024,
    },
    guideContext: selection.context,
  };
}

export async function preflightRegisteredGuidePdfFreshness(
  input: PreflightRegisteredGuidePdfFreshnessInput,
): Promise<PreflightRegisteredGuidePdfFreshnessResult> {
  const descriptor = selectMaterial(input.materials, input.materialKey);
  if (descriptor === undefined) return { ok: false, reason: 'material_unavailable' };
  const target = resolveRegisteredGuideTarget({ ...input, descriptor });
  if (target === undefined) return { ok: false, reason: 'registered_guide_unavailable' };
  const guideStore = input.guideStore ?? createLocalWebTutorGuideStore();
  if (!guideStore.isRegistered(target)) return { ok: false, reason: 'registered_guide_unavailable' };
  const loaded = await guideStore.load(target);
  if (!loaded.ok) return { ok: false, reason: 'registered_guide_unavailable' };
  const source = await loadWebPdfMaterial({
    descriptor,
    fetchPort: input.fetchPort,
    deadlineMs: input.registeredGuideSourceDeadlineMs,
  });
  if (!source.ok) return { ok: false, reason: 'source_unavailable' };
  return source.material.sha256Hex === loaded.entry.problemAsset.sourceSha256
    ? { ok: true }
    : { ok: false, reason: 'source_hash_mismatch' };
}

function resolveRegisteredGuideTarget(input: {
  readonly lessonSlug: string;
  readonly level: WebTutorLevel;
  readonly problemNumber: number;
  readonly descriptor: WebLessonMaterialDescriptor;
}): Readonly<{ lessonKey: string; level: WebTutorLevel; problemNumber: number }> | undefined {
  const rolloutTarget = resolveRegisteredWebTutorTarget({
    lessonSlug: input.lessonSlug,
    descriptor: input.descriptor,
    problemNumber: input.problemNumber,
  });
  if (rolloutTarget !== undefined) return rolloutTarget;
  if (input.lessonSlug !== WEB_TUTOR_GUIDE_LESSON_SLUG) return undefined;
  if (input.level !== WEB_TUTOR_GUIDE_LEVEL) return undefined;
  if (input.problemNumber < WEB_TUTOR_GUIDE_MIN_PROBLEM || input.problemNumber > WEB_TUTOR_GUIDE_MAX_PROBLEM) {
    return undefined;
  }
  return {
    lessonKey: WEB_TUTOR_GUIDE_LESSON_KEY,
    level: WEB_TUTOR_GUIDE_LEVEL,
    problemNumber: input.problemNumber,
  };
}

async function loadLegacyAttachment(input: {
  readonly lessonSlug: string;
  readonly level: WebTutorLevel;
  readonly problemNumber: number;
  readonly descriptor: WebLessonMaterialDescriptor;
  readonly fetchPort?: WebPdfFetchPort;
  readonly problemImageStore?: WebProblemImageStore;
}): Promise<ResolveWebTutorAttachmentResult> {
  const imageStore = input.problemImageStore ?? createLocalWebProblemImageStore();
  const image = await imageStore.load({
    lessonSlug: input.lessonSlug,
    level: input.level,
    problemNumber: input.problemNumber,
  });
  if (image.ok) {
    return {
      ok: true,
      attachment: {
        kind: 'image',
        bytes: image.image.bytes,
        sha256Hex: image.image.sha256Hex,
        coarseSizeBytes: image.image.coarseSizeBytes,
      },
    };
  }

  if (imageStore.isRegistered?.({ lessonSlug: input.lessonSlug, level: input.level, problemNumber: input.problemNumber }) === true) {
    return { ok: false, reason: 'material_unavailable' };
  }

  const pdf = await loadWebPdfMaterial({ descriptor: input.descriptor, fetchPort: input.fetchPort });
  if (!pdf.ok) return { ok: false, reason: 'material_unavailable' };
  return {
    ok: true,
    attachment: {
      kind: 'pdf',
      bytes: pdf.material.bytes,
      sha256Hex: pdf.material.sha256Hex,
      coarseSizeBytes: pdf.material.coarseSizeBytes,
    },
  };
}

function selectMaterial(
  materials: readonly WebLessonMaterialDescriptor[],
  materialKey: string,
): WebLessonMaterialDescriptor | undefined {
  return materials.find((material) => 'materialKey' in material && material.materialKey === materialKey);
}

function assertNever(value: never): never {
  throw new Error(`Unexpected web tutor material state: ${String(value)}`);
}
