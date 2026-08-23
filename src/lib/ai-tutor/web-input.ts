import { z } from 'zod';

import type { WebTutorServerContinuity } from './web-conversation-continuity';

const WEB_TUTOR_MODES = ['hint', 'start', 'decisive_hint', 'solution'] as const;

export type WebTutorMode = (typeof WEB_TUTOR_MODES)[number];
/** Legacy engine metadata only; web request and target contracts are material-key based. */
export type WebTutorLevel = number;

export const WebTutorContextKeySchema = z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/u);
export const WebTutorMaterialKeySchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/u);

const NormalizedTextSchema = (maxCodePoints: number) => z
  .string()
  .transform(normalizeUserText)
  .refine((value) => !hasUnsafeControlCharacter(value), { message: 'control_character' })
  .refine((value) => value.length > 0, { message: 'required' })
  .refine((value) => countCodePoints(value) <= maxCodePoints, { message: 'too_big' });

export const WebTutorTargetSchema = z.object({
  contextKey: WebTutorContextKeySchema,
  materialKey: WebTutorMaterialKeySchema,
  problemNumber: z.number().int().min(1).max(999),
}).strict();

export type WebTutorTarget = Readonly<z.infer<typeof WebTutorTargetSchema>>;

export const WebTutorRequestSchema = z.object({
  lessonSlug: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/u),
  message: NormalizedTextSchema(500),
  selectedMaterialKey: WebTutorMaterialKeySchema.optional(),
}).strict();

export type WebTutorRequest = Readonly<z.infer<typeof WebTutorRequestSchema>>;

export type WebTutorMaterial = {
  readonly materialKey: string;
  readonly label: string;
  readonly problemRange: { readonly first: number; readonly last: number };
};

export type WebTutorParseInput = {
  readonly request: WebTutorRequest;
  readonly serverContextKey: string;
  readonly materials: readonly WebTutorMaterial[];
  readonly serverContinuity: WebTutorServerContinuity;
};

export type WebTutorParseResult =
  | { readonly kind: 'ok'; readonly mode: WebTutorMode; readonly target: WebTutorTarget }
  | { readonly kind: 'ambiguous_material'; readonly problemNumber: number }
  | { readonly kind: 'malformed_input' }
  | { readonly kind: 'stale_target' }
  | { readonly kind: 'unsupported_material' };

export function parseWebTutorInput(input: WebTutorParseInput): WebTutorParseResult {
  const activeTarget = validateActiveTarget(input);
  if (activeTarget.kind !== 'ok') return activeTarget;
  const selectedMaterial = resolveMaterial(input.materials, input.request);
  if (selectedMaterial.kind !== 'resolved') return selectedMaterial;
  const problemNumber = parseProblemReference(input.request.message);
  if (problemNumber === 'invalid') return { kind: 'malformed_input' };
  const mode = parseMode(input.request.message, input.serverContinuity);

  if (problemNumber === null) {
    if (activeTarget.target === undefined) return { kind: 'malformed_input' };
    if (selectedMaterial.material === undefined) return { kind: 'ok', mode, target: activeTarget.target };
    return selectedMaterial.material.materialKey === activeTarget.target.materialKey
      ? { kind: 'ok', mode, target: activeTarget.target }
      : { kind: 'malformed_input' };
  }
  if (selectedMaterial.material === undefined) return { kind: 'ambiguous_material', problemNumber };
  if (!isInManifestRange(problemNumber, selectedMaterial.material.problemRange)) return { kind: 'malformed_input' };
  return {
    kind: 'ok',
    mode,
    target: {
      contextKey: input.serverContextKey,
      materialKey: selectedMaterial.material.materialKey,
      problemNumber,
    },
  };
}

