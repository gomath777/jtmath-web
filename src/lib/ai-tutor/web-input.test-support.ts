import type { WebTutorServerContinuity } from './web-conversation-continuity';
import {
  WebTutorRequestSchema,
  parseWebTutorInput,
  type WebTutorMaterial,
  type WebTutorRequest,
} from './web-input';

export const WEB_INPUT_TEST_CONTEXT_KEY = 'ctx_input_test';

export const WEB_INPUT_TEST_MATERIALS = [
  { materialKey: 'm-lv42', label: '레벨4-2', problemRange: { first: 1, last: 120 } },
  { materialKey: 'm-advanced-1', label: '심화유형 1단계', problemRange: { first: 1, last: 999 } },
  { materialKey: 'm-advanced-2', label: '심화유형 2단계', problemRange: { first: 1, last: 999 } },
  { materialKey: 'm-advanced-3', label: '심화유형 3단계', problemRange: { first: 1, last: 999 } },
  { materialKey: 'm-lv5', label: '레벨5', problemRange: { first: 1, last: 999 } },
  { materialKey: 'm-allscan', label: '유형 올스캔', problemRange: { first: 1, last: 999 } },
] as const satisfies readonly WebTutorMaterial[];

export function buildWebTutorRequest(input: {
  readonly message: string;
  readonly selectedMaterialKey?: string;
}): WebTutorRequest {
  return WebTutorRequestSchema.parse({
    lessonSlug: 'gs2-midterm',
    message: input.message,
    ...(input.selectedMaterialKey === undefined ? {} : { selectedMaterialKey: input.selectedMaterialKey }),
  });
}

export function parseWebTutorTestInput(input: {
  readonly message: string;
  readonly selectedMaterialKey?: string;
  readonly serverContextKey?: string;
  readonly serverContinuity?: WebTutorServerContinuity;
  readonly materials?: readonly WebTutorMaterial[];
}) {
  return parseWebTutorInput({
    request: buildWebTutorRequest(input),
    serverContextKey: input.serverContextKey ?? WEB_INPUT_TEST_CONTEXT_KEY,
    materials: input.materials ?? WEB_INPUT_TEST_MATERIALS,
    serverContinuity: input.serverContinuity ?? { recentTurns: [] },
  });
}
