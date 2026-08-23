import {
  parseAiTutorBoundedInteger,
  type AiTutorIntegerBounds,
} from './config-validators';
import type {
  AiTutorConfigIssue,
  AiTutorEnvName,
  AiTutorEnvironment,
  AiTutorSharedConfig,
} from './config-types';

type IntegerParseInput = {
  readonly envName: AiTutorEnvName;
  readonly value: string | undefined;
  readonly bounds: AiTutorIntegerBounds;
  readonly issues: AiTutorConfigIssue[];
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
} as const satisfies Record<string, AiTutorIntegerBounds>;

export function parseAiTutorSharedConfig(
  env: AiTutorEnvironment,
  issues: AiTutorConfigIssue[],
): AiTutorSharedConfig {
  return {
    modelTimeoutMs: parseInteger({
      envName: 'AI_TUTOR_MODEL_TIMEOUT_MS',
      value: env.AI_TUTOR_MODEL_TIMEOUT_MS,
      bounds: integerBounds.modelTimeoutMs,
      issues,
    }),
    caps: {
      recentTurnCount: parseInteger({
        envName: 'AI_TUTOR_RECENT_TURN_COUNT_CAP',
        value: env.AI_TUTOR_RECENT_TURN_COUNT_CAP,
        bounds: integerBounds.recentTurnCount,
        issues,
      }),
      recentTurnCharacters: parseInteger({
        envName: 'AI_TUTOR_RECENT_TURN_CHARACTER_CAP',
        value: env.AI_TUTOR_RECENT_TURN_CHARACTER_CAP,
        bounds: integerBounds.recentTurnCharacters,
        issues,
      }),
      recentTotalCharacters: parseInteger({
        envName: 'AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP',
        value: env.AI_TUTOR_RECENT_TOTAL_CHARACTER_CAP,
        bounds: integerBounds.recentTotalCharacters,
        issues,
      }),
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
      rawContent: parseInteger({
        envName: 'AI_TUTOR_RAW_RETENTION_DAYS',
        value: env.AI_TUTOR_RAW_RETENTION_DAYS,
        bounds: integerBounds.rawRetentionDays,
        issues,
      }),
      image: parseInteger({
        envName: 'AI_TUTOR_IMAGE_RETENTION_DAYS',
        value: env.AI_TUTOR_IMAGE_RETENTION_DAYS,
        bounds: integerBounds.imageRetentionDays,
        issues,
      }),
      metadata: parseInteger({
        envName: 'AI_TUTOR_METADATA_RETENTION_DAYS',
        value: env.AI_TUTOR_METADATA_RETENTION_DAYS,
        bounds: integerBounds.metadataRetentionDays,
        issues,
      }),
    },
  };
}

function parseInteger(input: IntegerParseInput): number {
  const { envName, value, bounds, issues } = input;
  const parsed = parseAiTutorBoundedInteger(value, bounds);
  if (parsed.ok) return parsed.value;
  issues.push({ envName, code: parsed.code });
  return bounds.defaultValue;
}
