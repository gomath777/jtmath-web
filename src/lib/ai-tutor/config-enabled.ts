import { parseAiTutorStableGeminiModel } from './config-validators';
import type {
  AiTutorConfigIssue,
  AiTutorConfigResult,
  AiTutorEnvironment,
  AiTutorModelConfig,
  AiTutorSharedConfig,
} from './config-types';

type EnabledConfigInput = {
  readonly env: AiTutorEnvironment;
  readonly shared: AiTutorSharedConfig;
  readonly paidBillingConfirmed: boolean;
  readonly allowUnstableModels: boolean;
  readonly issues: AiTutorConfigIssue[];
};

type ModelParseInput = {
  readonly envName:
    | 'AI_TUTOR_GEMINI_TEXT_MODEL'
    | 'AI_TUTOR_GEMINI_VISION_MODEL'
    | 'AI_TUTOR_GEMINI_FALLBACK_MODEL';
  readonly value: string | undefined;
  readonly alias: AiTutorModelConfig['alias'];
  readonly allowUnstable: boolean;
  readonly issues: AiTutorConfigIssue[];
};

type AiTutorModelSet = {
  readonly textModel: AiTutorModelConfig;
  readonly visionModel: AiTutorModelConfig;
  readonly fallbackModel: AiTutorModelConfig;
};

type ModelSetParseResult =
  | { readonly ok: true; readonly models: AiTutorModelSet }
  | { readonly ok: false };

const defaultFallbackGeminiModel = 'gemini-3.1-flash';

export function parseEnabledAiTutorConfig(input: EnabledConfigInput): AiTutorConfigResult {
  const { env, shared, paidBillingConfirmed, allowUnstableModels, issues } = input;

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

  const modelResult = parseAiTutorModels(env, allowUnstableModels, issues);
  if (!modelResult.ok || issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    config: {
      status: 'enabled',
      enabled: true,
      paidBillingConfirmed: true,
      geminiApiKey: { present: true },
      pairingHmacSecret: { present: true },
      ...modelResult.models,
      ...shared,
    },
  };
}

function parseAiTutorModels(
  env: AiTutorEnvironment,
  allowUnstable: boolean,
  issues: AiTutorConfigIssue[],
): ModelSetParseResult {
  const textModel = parseModel({
    envName: 'AI_TUTOR_GEMINI_TEXT_MODEL',
    value: env.AI_TUTOR_GEMINI_TEXT_MODEL,
    alias: 'text',
    allowUnstable,
    issues,
  });
  const visionModel = parseModel({
    envName: 'AI_TUTOR_GEMINI_VISION_MODEL',
    value: env.AI_TUTOR_GEMINI_VISION_MODEL,
    alias: 'vision',
    allowUnstable,
    issues,
  });
  const fallbackModel = parseModel({
    envName: 'AI_TUTOR_GEMINI_FALLBACK_MODEL',
    value: env.AI_TUTOR_GEMINI_FALLBACK_MODEL ?? defaultFallbackGeminiModel,
    alias: 'fallback',
    allowUnstable,
    issues,
  });

  if (textModel === undefined || visionModel === undefined || fallbackModel === undefined) {
    return { ok: false };
  }
  return { ok: true, models: { textModel, visionModel, fallbackModel } };
}

function parseModel(input: ModelParseInput): AiTutorModelConfig | undefined {
  const { envName, value, alias, allowUnstable, issues } = input;
  const parsed = parseAiTutorStableGeminiModel(value, alias, allowUnstable);
  if (parsed.ok) return parsed.model;
  issues.push({ envName, code: parsed.code });
  return undefined;
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}
