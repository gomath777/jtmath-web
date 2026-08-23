import { parseAiTutorBoolean } from './config-validators';
import { parseEnabledAiTutorConfig } from './config-enabled';
import { parseAiTutorSharedConfig } from './config-shared';
import type {
  AiTutorConfigIssue,
  AiTutorConfigResult,
  AiTutorEnvName,
  AiTutorEnvironment,
  AiTutorRuntime,
} from './config-types';

type ParseOptions = {
  readonly runtime?: AiTutorRuntime;
};

type BooleanParseInput = {
  readonly envName: AiTutorEnvName;
  readonly value: string | undefined;
  readonly defaultValue: boolean;
  readonly issues: AiTutorConfigIssue[];
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
  const shared = parseAiTutorSharedConfig(env, issues);

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

  return parseEnabledAiTutorConfig({
    env,
    shared,
    paidBillingConfirmed,
    allowUnstableModels: runtime !== 'production' && allowUnstableModels,
    issues,
  });
}

function parseBoolean(input: BooleanParseInput): boolean {
  const { envName, value, defaultValue, issues } = input;
  const parsed = parseAiTutorBoolean(value, defaultValue);
  if (parsed.ok) return parsed.value;
  issues.push({ envName, code: 'invalid_boolean' });
  return defaultValue;
}
