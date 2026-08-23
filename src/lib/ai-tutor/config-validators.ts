export type AiTutorParsedModelAlias = 'text' | 'vision' | 'fast' | 'reasoning' | 'fallback';

export type AiTutorParsedModelConfig = {
  readonly id: string;
  readonly alias: AiTutorParsedModelAlias;
};

export type AiTutorIntegerBounds = {
  readonly defaultValue: number;
  readonly min: number;
  readonly max: number;
};

export type AiTutorBooleanParseResult =
  | { readonly ok: true; readonly value: boolean }
  | { readonly ok: false };

export type AiTutorIntegerParseResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly code: 'invalid_integer' | 'out_of_range' };

export type AiTutorModelParseResult<TAlias extends AiTutorParsedModelAlias = AiTutorParsedModelAlias> =
  | { readonly ok: true; readonly model: { readonly id: string; readonly alias: TAlias } }
  | { readonly ok: false; readonly code: 'missing_model' | 'invalid_model_id' | 'unstable_model_alias' };

const forbiddenModelAliasPattern = /(^|[-_/])(latest|preview|experimental|exp)([-_/]|$)/i;
const stableGeminiModelPattern = /^gemini-[0-9]+(?:\.[0-9]+)?-[a-z0-9][a-z0-9-]*$/i;
const retiredGeminiModelReplacements: Readonly<Record<string, string>> = {
  'gemini-2.5-flash': 'gemini-3.1-flash-lite',
};

export function parseAiTutorBoolean(
  value: string | undefined,
  defaultValue: boolean,
): AiTutorBooleanParseResult {
  if (value === undefined || value.trim() === '') return { ok: true, value: defaultValue };
  if (value === 'true') return { ok: true, value: true };
  if (value === 'false') return { ok: true, value: false };
  return { ok: false };
}

export function parseAiTutorBoundedInteger(
  value: string | undefined,
  bounds: AiTutorIntegerBounds,
): AiTutorIntegerParseResult {
  if (value === undefined || value.trim() === '') return { ok: true, value: bounds.defaultValue };
  if (!/^[0-9]+$/.test(value)) return { ok: false, code: 'invalid_integer' };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < bounds.min || parsed > bounds.max) {
    return { ok: false, code: 'out_of_range' };
  }
  return { ok: true, value: parsed };
}

export function parseAiTutorStableGeminiModel<TAlias extends AiTutorParsedModelAlias>(
  value: string | undefined,
  alias: TAlias,
  allowUnstable: boolean,
): AiTutorModelParseResult<TAlias> {
  if (value === undefined || value.trim() === '') return { ok: false, code: 'missing_model' };
  const modelId = retiredGeminiModelReplacements[value.trim()] ?? value.trim();
  if (!stableGeminiModelPattern.test(modelId)) return { ok: false, code: 'invalid_model_id' };
  if (!allowUnstable && forbiddenModelAliasPattern.test(modelId)) {
    return { ok: false, code: 'unstable_model_alias' };
  }
  return { ok: true, model: { id: modelId, alias } };
}
