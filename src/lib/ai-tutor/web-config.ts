import {
  parseRequiredWebAiTutorBoolean,
  parseWebAiTutorModel,
  parseWebAiTutorSharedConfig,
  requireWebAiTutorSecret,
  resolveWebAiTutorRuntime,
  usesDevelopmentFallbackSecret,
} from './web-config-parsing';

export const AI_TUTOR_WEB_ENV_NAMES = [
  'AI_TUTOR_WEB_ENABLED',
  'AI_TUTOR_WEB_PRODUCTION_ENABLED',
  'AI_TUTOR_PAID_BILLING_CONFIRMED',
  'GEMINI_API_KEY',
  'AI_TUTOR_GEMINI_FAST_MODEL',
  'AI_TUTOR_GEMINI_REASONING_MODEL',
  'AI_TUTOR_GEMINI_FALLBACK_MODEL',
  'AI_TUTOR_MODEL_TIMEOUT_MS',
  'AI_TUTOR_RECENT_TURN_COUNT_CAP',
  'AI_TUTOR_RECENT_TURN_CHARACTER_CAP',
  'AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP',
  'STUDENT_TOKEN_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'VERCEL_ENV',
] as const;

export type WebAiTutorEnvName = (typeof AI_TUTOR_WEB_ENV_NAMES)[number];

export type WebAiTutorEnvironment = Readonly<
  Partial<Record<WebAiTutorEnvName | 'AI_TUTOR_ENABLED' | 'AI_TUTOR_PAIRING_HMAC_SECRET', string>>
>;

export type WebAiTutorNodeEnv = 'development' | 'test' | 'production';
export type WebAiTutorRuntime = 'development' | 'test' | 'preview' | 'production';

export type WebAiTutorConfigIssueCode =
  | 'invalid_boolean'
  | 'invalid_integer'
  | 'out_of_range'
  | 'paid_billing_required'
  | 'missing_secret'
  | 'missing_model'
  | 'invalid_model_id'
  | 'unstable_model_alias'
  | 'forbidden_fallback_secret'
  | 'unsupported_runtime';

export type WebAiTutorConfigIssue = {
  readonly envName: WebAiTutorEnvName;
  readonly code: WebAiTutorConfigIssueCode;
};

export type WebAiTutorSharedConfig = {
  readonly modelTimeoutMs: number;
  readonly caps: { readonly recentTurnCount: number; readonly recentTurnCharacters: number; readonly recentTotalCharacters: number };
};

export type WebTutorModelAlias = 'fast' | 'reasoning' | 'fallback';

export type WebTutorModelConfig = {
  readonly id: string;
  readonly alias: WebTutorModelAlias;
};

export type WebAiTutorConfig =
  | (WebAiTutorSharedConfig & {
      readonly status: 'enabled';
      readonly enabled: true;
      readonly paidBillingConfirmed: true;
      readonly geminiApiKey: { readonly present: true };
      readonly studentTokenSecret: { readonly present: true };
      readonly supabaseUrl: { readonly present: true };
      readonly supabaseServiceKey: { readonly present: true };
      readonly models: {
        readonly fast: WebTutorModelConfig;
        readonly reasoning: WebTutorModelConfig;
        readonly fallback: WebTutorModelConfig;
      };
      readonly runtime: WebAiTutorRuntime;
    })
  | (WebAiTutorSharedConfig & {
      readonly status: 'disabled';
      readonly enabled: false;
      readonly reason: 'feature_flag_off' | 'production_disabled';
      readonly runtime: WebAiTutorRuntime;
    });

export type WebAiTutorConfigResult =
  | { readonly ok: true; readonly config: WebAiTutorConfig }
  | { readonly ok: false; readonly issues: readonly WebAiTutorConfigIssue[] };

export type EnabledWebAiTutorConfig = Extract<WebAiTutorConfig, { readonly status: 'enabled' }>;

export type WebAiTutorParseOptions = {
  readonly nodeEnv?: WebAiTutorNodeEnv;
};

