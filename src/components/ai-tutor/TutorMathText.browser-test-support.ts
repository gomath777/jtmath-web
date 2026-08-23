import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';
import { openQaWebSocket } from '../../../scripts/qa/node-websocket';
import { parseBrowserProbeResult, type BrowserProbeResult } from './TutorMathText.browser-probe-result';
export type { BrowserProbeResult } from './TutorMathText.browser-probe-result';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_SHUTDOWN_TIMEOUT_MS = 5_000;
const CDP_EVALUATION_TIMEOUT_MS = 5_000;
const UNSAFE_NODE_SELECTOR = 'a,img,script:not([data-test-bundle])';
const BROWSER_SAMPLES = [
  ['valid', '$\\sin^2 x+\\cos^2 x=1$'], ['href', '$\\href{https://example.com}{x}$'],
  ['htmlClass', '$\\htmlClass{danger}{x}$'], ['htmlId', '$\\htmlId{danger}{x}$'],
  ['htmlStyle', '$\\htmlStyle{color:red}{x}$'], ['htmlData', '$\\htmlData{evil=1}{x}$'],
  ['includegraphics', '$\\includegraphics{secret.png}$'], ['malformed', '$\\notacommand{x}$'],
  ['bareLatex', '시작은 f(x)=a\\sin x+b 로 잡아요.'],
  ['curriculumNotation', '$\\lim_{x \\to 0}\\frac{\\sin x}{x}=1$, $\\angle A=90^\\circ$, $AB\\parallel CD$, $AB\\perp CD$, $\\triangle ABC$, $\\overrightarrow{AB}$, $x\\ne 0$'],
  ['fragmentRecovery', '앞의 $닫히지 않은 조각 뒤에도 $\\dfrac{1}{2}$와 $\\sqrt{x_1^2}$를 읽어요.'],
  ['listRecovery', '목록도 $닫히지 않은 조각 뒤에 $\\dfrac{1}{2}$를 읽어요.'],
  ['scriptMath', 'before $<script>alert(1)</script>$ after $\\dfrac{1}{2}$'],
] as const;

type ChromeHandle = { readonly process: ChildProcess; readonly port: number; readonly profileDir: string };
type BrowserProbeTempResourceKind = 'probeDir' | 'chromeProfileDir';
export type BrowserProbeTempResource = {
  readonly kind: BrowserProbeTempResourceKind;
  readonly path: string;
};
type BrowserProbeOptions = {
  readonly onTempResource?: (resource: BrowserProbeTempResource) => void;
};

type CdpTarget = { readonly webSocketDebuggerUrl: string; readonly url: string };

export async function runBrowserProbe(options: BrowserProbeOptions = {}): Promise<BrowserProbeResult> {
  const workspaceDir = process.cwd();
  const probeDir = mkdtempSync(path.join(tmpdir(), 'mathgo-katex-probe-'));
  options.onTempResource?.({ kind: 'probeDir', path: probeDir });
  const entryPath = path.join(probeDir, 'entry.tsx');
  const bundlePath = path.join(probeDir, 'bundle.js');
  const htmlPath = path.join(probeDir, 'index.html');

  let chrome: ChromeHandle | undefined;
  try {
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

    chrome = await launchChrome(`file://${htmlPath}`, options);
    const target = await firstPageTarget(chrome.port, htmlPath);
    const probe = await evaluateInChrome(target.webSocketDebuggerUrl, buildProbeExpression());
    return parseBrowserProbeResult(probe);
  } finally {
    if (chrome !== undefined) await disposeChrome(chrome);
    rmSync(probeDir, { recursive: true, force: true });
  }
}

function buildEntrySource(workspaceDir: string): string {
  const componentPath = JSON.stringify(path.join(workspaceDir, 'src/components/ai-tutor/TutorMathText.tsx'));
  return `import React from 'react';import { createRoot } from 'react-dom/client';import { TutorMathText } from ${componentPath};const samples = ${JSON.stringify(BROWSER_SAMPLES)};function Probe() { return <main>{samples.map(([id, text]) => id === 'listRecovery' ? <ul key={id}><li id={id}><TutorMathText text={text} /></li></ul> : <p id={id} key={id}><TutorMathText text={text} /></p>)}</main>; } const root = document.querySelector('#root'); if (root !== null) createRoot(root).render(<Probe />);`;
}

