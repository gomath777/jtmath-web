#!/usr/bin/env npx tsx
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AI_TUTOR_WEB_ENV_NAMES,
  parseWebAiTutorConfig,
  type WebAiTutorEnvironment,
  type WebAiTutorNodeEnv,
} from '../../../src/lib/ai-tutor/web-config';

export type WebAiTutorPreflightEnv = WebAiTutorEnvironment;

export type WebAiTutorPreflightInput = {
  readonly env: WebAiTutorPreflightEnv;
  readonly nodeEnv: WebAiTutorNodeEnv;
  readonly namesOnly: boolean;
};

export type WebAiTutorPreflightResult = {
  readonly exitCode: 0 | 1;
  readonly lines: readonly string[];
};

type Check = {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
};

export function runWebAiTutorPreflight(
  input: WebAiTutorPreflightInput,
): WebAiTutorPreflightResult {
  const parsed = parseWebAiTutorConfig(input.env, { nodeEnv: input.nodeEnv });
  const checks = [
    ...AI_TUTOR_WEB_ENV_NAMES.map((name) => ({
      name,
      ok: name === 'VERCEL_ENV' ? input.env[name] !== 'production' : present(input.env[name]),
      detail: name === 'VERCEL_ENV'
        ? 'preview-or-local'
        : present(input.env[name]) ? 'present' : 'missing',
    })),
    runtimeCheck(parsed),
    featureFlagCheck(parsed),
  ];
  const lines = [
    `AI Tutor web preflight output=${input.namesOnly ? 'names-only' : 'redacted'}`,
    ...checks.map((check) => formatCheck(check, input.namesOnly)),
  ];
  return { exitCode: checks.every((check) => check.ok) ? 0 : 1, lines };
}

function runtimeCheck(parsed: ReturnType<typeof parseWebAiTutorConfig>): Check {
  if (!parsed.ok) {
    return {
      name: 'AI_TUTOR_WEB_RUNTIME_CONFIG',
      ok: false,
      detail: parsed.issues.map((issue) => `${issue.envName}:${issue.code}`).join(','),
    };
  }
  return {
    name: 'AI_TUTOR_WEB_RUNTIME_CONFIG',
    ok: true,
    detail: parsed.config.status,
  };
}

function featureFlagCheck(parsed: ReturnType<typeof parseWebAiTutorConfig>): Check {
  return {
    name: 'AI_TUTOR_WEB_FEATURE_FLAG',
    ok: parsed.ok && parsed.config.status === 'enabled',
    detail: parsed.ok ? parsed.config.status : 'invalid',
  };
}

function formatCheck(check: Check, namesOnly: boolean): string {
  const status = check.ok ? 'PASS' : 'FAIL';
  return namesOnly ? `${status} ${check.name}` : `${status} ${check.name} ${check.detail}`;
}

function present(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseCli(argv: readonly string[]): WebAiTutorPreflightInput {
  const parsed = parseArgs(argv);
  return {
    env: parsed.envJson ? JSON.parse(parsed.envJson) : process.env,
    nodeEnv: parseNodeEnv(parsed.options['node-env']),
    namesOnly: parsed.flags.has('names-only'),
  };
}

function parseNodeEnv(value: string | undefined): WebAiTutorNodeEnv {
  switch (value) {
    case 'development':
    case 'test':
    case 'production':
      return value;
    default:
      return 'production';
  }
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
    if (arg === undefined) continue;
    if (arg === '--env-json') {
      envJson = argv[index + 1];
      index += 1;
      continue;
    }
    if (!arg.startsWith('--')) continue;
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
  const result = runWebAiTutorPreflight(parseCli(process.argv.slice(2)));
  for (const line of result.lines) console.log(line);
  process.exitCode = result.exitCode;
}
