import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('./widget-browser-qa.ts', import.meta.url));

function runWidgetBrowserQa(args: readonly string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', scriptPath, ...args], {
    encoding: 'utf8',
    timeout: 10_000,
  });
}

test('Given a negative CLI invocation, When the script is missing a required flag, Then it exits nonzero before launching the browser harness', () => {
  const sandboxDir = mkdtempSync(join(tmpdir(), 'mathgo-widget-qa-negative-'));
  const missingViewportsEvidenceDir = join(sandboxDir, 'missing-viewports');
  const wrongGraphEvidenceDir = join(sandboxDir, 'wrong-graph');
  const runMissingViewports = runWidgetBrowserQa([
    '--fixture',
    'midterm-session2-ui',
    '--route',
    '/lesson/gs2-midterm-2026-w1s2-plane-line',
    '--auth',
    'synthetic-released',
    '--zoom',
    '200',
    '--graph',
    'off',
    '--evidence-dir',
    missingViewportsEvidenceDir,
  ]);
  try {
    assert.notEqual(runMissingViewports.status, 0);
    assert.match(runMissingViewports.stderr, /explicit --viewports/);
    assert.equal(existsSync(missingViewportsEvidenceDir), false);

    const runWrongGraph = runWidgetBrowserQa([
      '--fixture',
      'midterm-session2-ui',
      '--viewports',
      '390x844,768x1024,1280x900',
      '--route',
      '/lesson/gs2-midterm-2026-w1s2-plane-line',
      '--auth',
      'synthetic-released',
      '--zoom',
      '200',
      '--graph',
      'on',
      '--evidence-dir',
      wrongGraphEvidenceDir,
    ]);
    assert.notEqual(runWrongGraph.status, 0);
    assert.match(runWrongGraph.stderr, /--graph off/);
    assert.equal(existsSync(wrongGraphEvidenceDir), false);
  } finally {
    rmSync(sandboxDir, { recursive: true, force: true });
  }
});

test('Given Node disables the global WebSocket, When the QA websocket helper loads, Then the harness falls back to ws without product changes', () => {
  const helperUrl = new URL('../node-websocket.ts', import.meta.url).href;
  const runtimeCheck = spawnSync(
    process.execPath,
    [
      '--no-experimental-websocket',
      '--import',
      'tsx',
      '-e',
      `import(${JSON.stringify(helperUrl)}).then((module) => {
        const runtime = typeof module.describeQaWebSocketRuntime === 'function'
          ? module.describeQaWebSocketRuntime()
          : typeof module.default?.describeQaWebSocketRuntime === 'function'
            ? module.default.describeQaWebSocketRuntime()
            : null;
        if (runtime === null) {
          throw new TypeError('describeQaWebSocketRuntime export missing');
        }
        console.log(JSON.stringify(runtime));
      }).catch((error) => { console.error(error); process.exit(1); })`,
    ],
    { encoding: 'utf8', timeout: 10_000 },
  );

  assert.equal(runtimeCheck.status, 0);
  assert.match(runtimeCheck.stdout, /"globalType":"undefined"/);
  assert.match(runtimeCheck.stdout, /"constructorName":"WebSocket"/);
});