function buildProbeExpression(): string {
  return `new Promise((resolve) => { const text = (id) => document.querySelector('#' + id)?.textContent ?? ''; const read = () => { const recovery = document.querySelector('#fragmentRecovery'); const recoveryStyle = recovery === null ? null : getComputedStyle(recovery); resolve({ hasKatexHtml: Boolean(document.querySelector('#valid .katex-html')), hasKatexMathml: Boolean(document.querySelector('#valid .katex-mathml math')), unsafeNodeCount: document.querySelectorAll(${JSON.stringify(UNSAFE_NODE_SELECTOR)}).length, hasBareLatexHtml: Boolean(document.querySelector('#bareLatex .katex-html')), curriculumKatexCount: document.querySelectorAll('#curriculumNotation .katex').length, curriculumLiteralCount: document.querySelectorAll('#curriculumNotation [data-tutor-math="literal"]').length, hrefText: text('href'), htmlClassText: text('htmlClass'), htmlIdText: text('htmlId'), htmlStyleText: text('htmlStyle'), htmlDataText: text('htmlData'), includegraphicsText: text('includegraphics'), malformedText: text('malformed'), fragmentKatexCount: document.querySelectorAll('#fragmentRecovery .katex').length, fragmentLiteralCount: document.querySelectorAll('#fragmentRecovery [data-tutor-math="literal"]').length, listKatexCount: document.querySelectorAll('#listRecovery .katex').length, listLiteralCount: document.querySelectorAll('#listRecovery [data-tutor-math="literal"]').length, scriptMathKatexCount: document.querySelectorAll('#scriptMath .katex').length, scriptMathLiteralCount: document.querySelectorAll('#scriptMath [data-tutor-math="literal"]').length, scriptMathText: text('scriptMath'), recoveryFontFamily: recoveryStyle?.fontFamily ?? '', recoveryFitsHeight: recovery !== null && recovery.scrollHeight <= recovery.clientHeight }); }; let attempts = 0; const tick = () => { attempts += 1; if (document.querySelector('#valid .katex-html') || attempts >= 40) { read(); return; } setTimeout(tick, 50); }; tick(); })`;
}

async function launchChrome(url: string, options: BrowserProbeOptions): Promise<ChromeHandle> {
  const port = 9_300 + Math.floor(Math.random() * 500);
  const profileDir = mkdtempSync(path.join(tmpdir(), 'mathgo-chrome-profile-'));
  options.onTempResource?.({ kind: 'chromeProfileDir', path: profileDir });
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-component-update',
      '--disable-background-networking',
      '--no-first-run',
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${port}`,
      '--allow-file-access-from-files',
      url,
    ],
    { stdio: 'ignore' },
  );

  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (chrome.exitCode !== null) {
        throw new Error(`Chrome exited before CDP was ready: ${chrome.exitCode}`);
      }
      if (await canReadCdpVersion(port)) {
        return { process: chrome, port, profileDir };
      }
      await delay(250);
    }
    throw new Error('Chrome CDP was not ready within 10 seconds');
  } catch (error) {
    await disposeChrome({ process: chrome, port, profileDir });
    throw error;
  }
}

async function disposeChrome(chrome: ChromeHandle): Promise<void> {
  if (!hasChromeExited(chrome.process)) {
    chrome.process.kill('SIGTERM');
    if (!(await waitForChromeExit(chrome.process, CHROME_SHUTDOWN_TIMEOUT_MS))) {
      chrome.process.kill('SIGKILL');
      if (!(await waitForChromeExit(chrome.process, CHROME_SHUTDOWN_TIMEOUT_MS))) {
        throw new Error('Chrome did not exit before browser probe cleanup');
      }
    }
  }
  rmSync(chrome.profileDir, { recursive: true, force: true });
}

function hasChromeExited(chrome: ChildProcess): boolean {
  return chrome.exitCode !== null || chrome.signalCode !== null;
}

async function waitForChromeExit(chrome: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (hasChromeExited(chrome)) return true;
  return await Promise.race([
    new Promise<boolean>((resolve) => chrome.once('close', () => resolve(true))),
    delay(timeoutMs).then(() => false),
  ]);
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
      const settle = (callback: () => void) => {
        clearTimeout(timeout);
        callback();
      };
      const timeout = setTimeout(
        () => settle(() => reject(new Error('CDP evaluation timed out'))),
        CDP_EVALUATION_TIMEOUT_MS,
      );
      socket.addEventListener(
        'message',
        (event) => {
          try {
            const parsed: unknown = JSON.parse(String(event.data));
            settle(() => resolve(readCdpEvaluationValue(parsed)));
          } catch (error) {
            if (error instanceof Error) {
              settle(() => reject(error));
              return;
            }
            settle(() => reject(new Error('CDP evaluation parse failed')));
          }
        },
        { once: true },
      );
      socket.addEventListener(
        'error',
        () => settle(() => reject(new Error('CDP websocket failed during evaluation'))),
        { once: true },
      );
      socket.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true },
      }));
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
