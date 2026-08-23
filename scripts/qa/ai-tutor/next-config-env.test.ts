import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

type EnvCase = {
  readonly envName?: 'AI_TUTOR_WEB_ENABLED';
  readonly shellValue?: string;
};

const baseEnv = {
  PATH: process.env.PATH ?? '',
  NODE_ENV: 'test',
} satisfies NodeJS.ProcessEnv;

test('next config preserves explicit shell AI_TUTOR_WEB_ENABLED false over local env', () => {
  // Given
  const fixture = createNextConfigFixture();

  try {
    // When
    const value = loadConfigAndReadFlag(fixture.configPath, { shellValue: 'false' });

    // Then
    assert.equal(value, 'false');
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('next config still loads local AI_TUTOR_WEB_ENABLED when shell flag is absent', () => {
  // Given
  const fixture = createNextConfigFixture();

  try {
    // When
    const value = loadConfigAndReadFlag(fixture.configPath, {});

    // Then
    assert.equal(value, 'true');
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

function createNextConfigFixture(): { readonly directory: string; readonly configPath: string } {
  const fixtureRoot = path.join(process.cwd(), 'tmp', 'next-config-env-tests');
  mkdirSync(fixtureRoot, { recursive: true });
  const directory = mkdtempSync(path.join(fixtureRoot, 'case-'));
  const configPath = path.join(directory, 'next.config.mjs');
  const source = readFileSync(path.join(process.cwd(), 'next.config.mjs'), 'utf8');

  writeFileSync(configPath, source);
  writeFileSync(path.join(directory, '.env.local'), 'AI_TUTOR_WEB_ENABLED=true\n');

  return { directory, configPath };
}

function loadConfigAndReadFlag(configPath: string, envCase: EnvCase): string {
  const configUrl = pathToFileURL(configPath).href;
  const envName = envCase.envName ?? 'AI_TUTOR_WEB_ENABLED';
  const script = [
    `await import(${JSON.stringify(configUrl)});`,
    `process.stdout.write(process.env[${JSON.stringify(envName)}] ?? '<unset>');`,
  ].join('\n');
  const env = envCase.shellValue === undefined
    ? baseEnv
    : { ...baseEnv, [envName]: envCase.shellValue };

  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const lines = output.trim().split(/\r?\n/);
  return lines[lines.length - 1] ?? '';
}
