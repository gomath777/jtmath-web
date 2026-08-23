import type { WebTutorMaterial } from './web-input';
import type { WebLessonMaterialDescriptor } from './web-lesson-context';
import { resolveRegisteredWebTutorMaterials } from './web-tutor-rollout-registry';

const legacyTutorLessonSlugs = new Set(['ds2-trig', 'ds2-gichul-03-b1273c']);

export type ResolveWebTutorMaterialsInput = {
  readonly lessonSlug: string;
  readonly descriptors: readonly WebLessonMaterialDescriptor[];
};

export type ResolveWebTutorMaterialsResult =
  | { readonly ok: true; readonly materials: readonly WebTutorMaterial[] }
  | { readonly ok: false };

export function resolveWebTutorMaterials(input: ResolveWebTutorMaterialsInput): ResolveWebTutorMaterialsResult {
  const registered = resolveRegisteredWebTutorMaterials(input);
  if (registered !== undefined) return { ok: true, materials: registered };
  if (!legacyTutorLessonSlugs.has(input.lessonSlug)) return { ok: false };
  const materials = input.descriptors.flatMap((descriptor) => 'materialKey' in descriptor
    ? [{ materialKey: descriptor.materialKey, label: descriptor.label, problemRange: { first: 1, last: 99 } }]
    : []);
  return materials.length === input.descriptors.length && materials.length > 0
    ? { ok: true, materials }
    : { ok: false };
}