export function parseWebAiTutorConfig(
  env: WebAiTutorEnvironment,
  options: WebAiTutorParseOptions = {},
): WebAiTutorConfigResult {
  const runtime = resolveWebAiTutorRuntime(env, options);
  const issues: WebAiTutorConfigIssue[] = [];
  const shared = parseWebAiTutorSharedConfig(env, issues);

  if (runtime === 'production' && !productionOptInEnabled(env, issues)) {
    if (issues.length > 0) return { ok: false, issues };
    return {
      ok: true,
      config: {
        status: 'disabled',
        enabled: false,
        reason: 'production_disabled',
        runtime,
        ...shared,
      },
    };
  }

  if (runtime === undefined) {
    issues.push({ envName: 'VERCEL_ENV', code: 'unsupported_runtime' });
  }

  const webEnabled = parseRequiredWebAiTutorBoolean(
    env.AI_TUTOR_WEB_ENABLED,
    'AI_TUTOR_WEB_ENABLED',
    issues,
  );
  const paidBillingConfirmed = parseRequiredWebAiTutorBoolean(
    env.AI_TUTOR_PAID_BILLING_CONFIRMED,
    'AI_TUTOR_PAID_BILLING_CONFIRMED',
    issues,
  );

  if (webEnabled === false) {
    return issues.length === 0 && runtime !== undefined
      ? {
          ok: true,
          config: {
            status: 'disabled',
            enabled: false,
            reason: 'feature_flag_off',
            runtime,
            ...shared,
          },
        }
      : { ok: false, issues };
  }

  if (paidBillingConfirmed === false) {
    issues.push({ envName: 'AI_TUTOR_PAID_BILLING_CONFIRMED', code: 'paid_billing_required' });
  }

  requireWebAiTutorSecret(env.GEMINI_API_KEY, 'GEMINI_API_KEY', issues);
  const studentSecretPresent = requireWebAiTutorSecret(
    env.STUDENT_TOKEN_SECRET,
    'STUDENT_TOKEN_SECRET',
    issues,
  );
  requireWebAiTutorSecret(env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL', issues);
  requireWebAiTutorSecret(env.SUPABASE_SERVICE_KEY, 'SUPABASE_SERVICE_KEY', issues);

  if (studentSecretPresent && usesDevelopmentFallbackSecret(env.STUDENT_TOKEN_SECRET)) {
    issues.push({ envName: 'STUDENT_TOKEN_SECRET', code: 'forbidden_fallback_secret' });
  }

  const models = parseWebAiTutorModels(env, issues);

  if (issues.length > 0 || runtime === undefined || models === undefined) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    config: {
      status: 'enabled',
      enabled: true,
      paidBillingConfirmed: true,
      geminiApiKey: { present: true },
      studentTokenSecret: { present: true },
      supabaseUrl: { present: true },
      supabaseServiceKey: { present: true },
      models,
      runtime,
      ...shared,
    },
  };
}

function productionOptInEnabled(
  env: WebAiTutorEnvironment,
  issues: WebAiTutorConfigIssue[],
): boolean {
  const value = env.AI_TUTOR_WEB_PRODUCTION_ENABLED?.trim().toLowerCase();
  if (value === 'true') return true;
  if (value === undefined || value === '' || value === 'false') return false;
  issues.push({ envName: 'AI_TUTOR_WEB_PRODUCTION_ENABLED', code: 'invalid_boolean' });
  return false;
}

function parseWebAiTutorModels(
  env: WebAiTutorEnvironment,
  issues: WebAiTutorConfigIssue[],
): EnabledWebAiTutorConfig['models'] | undefined {
  const fast = parseWebAiTutorModel(env.AI_TUTOR_GEMINI_FAST_MODEL, 'AI_TUTOR_GEMINI_FAST_MODEL', 'fast', issues);
  const reasoning = parseWebAiTutorModel(env.AI_TUTOR_GEMINI_REASONING_MODEL, 'AI_TUTOR_GEMINI_REASONING_MODEL', 'reasoning', issues);
  const fallback = parseWebAiTutorModel(env.AI_TUTOR_GEMINI_FALLBACK_MODEL, 'AI_TUTOR_GEMINI_FALLBACK_MODEL', 'fallback', issues);
  if (fast === undefined || reasoning === undefined || fallback === undefined) return undefined;
  return { fast, reasoning, fallback };
}

export function withEnabledWebAiTutorConfig<T>(
  result: WebAiTutorConfigResult,
  construct: (config: EnabledWebAiTutorConfig) => T,
): T | undefined {
  if (!result.ok || result.config.status !== 'enabled') return undefined;
  return construct(result.config);
}
