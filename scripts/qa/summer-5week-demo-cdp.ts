import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { access, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { openQaWebSocket, type QaWebSocket } from './node-websocket';

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome',
  'chromium',
] as const;

type CdpResponse = {
  readonly id?: number;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
};

export type Viewport = {
  readonly name: string;
  readonly width: number;
  readonly height: number;
};

export type BrowserHarness = {
  readonly cdp: CdpClient;
  readonly chrome: ChildProcessWithoutNullStreams;
  readonly userDataDir: string;
};

export function parseViewports(value: string): readonly Viewport[] {
  return value.split(',').map((item) => {
    const [widthText, heightText] = item.split('x');
    const width = Number(widthText);
    const height = Number(heightText);
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      throw new Error(`invalid viewport: ${item}`);
    }
    return { name: item, width, height };
  });
}

export function assertOk(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function chromePath(): Promise<string> {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate.startsWith('/')) {
      try {
        await access(candidate);
        return candidate;
      } catch {
        // This candidate is optional; try the next known browser path.
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
      // Chrome may not have opened DevTools yet; keep polling until timeout.
      await delay(100);
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

export class CdpClient {
  private nextId = 1;
  private readonly pending = new Map<number, (value: CdpResponse) => void>();

  constructor(private readonly socket: QaWebSocket) {
    socket.addEventListener('message', (event) => {
      const response = cdpResponseFromJson(String(event.data));
      const id = response.id;
      if (id === undefined) return;
      const resolve = this.pending.get(id);
      if (!resolve) return;
      this.pending.delete(id);
      resolve(response);
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

  close(): void {
    this.socket.close();
  }
}

function cdpResponseFromJson(data: string): CdpResponse {
  const parsed: unknown = JSON.parse(data);
  if (typeof parsed !== 'object' || parsed === null || !('id' in parsed)) return {};
  const id = parsed.id;
  if (typeof id !== 'number') return {};
  const result = 'result' in parsed ? parsed.result : undefined;
  const rawError = 'error' in parsed ? parsed.error : undefined;
  const error =
    typeof rawError === 'object' && rawError !== null && 'message' in rawError && typeof rawError.message === 'string'
      ? { message: rawError.message }
      : undefined;
  return { id, result, error };
}

async function connect(wsUrl: string): Promise<CdpClient> {
  const socket = openQaWebSocket(wsUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error('WebSocket connection failed')), { once: true });
  });
  return new CdpClient(socket);
}

export async function startBrowser(debugPort: number): Promise<BrowserHarness> {
  const binary = await chromePath();
  const userDataDir = await mkdtemp(join(tmpdir(), 'summer-5week-demo-chrome-'));
  const chrome = launchChrome(binary, userDataDir, debugPort);
  await waitForEndpoint(debugPort);
  const cdp = await connect(await createPage(debugPort));
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Runtime.enable');
  return { cdp, chrome, userDataDir };
}

export async function newBrowserPage(debugPort: number): Promise<CdpClient> {
  const cdp = await connect(await createPage(debugPort));
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Runtime.enable');
  return cdp;
}

export async function stopBrowser(harness: BrowserHarness): Promise<void> {
  harness.chrome.kill();
  await new Promise<void>((resolve) => {
    harness.chrome.once('exit', () => resolve());
    setTimeout(resolve, 1000);
  });
  await rm(harness.userDataDir, { recursive: true, force: true });
}

export async function pageText(cdp: CdpClient): Promise<string> {
  const result = await cdp.send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true });
  if (typeof result !== 'object' || result === null || !('result' in result)) return '';
  const inner = result.result;
  if (typeof inner !== 'object' || inner === null || !('value' in inner)) return '';
  return typeof inner.value === 'string' ? inner.value : '';
}

export async function storageState(cdp: CdpClient): Promise<{ readonly localKeys: readonly string[]; readonly sessionKeys: readonly string[] }> {
  const expression = '({localKeys: Object.keys(localStorage), sessionKeys: Object.keys(sessionStorage)})';
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
  if (typeof result !== 'object' || result === null || !('result' in result)) throw new Error('storage state missing');
  const inner = result.result;
  if (typeof inner !== 'object' || inner === null || !('value' in inner)) throw new Error('storage value missing');
  const value = inner.value;
  if (typeof value !== 'object' || value === null || !('localKeys' in value) || !('sessionKeys' in value)) throw new Error('storage shape missing');
  const localKeys = Array.isArray(value.localKeys) ? value.localKeys.filter((key): key is string => typeof key === 'string') : [];
  const sessionKeys = Array.isArray(value.sessionKeys) ? value.sessionKeys.filter((key): key is string => typeof key === 'string') : [];
  return { localKeys, sessionKeys };
}

export async function cookieNames(cdp: CdpClient): Promise<readonly string[]> {
  const result = await cdp.send('Network.getAllCookies');
  if (typeof result !== 'object' || result === null || !('cookies' in result) || !Array.isArray(result.cookies)) return [];
  return result.cookies
    .map((cookie) => {
      if (typeof cookie !== 'object' || cookie === null || !('name' in cookie)) return null;
      return typeof cookie.name === 'string' ? cookie.name : null;
    })
    .filter((name): name is string => name !== null);
}

export async function screenshot(cdp: CdpClient, file: string): Promise<void> {
  const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (typeof result !== 'object' || result === null || !('data' in result) || typeof result.data !== 'string') {
    throw new Error('screenshot capture failed');
  }
  await writeFile(file, Buffer.from(result.data, 'base64'));
}

export async function setViewport(cdp: CdpClient, viewport: Viewport): Promise<void> {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 600,
  });
}
