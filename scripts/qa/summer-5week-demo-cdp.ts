import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openQaWebSocket, type QaWebSocket } from './node-websocket';

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome',
  'chromium',
] as const;

type CdpResponse = Readonly<{ id?: number; result?: unknown; error?: Readonly<{ message?: string }> }>;
type CdpEvent = Readonly<{ method: string; params?: unknown }>;
export type Viewport = Readonly<{ name: string; width: number; height: number }>;
export type BrowserHarness = Readonly<{ cdp: CdpClient; chrome: ChildProcessWithoutNullStreams; userDataDir: string }>;

export function parseViewports(value: string): readonly Viewport[] {
  return value.split(',').map((item) => {
    const [widthText, heightText] = item.split('x');
    const width = Number(widthText);
    const height = Number(heightText);
    if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error(`invalid viewport: ${item}`);
    return { name: item, width, height };
  });
}

export function assertOk(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function chromePath(): Promise<string> {
  for (const candidate of CHROME_CANDIDATES) {
    if (!candidate.startsWith('/')) return candidate;
    try {
      await access(candidate);
      return candidate;
    } catch (error) {
      if (error instanceof Error) continue;
      throw error;
    }
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
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(endpoint)).ok) return;
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
    await delay(100);
  }
  throw new Error('Chrome DevTools endpoint did not start');
}

async function createPage(port: number): Promise<string> {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const body: unknown = await response.json();
  if (typeof body === 'object' && body !== null && 'webSocketDebuggerUrl' in body && typeof body.webSocketDebuggerUrl === 'string') {
    return body.webSocketDebuggerUrl;
  }
  throw new Error('Could not create Chrome page');
}

export class CdpClient {
  private nextId = 1;
  private readonly pending = new Map<number, (response: CdpResponse) => void>();
  private readonly eventListeners = new Map<string, Set<(params: unknown) => void>>();

  constructor(private readonly socket: QaWebSocket) {
    socket.addEventListener('message', (event) => {
      const message = cdpMessageFromJson(String(event.data));
      if ('method' in message) {
        this.eventListeners.get(message.method)?.forEach((listener) => listener(message.params));
        return;
      }
      if (message.id === undefined) return;
      const resolve = this.pending.get(message.id);
      if (resolve !== undefined) {
        this.pending.delete(message.id);
        resolve(message);
      }
    });
  }

  async send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.nextId++;
    const response = await new Promise<CdpResponse>((resolve) => {
      this.pending.set(id, resolve);
      this.socket.send(JSON.stringify({ id, method, params }));
    });
    if (response.error !== undefined) throw new Error(response.error.message ?? method);
    return response.result ?? {};
  }

  close(): void {
    this.socket.close();
  }

  waitForEvent(method: string, timeoutMilliseconds: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const listener = (params: unknown): void => {
        clearTimeout(timeout);
        this.eventListeners.get(method)?.delete(listener);
        resolve(params);
      };
      const timeout = setTimeout(() => {
        this.eventListeners.get(method)?.delete(listener);
        reject(new Error(`CDP event timed out: ${method}`));
      }, timeoutMilliseconds);
      const listeners = this.eventListeners.get(method) ?? new Set<(params: unknown) => void>();
      listeners.add(listener);
      this.eventListeners.set(method, listeners);
    });
  }
}

function cdpMessageFromJson(data: string): CdpResponse | CdpEvent {
  const parsed: unknown = JSON.parse(data);
  if (typeof parsed !== 'object' || parsed === null) return {};
  if ('method' in parsed && typeof parsed.method === 'string') return { method: parsed.method, params: 'params' in parsed ? parsed.params : undefined };
  if (!('id' in parsed) || typeof parsed.id !== 'number') return {};
  const rawError = 'error' in parsed ? parsed.error : undefined;
  return {
    id: parsed.id,
    result: 'result' in parsed ? parsed.result : undefined,
    error: typeof rawError === 'object' && rawError !== null && 'message' in rawError && typeof rawError.message === 'string' ? { message: rawError.message } : undefined,
  };
}

async function connect(wsUrl: string): Promise<CdpClient> {
  const socket = openQaWebSocket(wsUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error('WebSocket connection failed')), { once: true });
  });
  return new CdpClient(socket);
}

async function readyPage(port: number): Promise<CdpClient> {
  const cdp = await connect(await createPage(port));
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Runtime.enable');
  return cdp;
}

export async function startBrowser(debugPort: number): Promise<BrowserHarness> {
  const userDataDir = await mkdtemp(join(tmpdir(), 'summer-5week-demo-chrome-'));
  const chrome = launchChrome(await chromePath(), userDataDir, debugPort);
  try {
    await waitForEndpoint(debugPort);
    return { cdp: await readyPage(debugPort), chrome, userDataDir };
  } catch (error) {
    chrome.kill();
    await rm(userDataDir, { recursive: true, force: true });
    throw error;
  }
}

export async function newBrowserPage(debugPort: number): Promise<CdpClient> {
  return readyPage(debugPort);
}

export async function stopBrowser(harness: BrowserHarness): Promise<void> {
  harness.chrome.kill();
  await new Promise<void>((resolve) => {
    harness.chrome.once('exit', resolve);
    setTimeout(resolve, 1_000);
  });
  await rm(harness.userDataDir, { recursive: true, force: true });
}

async function runtimeValue(cdp: CdpClient, expression: string): Promise<unknown> {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
  if (typeof result !== 'object' || result === null || !('result' in result)) return undefined;
  const runtimeResult = result.result;
  return typeof runtimeResult === 'object' && runtimeResult !== null && 'value' in runtimeResult ? runtimeResult.value : undefined;
}

export async function pageText(cdp: CdpClient): Promise<string> {
  const value = await runtimeValue(cdp, 'document.body.innerText');
  return typeof value === 'string' ? value : '';
}

export async function storageState(cdp: CdpClient): Promise<Readonly<{ localKeys: readonly string[]; sessionKeys: readonly string[] }>> {
  const value = await runtimeValue(cdp, '({localKeys: Object.keys(localStorage), sessionKeys: Object.keys(sessionStorage)})');
  if (typeof value !== 'object' || value === null || !('localKeys' in value) || !('sessionKeys' in value)) throw new Error('storage shape missing');
  const keys = (key: 'localKeys' | 'sessionKeys'): readonly string[] => Array.isArray(value[key]) ? value[key].filter((item): item is string => typeof item === 'string') : [];
  return { localKeys: keys('localKeys'), sessionKeys: keys('sessionKeys') };
}

export async function cookieNames(cdp: CdpClient): Promise<readonly string[]> {
  const result = await cdp.send('Network.getAllCookies');
  if (typeof result !== 'object' || result === null || !('cookies' in result) || !Array.isArray(result.cookies)) return [];
  return result.cookies.flatMap((cookie) => typeof cookie === 'object' && cookie !== null && 'name' in cookie && typeof cookie.name === 'string' ? [cookie.name] : []);
}

export async function screenshot(cdp: CdpClient, file: string): Promise<void> {
  const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (typeof result !== 'object' || result === null || !('data' in result) || typeof result.data !== 'string') throw new Error('screenshot capture failed');
  await writeFile(file, Buffer.from(result.data, 'base64'));
}

export async function setViewport(cdp: CdpClient, viewport: Viewport): Promise<void> {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 600 });
}
