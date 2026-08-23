import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';
import { openQaWebSocket } from '../../../scripts/qa/node-websocket';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UNSAFE_NODE_SELECTOR = 'a,img,script:not([data-test-bundle])';
const BROWSER_SAMPLES = [
  ['valid', '$\\sin^2 x+\\cos^2 x=1$'], ['href', '$\\href{https://example.com}{x}$'],
  ['htmlClass', '$\\htmlClass{danger}{x}$'], ['htmlId', '$\\htmlId{danger}{x}$'],
  ['htmlStyle', '$\\htmlStyle{color:red}{x}$'], ['htmlData', '$\\htmlData{evil=1}{x}$'],
  ['includegraphics', '$\\includegraphics{secret.png}$'], ['malformed', '$\\notacommand{x}$'],
  ['bareLatex', '시작은 f(x)=a\\sin x+b 로 잡아요.'],
] as const;

type ChromeHandle = { readonly process: ChildProcessWithoutNullStreams; readonly port: number };

type CdpTarget = { readonly webSocketDebuggerUrl: string; readonly url: string };

export type BrowserProbeResult = {
  readonly hasKatexHtml: boolean; readonly hasKatexMathml: boolean; readonly unsafeNodeCount: number;
  readonly hasBareLatexHtml: boolean;
  readonly hrefText: string; readonly htmlClassText: string; readonly htmlIdText: string;
  readonly htmlStyleText: string; readonly htmlDataText: string;
  readonly includegraphicsText: string; readonly malformedText: string;
};

export async function runBrowserProbe(): Promise<BrowserProbeResult> {
  const workspaceDir = process.cwd();
  const probeDir = mkdtempSync(path.join(tmpdir(), 'mathgo-katex-probe-'));
  const entryPath = path.join(probeDir, 'entry.tsx');
  const bundlePath = path.join(probeDir, 'bundle.js');
  const htmlPath = path.join(probeDir, 'index.html');

  writeFileSync(entryPath, buildEntrySource(workspaceDir));
  writeFileSync(
    htmlPath,
    `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script data-test-bundle src="file://${bundlePath}"></script></body></html>`,
  );
  await build({
    entryPoints: [entryPath],
    bundle: true,
    outfile: bundlePath,
    absWorkingDir: workspaceDir,
    nodePaths: [path.join(workspaceDir, 'node_modules')],
    platform: 'browser',
    format: 'iife',
    logLevel: 'silent',
  });

  const chrome = await launchChrome(`file://${htmlPath}`);
  try {
    const target = await firstPageTarget(chrome.port, htmlPath);
    const probe = await evaluateInChrome(target.webSocketDebuggerUrl, buildProbeExpression());
    return parseBrowserProbeResult(probe);
  } finally {
    chrome.process.kill();
  }
}

function buildEntrySource(workspaceDir: string): string {
  return `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { TutorMathText } from ${JSON.stringify(path.join(workspaceDir, 'src/components/ai-tutor/TutorMathText.tsx'))};

    const samples = ${JSON.stringify(BROWSER_SAMPLES)};

    function Probe() {
      return (
        <main>
          {samples.map(([id, text]) => (
            <p id={id} key={id}><TutorMathText text={text} /></p>
          ))}
        </main>
      );
    }

    const root = document.querySelector('#root');
    if (root !== null) {
      createRoot(root).render(<Probe />);
    }
  `;
}

function buildProbeExpression(): string {
  return `
    new Promise((resolve) => {
      const text = (id) => document.querySelector('#' + id)?.textContent ?? '';
      const read = () => resolve({
        hasKatexHtml: Boolean(document.querySelector('#valid .katex-html')),
        hasKatexMathml: Boolean(document.querySelector('#valid .katex-mathml math')),
        unsafeNodeCount: document.querySelectorAll(${JSON.stringify(UNSAFE_NODE_SELECTOR)}).length,
        hasBareLatexHtml: Boolean(document.querySelector('#bareLatex .katex-html')),
        hrefText: text('href'),
        htmlClassText: text('htmlClass'),
        htmlIdText: text('htmlId'),
        htmlStyleText: text('htmlStyle'),
        htmlDataText: text('htmlData'),
        includegraphicsText: text('includegraphics'),
        malformedText: text('malformed'),
      });
      let attempts = 0;
      const tick = () => {
        attempts += 1;
        if (document.querySelector('#valid .katex-html') || attempts >= 40) {
          read();
          return;
        }
        setTimeout(tick, 50);
      };
      tick();
    })
  `;
}

