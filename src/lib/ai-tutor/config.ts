export const AI_TUTOR_ENV_NAMES = [
  'AI_TUTOR_ENABLED', 'AI_TUTOR_PAID_BILLING_CONFIRMED', 'GEMINI_API_KEY', 'AI_TUTOR_PAIRING_HMAC_SECRET',
  'AI_TUTOR_GEMINI_TEXT_MODEL', 'AI_TUTOR_GEMINI_VISION_MODEL',
  'AI_TUTOR_MODEL_TIMEOUT_MS', 'AI_TUTOR_RECENT_TURN_COUNT_CAP',
  'AI_TUTOR_RECENT_TURN_CHARACTER_CAP', 'AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP',
  'AI_TUTOR_IMAGE_MAX_BYTES', 'AI_TUTOR_RAW_RETENTION_DAYS',
  'AI_TUTOR_IMAGE_RETENTION_DAYS', 'AI_TUTOR_METADATA_RETENTION_DAYS',
  'AI_TUTOR_ALLOW_UNSTABLE_MODELS_IN_TESTS',
] as const;

export type AiTutorEnvName = (typeof AI_TUTOR_ENV_NAMES)[number];

export type AiTutorEnvironment = Readonly<Partial<Record<AiTutorEnvName, string>>>;

export type AiTutorRuntime = 'production' | 'test' | 'development';

export type AiTutorConfigIssueCode = 'invalid_boolean' | 'invalid_integer' | 'out_of_range' | 'paid_billing_required' | 'missing_secret' | 'missing_model' | 'invalid_model_id' | 'unstable_model_alias';

export type AiTutorConfigIssue = {
  readonly code: AiTutorConfigIssueCode;
  readonly envName: AiTutorEnvName;
};

export type AiTutorModelConfig = {
  readonly id: string;
  readonly alias: 'text' | 'vision';
};

export type AiTutorSharedConfig = {
  readonly modelTimeoutMs: number;
  readonly caps: { readonly recentTurnCount: number; readonly recentTurnCharacters: number; readonly recentTotalCharacters: number };
  readonly image: { readonly maxBytes: number };
  readonly retentionDays: { readonly rawContent: number; readonly image: number; readonly metadata: number };
};

export type AiTutorConfig =
  | (AiTutorSharedConfig & {
      readonly status: 'enabled';
      readonly enabled: true;
      readonly paidBillingConfirmed: true;
      readonly geminiApiKey: { readonly present: true };
      readonly pairingHmacSecret: { readonly present: true };
      readonly textModel: AiTutorModelConfig;
      readonly visionModel: AiTutorModelConfig;
    })
  | (AiTutorSharedConfig & {
      readonly status: 'disabled';
      readonly enabled: false;
    });

export type AiTutorConfigResult =
  | {
      readonly ok: true;
      readonly config: AiTutorConfig;
    }
  | {
      readonly ok: false;
      readonly issues: readonly AiTutorConfigIssue[];
    };

type ParseOptions = {
  readonly runtime?: AiTutorRuntime;
};

type IntegerBounds = {
  readonly defaultValue: number;
  readonly min: number;
  readonly max: number;
};

type EnvValueInput = {
  readonly envName: AiTutorEnvName;
  readonly value: string | undefined;
  readonly issues: AiTutorConfigIssue[];
};

type BooleanParseInput = EnvValueInput & { readonly defaultValue: boolean };
type IntegerParseInput = EnvValueInput & { readonly bounds: IntegerBounds };

type ModelParseInput = EnvValueInput & {
  readonly alias: AiTutorModelConfig['alias'];
  readonly allowUnstable: boolean;
};

const mebibyte = 1024 * 1024;

const integerBounds = {
  modelTimeoutMs: { defaultValue: 20_000, min: 1_000, max: 22_000 },
  recentTurnCount: { defaultValue: 6, min: 1, max: 12 },
  recentTurnCharacters: { defaultValue: 1_200, min: 100, max: 2_000 },
  recentTotalCharacters: { defaultValue: 6_000, min: 500, max: 8_000 },
  imageMaxBytes: { defaultValue: 8 * mebibyte, min: 1, max: 8 * mebibyte },
  rawRetentionDays: { defaultValue: 90, min: 90, max: 365 },
  imageRetentionDays: { defaultValue: 30, min: 30, max: 90 },
  metadataRetentionDays: { defaultValue: 365, min: 365, max: 3_650 },
} as const satisfies Record<string, IntegerBounds>;

const forbiddenModelAliasPattern = /(^|[-_/])(latest|preview|experimental|exp)([-_/]|$)/i;
const stableGeminiModelPattern = /^gemini-[0-9]+(?:\.[0-9]+)?-[a-z0-9][a-z0-9-]*$/i;
const retiredGeminiModelReplacements: Readonly<Record<string, string>> = {
  'gemini-2.5-flash': 'gemini-3.1-flash-lite',
};

