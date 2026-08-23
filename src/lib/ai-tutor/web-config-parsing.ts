import {
  parseAiTutorBoolean,
  parseAiTutorBoundedInteger,
  parseAiTutorStableGeminiModel,
  type AiTutorIntegerBounds,
} from './config-validators';
import type {
  WebAiTutorConfigIssue,
  WebAiTutorEnvName,
  WebAiTutorEnvironment,
  WebAiTutorParseOptions,
  WebAiTutorRuntime,
  WebAiTutorSharedConfig,
  WebTutorModelConfig,
} from './web-config';

type WebAiTutorIntegerKey =
  | 'modelTimeoutMs'
  | 'recentTurnCount'
  | 'recentTurnCharacters'
  | 'recentTotalCharacters';

const developmentFallbackSecret = 'dev-fallback-secret-change-me';

const integerBounds = {
  modelTimeoutMs: { defaultValue: 90_000, min: 1_000, max: 110_000 },
  recentTurnCount: { defaultValue: 6, min: 1, max: 6 },
  recentTurnCharacters: { defaultValue: 1_200, min: 100, max: 1_200 },
  recentTotalCharacters: { defaultValue: 6_000, min: 500, max: 6_000 },
} as const satisfies Record<WebAiTutorIntegerKey, AiTutorIntegerBounds>;

export function resolveWebAiTutorRuntime(
  env: WebAiTutorEnvironment,
  options: WebAiTutorParseOptions,
): WebAiTutorRuntime | undefined {
  if (env.VERCEL_ENV === 'production') return 'production';
  if (env.VERCEL_ENV === 'preview') return 'preview';
  if (env.VERCEL_ENV !== undefined && env.VERCEL_ENV.trim() !== '') return undefined;
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv === 'test') return 'test';
  if (nodeEnv === 'development') return 'development';
  return undefined;
}

export function parseWebAiTutorSharedConfig(
  env: WebAiTutorEnvironment,
  issues: WebAiTutorConfigIssue[],
): WebAiTutorSharedConfig {
  return {
    modelTimeoutMs: parseBoundedInteger(
      env.AI_TUTOR_MODEL_TIMEOUT_MS,
      'AI_TUTOR_MODEL_TIMEOUT_MS',
      integerBounds.modelTimeoutMs,
      issues,
    ),
    caps: {
      recentTurnCount: parseBoundedInteger(
        env.AI_TUTOR_RECENT_TURN_COUNT_CAP,
        'AI_TUTOR_RECENT_TURN_COUNT_CAP',
        integerBounds.recentTurnCount,
        issues,
      ),
      recentTurnCharacters: parseBoundedInteger(
        env.AI_TUTOR_RECENT_TURN_CHARACTER_CAP,
        'AI_TUTOR_RECENT_TURN_CHARACTER_CAP',
        integerBounds.recentTurnCharacters,
        issues,
      ),
      recentTotalCharacters: parseBoundedInteger(
        env.AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP,
        'AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP',
        integerBounds.recentTotalCharacters,
        issues,
      ),
    },
  };
}

export function parseRequiredWebAiTutorBoolean(
  value: string | undefined,
  envName: WebAiTutorEnvName,
  issues: WebAiTutorConfigIssue[],
): boolean | undefined {
  if (isBlank(value)) {
    issues.push({ envName, code: 'invalid_boolean' });
    return undefined;
  }
  const parsed = parseAiTutorBoolean(value, false);
  if (!parsed.ok) {
    issues.push({ envName, code: 'invalid_boolean' });
    return undefined;
  }
  return parsed.value;
}

export function parseWebAiTutorModel<TAlias extends 'fast' | 'reasoning' | 'fallback'>(
  value: string | undefined,
  envName: WebAiTutorEnvName,
  alias: TAlias,
  issues: WebAiTutorConfigIssue[],
): (WebTutorModelConfig & { readonly alias: TAlias }) | undefined {
  const parsed = parseAiTutorStableGeminiModel(value, alias, true);
  if (parsed.ok) {
    return parsed.model;
  }
  issues.push({ envName, code: parsed.code });
  return undefined;
}

export function requireWebAiTutorSecret(
  value: string | undefined,
  envName: WebAiTutorEnvName,
  issues: WebAiTutorConfigIssue[],
): boolean {
  if (isBlank(value)) {
    issues.push({ envName, code: 'missing_secret' });
    return false;
  }
  return true;
}

export function usesDevelopmentFallbackSecret(value: string | undefined): boolean {
  return value?.trim() === developmentFallbackSecret;
}

function parseBoundedInteger(
  value: string | undefined,
  envName: WebAiTutorEnvName,
  bounds: AiTutorIntegerBounds,
  issues: WebAiTutorConfigIssue[],
): number {
  const parsed = parseAiTutorBoundedInteger(value, bounds);
  if (parsed.ok) {
    return parsed.value;
  }
  issues.push({
    envName,
    code: value !== undefined && /^[0-9]+$/.test(value) ? 'out_of_range' : 'invalid_integer',
  });
  return bounds.defaultValue;
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}
