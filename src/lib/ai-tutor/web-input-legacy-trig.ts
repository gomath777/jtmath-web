import {
  WebTutorRequestSchema,
  parseWebTutorInput,
  type WebTutorMode,
} from './web-input';

const LEGACY_TRIG_MATERIALS = [
  { materialKey: 'm-1', label: '레벨1', problemRange: { first: 1, last: 99 }, level: 1 },
  { materialKey: 'm-2', label: '레벨2', problemRange: { first: 1, last: 99 }, level: 2 },
  { materialKey: 'm-3', label: '레벨3', problemRange: { first: 1, last: 99 }, level: 3 },
  { materialKey: 'm-41', label: '레벨4-1', problemRange: { first: 1, last: 99 }, level: 41 },
  { materialKey: 'm-42', label: '레벨4-2', problemRange: { first: 1, last: 99 }, level: 42 },
  { materialKey: 'm-99', label: '올스캔', problemRange: { first: 1, last: 99 }, level: 99 },
] as const;

export type LegacyTrigTutorParseResult =
  | { readonly kind: 'ok'; readonly mode: WebTutorMode; readonly target: { readonly contextKey: 'legacy_trig'; readonly materialKey: string; readonly level: number; readonly problemNumber: number } }
  | { readonly kind: 'unsupported_legacy_fixture' }
  | { readonly kind: 'malformed_input' }
  | { readonly kind: 'ambiguous_material' }
  | { readonly kind: 'unsupported_material' };

export function parseLegacyTrigTutorInput(input: {
  readonly lessonSlug: string;
  readonly message: string;
  readonly selectedLevel?: 1 | 2 | 3 | 41 | 42 | 99;
}): LegacyTrigTutorParseResult {
  if (input.lessonSlug !== 'trig') return { kind: 'unsupported_legacy_fixture' };
  const selectedMaterialKey = input.selectedLevel === undefined
    ? undefined
    : LEGACY_TRIG_MATERIALS.find((material) => material.level === input.selectedLevel)?.materialKey;
  const request = WebTutorRequestSchema.safeParse({
    lessonSlug: input.lessonSlug,
    message: input.message,
    ...(selectedMaterialKey === undefined ? {} : { selectedMaterialKey }),
  });
  if (!request.success) return { kind: 'malformed_input' };
  const result = parseWebTutorInput({
    request: request.data,
    serverContextKey: 'legacy_trig',
    materials: LEGACY_TRIG_MATERIALS,
    serverContinuity: { recentTurns: [] },
  });
  if (result.kind !== 'ok') {
    switch (result.kind) {
      case 'ambiguous_material':
      case 'unsupported_material':
      case 'malformed_input':
        return result;
      case 'stale_target':
        return { kind: 'malformed_input' };
      default:
        return assertNever(result);
    }
  }
  const material = LEGACY_TRIG_MATERIALS.find((entry) => entry.materialKey === result.target.materialKey);
  if (material === undefined) return { kind: 'unsupported_material' };
  return {
    kind: 'ok',
    mode: result.mode,
    target: { ...result.target, contextKey: 'legacy_trig', level: material.level },
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected legacy trig parse result: ${String(value)}`);
}