export function parseAiTutorConfig(
  env: AiTutorEnvironment,
  options: ParseOptions = {},
): AiTutorConfigResult {
  const runtime = options.runtime ?? 'production';
  const issues: AiTutorConfigIssue[] = [];
  const enabled = parseBoolean({
    envName: 'AI_TUTOR_ENABLED',
    value: env.AI_TUTOR_ENABLED,
    defaultValue: false,
    issues,
  });
  const paidBillingConfirmed = parseBoolean({
    envName: 'AI_TUTOR_PAID_BILLING_CONFIRMED',
    value: env.AI_TUTOR_PAID_BILLING_CONFIRMED,
    defaultValue: false,
    issues,
  });
  const allowUnstableModels = parseBoolean({
    envName: 'AI_TUTOR_ALLOW_UNSTABLE_MODELS_IN_TESTS',
    value: env.AI_TUTOR_ALLOW_UNSTABLE_MODELS_IN_TESTS,
    defaultValue: false,
    issues,
  });
  const shared = parseSharedConfig(env, issues);

  if (!enabled) {
    return issues.length === 0
      ? {
          ok: true,
          config: {
            status: 'disabled',
            enabled: false,
            ...shared,
          },
        }
      : { ok: false, issues };
  }

  if (!paidBillingConfirmed) {
    issues.push({
      envName: 'AI_TUTOR_PAID_BILLING_CONFIRMED',
      code: 'paid_billing_required',
    });
  }

  if (isBlank(env.GEMINI_API_KEY)) {
    issues.push({ envName: 'GEMINI_API_KEY', code: 'missing_secret' });
  }
  if (isBlank(env.AI_TUTOR_PAIRING_HMAC_SECRET)) {
    issues.push({ envName: 'AI_TUTOR_PAIRING_HMAC_SECRET', code: 'missing_secret' });
  }

  const unstableModelAllowed = runtime !== 'production' && allowUnstableModels;
  const textModel = parseModel({
    envName: 'AI_TUTOR_GEMINI_TEXT_MODEL',
    value: env.AI_TUTOR_GEMINI_TEXT_MODEL,
    alias: 'text',
    allowUnstable: unstableModelAllowed,
    issues,
  });
  const visionModel = parseModel({
    envName: 'AI_TUTOR_GEMINI_VISION_MODEL',
    value: env.AI_TUTOR_GEMINI_VISION_MODEL,
    alias: 'vision',
    allowUnstable: unstableModelAllowed,
    issues,
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  if (textModel === undefined || visionModel === undefined) {
    return {
      ok: false,
      issues: [
        { envName: 'AI_TUTOR_GEMINI_TEXT_MODEL', code: 'missing_model' },
        { envName: 'AI_TUTOR_GEMINI_VISION_MODEL', code: 'missing_model' },
      ],
    };
  }

  return {
    ok: true,
    config: {
      status: 'enabled',
      enabled: true,
      paidBillingConfirmed: true,
      geminiApiKey: { present: true },
      pairingHmacSecret: { present: true },
      textModel,
      visionModel,
      ...shared,
    },
  };
}

function parseSharedConfig(env: AiTutorEnvironment, issues: AiTutorConfigIssue[]): AiTutorSharedConfig {
  return {
    modelTimeoutMs: parseInteger({
      envName: 'AI_TUTOR_MODEL_TIMEOUT_MS',
      value: env.AI_TUTOR_MODEL_TIMEOUT_MS,
      bounds: integerBounds.modelTimeoutMs,
      issues,
    }),
    caps: {
      recentTurnCount: parseInteger({ envName: 'AI_TUTOR_RECENT_TURN_COUNT_CAP', value: env.AI_TUTOR_RECENT_TURN_COUNT_CAP, bounds: integerBounds.recentTurnCount, issues }),
      recentTurnCharacters: parseInteger({ envName: 'AI_TUTOR_RECENT_TURN_CHARACTER_CAP', value: env.AI_TUTOR_RECENT_TURN_CHARACTER_CAP, bounds: integerBounds.recentTurnCharacters, issues }),
      recentTotalCharacters: parseInteger({ envName: 'AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP', value: env.AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP, bounds: integerBounds.recentTotalCharacters, issues }),
    },
    image: {
      maxBytes: parseInteger({
        envName: 'AI_TUTOR_IMAGE_MAX_BYTES',
        value: env.AI_TUTOR_IMAGE_MAX_BYTES,
        bounds: integerBounds.imageMaxBytes,
        issues,
      }),
    },
    retentionDays: {
      rawContent: parseInteger({ envName: 'AI_TUTOR_RAW_RETENTION_DAYS', value: env.AI_TUTOR_RAW_RETENTION_DAYS, bounds: integerBounds.rawRetentionDays, issues }),
      image: parseInteger({ envName: 'AI_TUTOR_IMAGE_RETENTION_DAYS', value: env.AI_TUTOR_IMAGE_RETENTION_DAYS, bounds: integerBounds.imageRetentionDays, issues }),
      metadata: parseInteger({ envName: 'AI_TUTOR_METADATA_RETENTION_DAYS', value: env.AI_TUTOR_METADATA_RETENTION_DAYS, bounds: integerBounds.metadataRetentionDays, issues }),
    },
  };
}

function parseBoolean(input: BooleanParseInput): boolean {
  const { envName, value, defaultValue, issues } = input;
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  issues.push({ envName, code: 'invalid_boolean' });
  return defaultValue;
}

function parseInteger(input: IntegerParseInput): number {
  const { envName, value, bounds, issues } = input;
  if (value === undefined || value.trim() === '') {
    return bounds.defaultValue;
  }
  if (!/^[0-9]+$/.test(value)) {
    issues.push({ envName, code: 'invalid_integer' });
    return bounds.defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < bounds.min || parsed > bounds.max) {
    issues.push({ envName, code: 'out_of_range' });
    return bounds.defaultValue;
  }
  return parsed;
}

function parseModel(input: ModelParseInput): AiTutorModelConfig | undefined {
  const { envName, value, alias, allowUnstable, issues } = input;
  if (value === undefined || value.trim() === '') {
    issues.push({ envName, code: 'missing_model' });
    return undefined;
  }
  const modelId = retiredGeminiModelReplacements[value.trim()] ?? value.trim();
  if (!stableGeminiModelPattern.test(modelId)) {
    issues.push({ envName, code: 'invalid_model_id' });
    return undefined;
  }
  if (!allowUnstable && forbiddenModelAliasPattern.test(modelId)) {
    issues.push({ envName, code: 'unstable_model_alias' });
    return undefined;
  }
  return { id: modelId, alias };
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}
