import type { IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { build, type Plugin } from 'esbuild';
import { delay, pageText, type CdpClient } from '../summer-5week-demo-cdp';

export type RuntimeObject = { readonly [key: string]: RuntimeValue };
export type RuntimeValue = string | number | boolean | null | RuntimeObject | readonly RuntimeValue[];

export function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  const nextValue = index >= 0 ? process.argv[index + 1] : undefined;
  if (nextValue !== undefined) return nextValue;
  const prefix = `${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  return inline?.slice(prefix.length) ?? fallback;
}

export async function createBrowserQaBundle(params: {
  readonly workDir: string;
  readonly entryName: string;
  readonly entrySource: string;
  readonly plugins?: readonly Plugin[];
}): Promise<void> {
  const entry = join(params.workDir, params.entryName);
  await import('fs/promises').then(({ writeFile }) => writeFile(entry, params.entrySource, 'utf8'));
  await build({
    entryPoints: [entry],
    bundle: true,
    outfile: join(params.workDir, 'bundle.js'),
    absWorkingDir: process.cwd(),
    nodePaths: [join(process.cwd(), 'node_modules')],
    platform: 'browser',
    format: 'iife',
    jsx: 'automatic',
    logLevel: 'silent',
    plugins: [...(params.plugins ?? [])],
  });
}

export function aliasSrcPlugin(): Plugin {
  return {
    name: 'alias-src',
    setup(buildApi) {
      buildApi.onResolve({ filter: /^@\// }, async (args) => ({
        path: await resolveSourcePath(join(process.cwd(), 'src', args.path.slice(2))),
      }));
    },
  };
}

async function resolveSourcePath(basePath: string): Promise<string> {
  const { access } = await import('fs/promises');
  const candidates = [basePath, `${basePath}.ts`, `${basePath}.tsx`, `${basePath}.js`, `${basePath}.jsx`, join(basePath, 'index.ts'), join(basePath, 'index.tsx')];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return basePath;
}

export async function sendBundle(response: ServerResponse, workDir: string): Promise<void> {
  response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
  response.end(await readFile(join(workDir, 'bundle.js')));
}

export function sendHtml(response: ServerResponse, title: string, css: string, metadata: { readonly route?: string; readonly auth?: string } = {}): void {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  const routeMeta = metadata.route === undefined ? '' : `<meta name="qa-route" content="${metadata.route}" />`;
  const authMeta = metadata.auth === undefined ? '' : `<meta name="qa-auth" content="${metadata.auth}" />`;
  response.end(`<!doctype html><html lang="ko"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />${routeMeta}${authMeta}<title>${title}</title><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
}

export function sendJson(response: ServerResponse, body: RuntimeObject, status = 200): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

export async function readRequestJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function drain(request: IncomingMessage): Promise<void> {
  for await (const _chunk of request) {
  }
}

export async function evaluate(cdp: CdpClient, expression: string): Promise<void> {
  await cdp.send('Runtime.evaluate', { expression, awaitPromise: true });
}

export async function evaluateValue(cdp: CdpClient, expression: string): Promise<unknown> {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (!isRuntimeObject(result) || !('result' in result)) return undefined;
  const inner = result['result'];
  if (!isRuntimeObject(inner) || !('value' in inner)) return undefined;
  return inner['value'];
}

export async function evaluateBoolean(cdp: CdpClient, expression: string): Promise<boolean> {
  return (await evaluateValue(cdp, expression)) === true;
}

export async function evaluateObject(cdp: CdpClient, expression: string): Promise<RuntimeObject> {
  const value = await evaluateValue(cdp, expression);
  if (isRuntimeObject(value)) return value;
  throw new Error('Runtime object result missing');
}

export async function waitForText(cdp: CdpClient, expected: string, label: string): Promise<string> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const text = await pageText(cdp);
    if (text.includes(expected)) return text;
    await delay(100);
  }
  throw new Error(`${label}: timed out waiting for ${expected}`);
}

export async function waitForRuntimePredicate(cdp: CdpClient, expression: string, label: string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if ((await evaluateValue(cdp, expression)) === true) return;
    await delay(100);
  }
  throw new Error(`${label}: timed out waiting for ${expression}`);
}

export async function clickButtonText(cdp: CdpClient, text: string): Promise<void> {
  await evaluate(cdp, `
    (() => {
      const button = Array.from(document.querySelectorAll('button')).find((candidate) => candidate.textContent?.includes(${JSON.stringify(text)}));
      if (!(button instanceof HTMLButtonElement)) throw new Error('button not found: ${text}');
      button.click();
    })()
  `);
}

export function isRuntimeObject(value: unknown): value is RuntimeObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUnknownRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
