import 'server-only';

import type { WebLessonMaterialDescriptor } from './web-lesson-context-core';
import type {
  WebLessonAssignment,
  WebLessonContext,
  WebLessonContextFailureReason,
} from './web-lesson-context-types';

const serverMaterialsKey: unique symbol = Symbol('webLessonServerMaterials');
const serverAssignmentKey: unique symbol = Symbol('webLessonServerAssignment');

export type WebLessonContextResult =
  | {
      readonly ok: true;
      readonly context: WebLessonContext;
      readonly [serverMaterialsKey]: readonly WebLessonMaterialDescriptor[];
      readonly [serverAssignmentKey]: WebLessonAssignment;
    }
  | { readonly ok: false; readonly reason: WebLessonContextFailureReason };

export type ResolvedWebLessonContext = Extract<WebLessonContextResult, { readonly ok: true }>;

export type WebLessonMaterialAuthorizationResult =
  | { readonly ok: true; readonly descriptor: WebLessonMaterialDescriptor }
  | { readonly ok: false; readonly reason: 'stale_context' | 'forged_material' };

export function createResolvedWebLessonContext(input: {
  readonly context: WebLessonContext;
  readonly materials: readonly WebLessonMaterialDescriptor[];
  readonly assignment: WebLessonAssignment;
}): ResolvedWebLessonContext {
  return {
    ok: true,
    context: input.context,
    [serverMaterialsKey]: input.materials,
    [serverAssignmentKey]: input.assignment,
  };
}

export function getWebLessonMaterialDescriptors(
  result: WebLessonContextResult,
): readonly WebLessonMaterialDescriptor[] {
  return result.ok ? result[serverMaterialsKey] : [];
}

export function getWebLessonAssignment(result: ResolvedWebLessonContext): WebLessonAssignment {
  return result[serverAssignmentKey];
}

/** Accepts only scalar client hints; the descriptor itself remains server-authoritative. */
export function authorizeWebLessonMaterial(input: {
  readonly result: ResolvedWebLessonContext;
  readonly contextKey: string;
  readonly materialKey: string;
}): WebLessonMaterialAuthorizationResult {
  if (input.contextKey !== input.result.context.contextKey) return { ok: false, reason: 'stale_context' };
  const descriptor = input.result[serverMaterialsKey].find(
    (material): material is Extract<WebLessonMaterialDescriptor, { readonly materialKey: string }> =>
      'materialKey' in material && material.materialKey === input.materialKey,
  );
  return descriptor ? { ok: true, descriptor } : { ok: false, reason: 'forged_material' };
}
