#!/usr/bin/env npx tsx

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { mkdir, mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

const EVIDENCE_DIR = '.omo/evidence/summer-5week-assigned-subjects/task-8-final';
const MASTER_PIN = process.env.SUMMER_5WEEK_MASTER_PIN ?? '999999';

type Viewport = {
  readonly name: string;
  readonly width: number;
  readonly height: number;
};

type CdpResponse = {
  readonly id?: number;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
};

type ScreenshotCase = {
  readonly name: string;
  readonly path: string;
  readonly viewport: Viewport;
  readonly pin: string | null;
};

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome',
  'chromium',
] as const;

const CASES: readonly ScreenshotCase[] = [
  { name: 'gate-mobile', path: '/5wsummer', viewport: { name: '390x844', width: 390, height: 844 }, pin: null },
  { name: 'invalid-mobile', path: '/5wsummer?gate=invalid', viewport: { name: '390x844', width: 390, height: 844 }, pin: null },
  { name: 'gate-desktop', path: '/5wsummer', viewport: { name: '1280x900', width: 1280, height: 900 }, pin: null },
  { name: 'one-subject', path: '/5wsummer', viewport: { name: '1280x900', width: 1280, height: 900 }, pin: '100101' },
  { name: 'one-subject-mobile', path: '/5wsummer', viewport: { name: '390x844', width: 390, height: 844 }, pin: '100101' },
  { name: 'two-subject', path: '/5wsummer', viewport: { name: '768x1024', width: 768, height: 1024 }, pin: '110202' },
  { name: 'master-cards', path: '/5wsummer', viewport: { name: '1280x900', width: 1280, height: 900 }, pin: MASTER_PIN },
];

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value ?? fallback;
}

async function chromePath(): Promise<string> {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate.startsWith('/')) {
      try {
        const file = await import('fs/promises');
        await file.access(candidate);
        return candidate;
      } catch {
        continue;
      }
    }
    return candidate;
  }
  throw new Error('Chrome binary not found');
}

function launchChrome(binary: string, userDataDir: string, port: number): ChildProcessWithoutNullStreams {
  return spawn(binary, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);
}

async function waitForEndpoint(port: number): Promise<void> {
  const url = `http://127.0.0.1:${port}/json/version`;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('Chrome DevTools endpoint did not start');
}

async function createPage(port: number): Promise<string> {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const body: unknown = await response.json();
  if (typeof body === 'object' && body !== null && 'webSocketDebuggerUrl' in body) {
    const ws = body.webSocketDebuggerUrl;
    if (typeof ws === 'string') return ws;
  }
  throw new Error('Could not create Chrome page');
}

class CdpClient {
  private nextId = 1;
  private readonly pending = new Map<number, (value: CdpResponse) => void>();

  constructor(private readonly socket: WebSocket) {
    socket.addEventListener('message', (event) => {
      const parsed: unknown = JSON.parse(String(event.data));
      if (typeof parsed !== 'object' || parsed === null || !('id' in parsed)) return;
      const id = parsed.id;
      if (typeof id !== 'number') return;
      const resolve = this.pending.get(id);
      if (!resolve) return;
      this.pending.delete(id);
      resolve(parsed);
    });
  }

  async send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.nextId;
    this.nextId += 1;
    const promise = new Promise<CdpResponse>((resolve) => this.pending.set(id, resolve));
    this.socket.send(JSON.stringify({ id, method, params }));
    const response = await promise;
    if (response.error) throw new Error(response.error.message ?? method);
    return response.result ?? {};
  }
}

async function connect(wsUrl: string): Promise<CdpClient> {
  const socket = new WebSocket(wsUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error('WebSocket connection failed')), { once: true });
  });
  return new CdpClient(socket);
}

async function capture(cdp: CdpClient, baseUrl: string, testCase: ScreenshotCase): Promise<string> {
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: testCase.viewport.width,
    height: testCase.viewport.height,
    deviceScaleFactor: 1,
    mobile: testCase.viewport.width < 600,
  });

  if (testCase.pin) {
    await cdp.send('Network.clearBrowserCookies');
  } else {
    await cdp.send('Network.clearBrowserCookies');
  }

  await cdp.send('Page.navigate', { url: `${baseUrl}${testCase.path}` });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  if (testCase.pin) {
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('input[name="pin"]');
          if (!input || !(input instanceof HTMLInputElement) || !input.form) {
            throw new Error('visible PIN form not found');
          }
          input.value = ${JSON.stringify(testCase.pin)};
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.form.requestSubmit();
        })()
      `,
      awaitPromise: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 1800));
  }
  const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (typeof result !== 'object' || result === null || !('data' in result) || typeof result.data !== 'string') {
    throw new Error('screenshot capture failed');
  }

  const file = join(EVIDENCE_DIR, `${testCase.name}-${testCase.viewport.name}.png`);
  await writeFile(file, Buffer.from(result.data, 'base64'));
  return file;
}

async function main(): Promise<void> {
  const baseUrl = argValue('--base-url', 'http://127.0.0.1:3105');
  const port = Number(argValue('--debug-port', '9335'));
  const binary = await chromePath();
  const userDataDir = await mkdtemp(join(tmpdir(), 'summer-5week-chrome-'));
  await mkdir(EVIDENCE_DIR, { recursive: true });

  const chrome = launchChrome(binary, userDataDir, port);
  try {
    await waitForEndpoint(port);
    const wsUrl = await createPage(port);
    const cdp = await connect(wsUrl);
    const lines: string[] = [];
    for (const testCase of CASES) {
      const file = await capture(cdp, baseUrl, testCase);
      lines.push(`${testCase.name}: ${file}`);
    }
    const manifest = join(EVIDENCE_DIR, 'screenshots.txt');
    await writeFile(manifest, `${lines.join('\n')}\n`, 'utf8');
    console.log(lines.join('\n'));
    console.log(`manifest: ${manifest}`);
  } finally {
    chrome.kill();
    await new Promise<void>((resolve) => {
      chrome.once('exit', () => resolve());
      setTimeout(resolve, 1000);
    });
    await rm(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
