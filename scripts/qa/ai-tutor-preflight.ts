#!/usr/bin/env npx tsx
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { AI_TUTOR_ENV_NAMES, parseAiTutorConfig, type AiTutorEnvironment } from '../../src/lib/ai-tutor/config';

export const AI_TUTOR_OPERATIONAL_PREFLIGHT_NAMES = [
  'GOOGLE_CHAT_ENDPOINT_URL',
  'GOOGLE_CHAT_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_CHAT_MEDIA_CLIENT_EMAIL',
  'GOOGLE_CHAT_MEDIA_PRIVATE_KEY',
  'GOOGLE_CHAT_MEDIA_AUTH_READY',
  'AI_TUTOR_PRIVATE_STORAGE_READY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
] as const;

export type AiTutorOperationalPreflightName = (typeof AI_TUTOR_OPERATIONAL_PREFLIGHT_NAMES)[number];
export type AiTutorPreflightName = (typeof AI_TUTOR_ENV_NAMES)[number] | AiTutorOperationalPreflightName;
export type AiTutorPreflightEnv = AiTutorEnvironment & Readonly<Partial<Record<AiTutorOperationalPreflightName, string>>>;
export type AiTutorPreflightMode = 'local' | 'preview' | 'production';

export type AiTutorPreflightInput = {
  readonly env: AiTutorPreflightEnv;
  readonly mode: AiTutorPreflightMode;
  readonly namesOnly: boolean;
  readonly rates?: AiTutorCostRates;
};

export type AiTutorCostRates = {
  readonly textInputPerMillion: number;
  readonly textOutputPerMillion: number;
  readonly imageInputPerUnit: number;
  readonly storageGbMonth: number;
  readonly vercelOveragePerMillionRequests: number;
  readonly supabaseOveragePerGb: number;
};

export type AiTutorPreflightResult = {
  readonly exitCode: 0 | 1;
  readonly lines: readonly string[];
};

type Check = {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
};

const allNames = [...AI_TUTOR_ENV_NAMES, ...AI_TUTOR_OPERATIONAL_PREFLIGHT_NAMES] as const;

export function runAiTutorPreflight(input: AiTutorPreflightInput): AiTutorPreflightResult {
  const checks = [
    ...requiredNameChecks(input.env),
    ...runtimeChecks(input.env, input.mode),
    ...operationalChecks(input.env, input.mode),
  ];
  const costLines = input.rates ? formatCostScenarios(input.rates) : ['INFO COST_RATES not supplied; copy current official rates into CLI flags before launch'];
  const lines = [
    `AI Tutor preflight mode=${input.mode} output=${input.namesOnly ? 'names-only' : 'redacted'}`,
    ...checks.map((check) => formatCheck(check, input.namesOnly)),
    ...costLines,
  ];
  return { exitCode: checks.every((check) => check.ok) ? 0 : 1, lines };
}

function requiredNameChecks(env: AiTutorPreflightEnv): readonly Check[] {
  return allNames.map((name) => ({
    name,
    ok: present(env[name]),
    detail: present(env[name]) ? 'present' : 'missing',
  }));
}

function runtimeChecks(env: AiTutorPreflightEnv, mode: AiTutorPreflightMode): readonly Check[] {
  const parsed = parseAiTutorConfig(env, { runtime: mode === 'local' ? 'development' : 'production' });
  if (parsed.ok) {
    return [
      { name: 'AI_TUTOR_RUNTIME_CONFIG', ok: true, detail: parsed.config.status },
      { name: 'AI_TUTOR_FEATURE_FLAG', ok: parsed.config.status === 'enabled', detail: parsed.config.status },
    ];
  }
  return [
    {
      name: 'AI_TUTOR_RUNTIME_CONFIG',
      ok: false,
      detail: parsed.issues.map((issue) => `${issue.envName}:${issue.code}`).join(','),
    },
  ];
}