function validateActiveTarget(input: WebTutorParseInput):
  | { readonly kind: 'ok'; readonly target?: WebTutorTarget }
  | { readonly kind: 'stale_target' } {
  const target = input.serverContinuity.activeTarget;
  if (target === undefined) return { kind: 'ok' };
  if (target.contextKey !== input.serverContextKey) return { kind: 'stale_target' };
  const material = input.materials.find((entry) => entry.materialKey === target.materialKey);
  if (material === undefined || !isInManifestRange(target.problemNumber, material.problemRange)) {
    return { kind: 'stale_target' };
  }
  return { kind: 'ok', target };
}

function resolveMaterial(
  materials: readonly WebTutorMaterial[],
  request: WebTutorRequest,
): WebTutorMaterialResolution {
  const labelMatches = materials.filter((material) => matchesMaterialLabel(request.message, material.label));
  if (labelMatches.length > 1) return { kind: 'ambiguous_material', problemNumber: -1 };
  const selected = request.selectedMaterialKey === undefined
    ? undefined
    : materials.find((material) => material.materialKey === request.selectedMaterialKey);
  if (request.selectedMaterialKey !== undefined && selected === undefined) return { kind: 'unsupported_material' };
  const labelled = labelMatches[0];
  if (labelled !== undefined && selected !== undefined && labelled.materialKey !== selected.materialKey) {
    return { kind: 'malformed_input' };
  }
  return labelled === undefined ? { kind: 'resolved', material: selected } : { kind: 'resolved', material: labelled };
}

type WebTutorMaterialResolution =
  | { readonly kind: 'resolved'; readonly material?: WebTutorMaterial }
  | { readonly kind: 'ambiguous_material'; readonly problemNumber: number }
  | { readonly kind: 'malformed_input' }
  | { readonly kind: 'unsupported_material' };

function parseMode(message: string, continuity: WebTutorServerContinuity): WebTutorMode {
  if (/정답\s*말고/u.test(message)) return 'hint';
  if (/정답|답\s*(알려|보여|줘)|(?:풀이\s*전체|전체\s*풀이)|풀어\s*줘|다른\s*풀이/u.test(message)) return 'solution';
  if (/결정적|마지막\s*힌트|핵심\s*힌트|거의\s*답|더\s*구체|조금\s*더\s*구체|힌트\s*하나\s*더|한\s*단계만\s*더/u.test(message)) return 'decisive_hint';
  if (/풀이\s*시작|어떻게\s*시작|시작\s*(알려|보여|줘)|첫\s*(줄|단계)/u.test(message)) return 'start';
  if (/다음\s*(단계|힌트)?|이어서|계속|조금\s*더|더\s*(알려|보여|힌트)|왜|이해\s*안|모르겠/u.test(message)) {
    return continuity.recentTurns.filter((turn) => turn.role === 'tutor').length >= 2 ? 'decisive_hint' : 'start';
  }
  return 'hint';
}

function parseProblemReference(message: string): number | 'invalid' | null {
  const match = /(?:문제\s*)?([0-9]+)\s*번(?:\s*문제)?/u.exec(message);
  if (match === null) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value >= 1 && value <= 999 ? value : 'invalid';
}

function matchesMaterialLabel(message: string, label: string): boolean {
  const normalizedLabel = normalizeMaterialLabel(label);
  return normalizedLabel.length > 0 && normalizeMaterialLabel(message).includes(normalizedLabel);
}

function normalizeMaterialLabel(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[\s\-－–—]/gu, '');
}

function isInManifestRange(problemNumber: number, range: { readonly first: number; readonly last: number }): boolean {
  return Number.isSafeInteger(range.first)
    && Number.isSafeInteger(range.last)
    && range.first >= 1
    && range.last <= 999
    && range.first <= range.last
    && problemNumber >= range.first
    && problemNumber <= range.last;
}

function normalizeUserText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
}

function countCodePoints(value: string): number {
  return Array.from(value).length;
}

function hasUnsafeControlCharacter(value: string): boolean {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value);
}

export { parseLegacyTrigTutorInput, type LegacyTrigTutorParseResult } from './web-input-legacy-trig';
