export const AI_TUTOR_ENV_NAMES = [
  'AI_TUTOR_ENABLED',
  'AI_TUTOR_PAID_BILLING_CONFIRMED',
  'GEMINI_API_KEY',
  'AI_TUTOR_PAIRING_HMAC_SECRET',
  'AI_TUTOR_GEMINI_TEXT_MODEL',
  'AI_TUTOR_GEMINI_VISION_MODEL',
  'AI_TUTOR_GEMINI_FALLBACK_MODEL',
  'AI_TUTOR_MODEL_TIMEOUT_MS',
  'AI_TUTOR_RECENT_TURN_COUNT_CAP',
  'AI_TUTOR_RECENT_TURN_CHARACTER_CAP',
  'AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP',
  'AI_TUTOR_IMAGE_MAX_BYTES',
  'AI_TUTOR_RAW_RETENTION_DAYS',
  'AI_TUTOR_IMAGE_RETENTION_DAYS',
  'AI_TUTOR_METADATA_RETENTION_DAYS',
  'AI_TUTOR_ALLOW_UNSTABLE_MODELS_IN_TESTS',
] as const;

export type AiTutorEnvName = (typeof AI_TUTOR_ENV_NAMES)[number];

export type AiTutorEnvironment = Readonly<Partial<Record<AiTutorEnvName, string>>>;

export type AiTutorRuntime = 'production' | 'test' | 'development';

export type AiTutorConfigIssueCode =
  | 'invalid_boolean'
  | 'invalid_integer'
  | 'out_of_range'
  | 'paid_billing_required'
  | 'missing_secret'
  | 'missing_model'
  | 'invalid_model_id'
  | 'unstable_model_alias';

export type AiTutorConfigIssue = {
  readonly code: AiTutorConfigIssueCode;
  readonly envName: AiTutorEnvName;
};

export type AiTutorModelConfig = {
  readonly id: string;
  readonly alias: 'text' | 'vision' | 'fallback';
};

export type AiTutorSharedConfig = {
  readonly modelTimeoutMs: number;
  readonly caps: {
    readonly recentTurnCount: number;
    readonly recentTurnCharacters: number;
    readonly recentTotalCharacters: number;
  };
  readonly image: { readonly maxBytes: number };
  readonly retentionDays: {
    readonly rawContent: number;
    readonly image: number;
    readonly metadata: number;
  };
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
      readonly fallbackModel: AiTutorModelConfig;
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