function operationalChecks(env: AiTutorPreflightEnv, mode: AiTutorPreflightMode): readonly Check[] {
  const productionGateOk = mode !== 'production' || env.AI_TUTOR_ENABLED === 'false';
  return [
    {
      name: 'GOOGLE_CHAT_MEDIA_SCOPE',
      ok: env.GOOGLE_CHAT_MEDIA_AUTH_READY === 'true',
      detail: 'requires chat.bot app media auth',
    },
    {
      name: 'AI_TUTOR_PRIVATE_STORAGE',
      ok: env.AI_TUTOR_PRIVATE_STORAGE_READY === 'true',
      detail: 'requires private ai-tutor bucket and server-only table access',
    },
    {
      name: 'PRODUCTION_ENABLEMENT_GATE',
      ok: productionGateOk,
      detail: productionGateOk ? 'closed' : 'production feature flag must remain off before explicit window',
    },
  ];
}

function formatCheck(check: Check, namesOnly: boolean): string {
  const status = check.ok ? 'PASS' : 'FAIL';
  return namesOnly ? `${status} ${check.name}` : `${status} ${check.name} ${check.detail}`;
}

function formatCostScenarios(rates: AiTutorCostRates): readonly string[] {
  return [5, 30, 100].map((students) => {
    const textTurns = students * 80;
    const imageTurns = students * 8;
    const inputMillionTokens = textTurns * 1_200 / 1_000_000;
    const outputMillionTokens = textTurns * 400 / 1_000_000;
    const estimate =
      inputMillionTokens * rates.textInputPerMillion +
      outputMillionTokens * rates.textOutputPerMillion +
      imageTurns * rates.imageInputPerUnit +
      rates.storageGbMonth * 0.5 +
      rates.vercelOveragePerMillionRequests * 0.01 +
      rates.supabaseOveragePerGb * 0.5;
    return `INFO COST_ESTIMATE students=${students} formulaOnlyMonthly=${estimate.toFixed(2)}`;
  });
}

function present(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseCli(argv: readonly string[]): AiTutorPreflightInput {
  const options = parseArgs(argv);
  return {
    env: options.envJson ? JSON.parse(options.envJson) as AiTutorPreflightEnv : process.env as AiTutorPreflightEnv,
    mode: parseMode(options.options.mode),
    namesOnly: options.flags.has('names-only'),
    rates: parseRates(options.options),
  };
}

function parseMode(value: string | undefined): AiTutorPreflightMode {
  switch (value) {
    case 'preview':
    case 'production':
      return value;
    default:
      return 'local';
  }
}

function parseRates(options: Readonly<Record<string, string>>): AiTutorCostRates | undefined {
  const keys = ['text-input-rate', 'text-output-rate', 'image-input-rate', 'storage-gb-rate', 'vercel-request-rate', 'supabase-gb-rate'] as const;
  if (!keys.every((key) => options[key] !== undefined)) return undefined;
  return {
    textInputPerMillion: Number(options['text-input-rate']),
    textOutputPerMillion: Number(options['text-output-rate']),
    imageInputPerUnit: Number(options['image-input-rate']),
    storageGbMonth: Number(options['storage-gb-rate']),
    vercelOveragePerMillionRequests: Number(options['vercel-request-rate']),
    supabaseOveragePerGb: Number(options['supabase-gb-rate']),
  };
}

function parseArgs(argv: readonly string[]): {
  readonly flags: ReadonlySet<string>;
  readonly options: Readonly<Record<string, string>>;
  readonly envJson: string | undefined;
} {
  const flags = new Set<string>();
  const options: Record<string, string> = {};
  let envJson: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--env-json') {
      envJson = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === undefined || !arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else {
      flags.add(key);
    }
  }
  return { flags, options, envJson };
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) {
  const result = runAiTutorPreflight(parseCli(process.argv.slice(2)));
  for (const line of result.lines) console.log(line);
  process.exitCode = result.exitCode;
}