async function launchChrome(url: string): Promise<ChromeHandle> {
  const port = 9_300 + Math.floor(Math.random() * 500);
  const profileDir = mkdtempSync(path.join(tmpdir(), 'mathgo-chrome-profile-'));
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-component-update',
    '--disable-background-networking',
    '--no-first-run',
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${port}`,
    '--allow-file-access-from-files',
    url,
  ]);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (chrome.exitCode !== null) {
      throw new Error(`Chrome exited before CDP was ready: ${chrome.exitCode}`);
    }
    if (await canReadCdpVersion(port)) {
      return { process: chrome, port };
    }
    await delay(250);
  }

  chrome.kill();
  throw new Error('Chrome CDP was not ready within 10 seconds');
}

async function canReadCdpVersion(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    return response.ok;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    throw error;
  }
}

async function firstPageTarget(port: number, htmlPath: string): Promise<CdpTarget> {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  const parsed: unknown = await response.json();
  if (!Array.isArray(parsed)) {
    throw new Error('Chrome target list was not an array');
  }
  const expectedUrl = `file://${htmlPath}`;
  for (const target of parsed) {
    if (isCdpTarget(target) && target.url === expectedUrl) {
      return target;
    }
  }
  throw new Error('Chrome target list did not contain a page target');
}

async function evaluateInChrome(webSocketDebuggerUrl: string, expression: string): Promise<unknown> {
  const socket = openQaWebSocket(webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error('CDP websocket failed to open')), {
      once: true,
    });
  });
  try {
    return await new Promise<unknown>((resolve, reject) => {
      socket.addEventListener(
        'message',
        (event) => {
          const parsed: unknown = JSON.parse(String(event.data));
          resolve(readCdpEvaluationValue(parsed));
        },
        { once: true },
      );
      socket.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true },
      }));
      setTimeout(() => reject(new Error('CDP evaluation timed out')), 5_000);
    });
  } finally {
    socket.close();
  }
}

function readCdpEvaluationValue(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('result' in value)) {
    return undefined;
  }
  const outerResult = value.result;
  if (typeof outerResult !== 'object' || outerResult === null || !('result' in outerResult)) {
    return undefined;
  }
  const innerResult = outerResult.result;
  if (typeof innerResult !== 'object' || innerResult === null || !('value' in innerResult)) {
    return undefined;
  }
  return innerResult.value;
}

function isCdpTarget(value: unknown): value is CdpTarget {
  return (
    typeof value === 'object' &&
    value !== null &&
    'webSocketDebuggerUrl' in value &&
    typeof value.webSocketDebuggerUrl === 'string' &&
    'url' in value &&
    typeof value.url === 'string'
  );
}

function parseBrowserProbeResult(value: unknown): BrowserProbeResult {
  if (
    typeof value === 'object' &&
    value !== null &&
    'hasKatexHtml' in value &&
    typeof value.hasKatexHtml === 'boolean' &&
    'hasKatexMathml' in value &&
    typeof value.hasKatexMathml === 'boolean' &&
    'unsafeNodeCount' in value &&
    typeof value.unsafeNodeCount === 'number' &&
    'hasBareLatexHtml' in value &&
    typeof value.hasBareLatexHtml === 'boolean'
  ) {
    return {
      hasKatexHtml: value.hasKatexHtml,
      hasKatexMathml: value.hasKatexMathml,
      unsafeNodeCount: value.unsafeNodeCount,
      hasBareLatexHtml: value.hasBareLatexHtml,
      hrefText: readStringField(value, 'hrefText'),
      htmlClassText: readStringField(value, 'htmlClassText'),
      htmlIdText: readStringField(value, 'htmlIdText'),
      htmlStyleText: readStringField(value, 'htmlStyleText'),
      htmlDataText: readStringField(value, 'htmlDataText'),
      includegraphicsText: readStringField(value, 'includegraphicsText'),
      malformedText: readStringField(value, 'malformedText'),
    };
  }
  throw new Error('Browser probe returned an invalid shape');
}

function readStringField(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field === 'string') {
    return field;
  }
  throw new Error('Browser probe text field was not a string');
}
