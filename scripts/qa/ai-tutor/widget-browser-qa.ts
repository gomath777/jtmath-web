#!/usr/bin/env npx tsx

import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseViewports, startBrowser, stopBrowser } from '../summer-5week-demo-cdp';
import { argValue } from './browser-qa-core';
import { createWidgetBundle, startWidgetQaServer, type WidgetQaServer } from './widget-browser-server';
import { browserFixture, browserPdfHrefBaseline, type WidgetBrowserFixtureName } from './widget-browser-fixtures';
import { runWidgetViewport } from './widget-browser-scenarios';

const DEFAULT_VIEWPORTS = '390x844,768x1024,1280x900';
const MIDTERM_SESSION2_ROUTE = '/lesson/gs2-midterm-2026-w1s2-plane-line';
const FULL_ROUTES = [
  'gs2-midterm-2026-w1s2-plane-line',
  'mj1-midterm-2026-w1s2-limit',
  'gh-midterm-2026-w1s2-conic',
  'synthetic-ds2-a',
  'synthetic-ds2-b',
] as const;
const ROUTE_FIXTURES = new Map<string, WidgetBrowserFixtureName>([
  ['gs2-midterm-2026-w1s2-plane-line', 'gs2-midterm'],
  ['mj1-midterm-2026-w1s2-limit', 'mj1-midterm'],
  ['gh-midterm-2026-w1s2-conic', 'gh-midterm'],
  ['synthetic-ds2-a', 'ds2-assigned-only'],
  ['synthetic-ds2-b', 'ds2-assigned-alt'],
]);
const REQUIRED_FLAGS = ['--fixture', '--viewports', '--auth', '--graph'] as const;
type QaFixture = 'midterm-session2-ui' | 'midterm-session2-full';
type BrowserQaTarget = Readonly<{ route: string; fixtureName: WidgetBrowserFixtureName }>;

export type BrowserQaOptions = {
  readonly viewports: string;
  readonly requiredViewports: readonly string[];
  readonly fixture: QaFixture;
  readonly targets: readonly BrowserQaTarget[];
  readonly auth: 'synthetic-released';
  readonly graph: 'off';
  readonly zoom: 200;
  readonly evidenceDir: string;
};

export type WidgetBrowserRunOptions = Readonly<{
  readonly viewports: string;
  readonly route: string;
  readonly auth: 'synthetic-released';
  readonly graph: 'off';
  readonly evidenceDir: string;
  readonly fixtureName: WidgetBrowserFixtureName;
  readonly debugPort: number;
}>;

export function parseBrowserQaOptions(argumentsList: readonly string[]): BrowserQaOptions {
  const read = (name: string): string | null => {
    const index = argumentsList.indexOf(name);
    const next = index >= 0 ? argumentsList[index + 1] : undefined;
    if (next !== undefined && !next.startsWith('--')) return next;
    const prefix = `${name}=`;
    return argumentsList.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
  };

  const readRequired = (name: (typeof REQUIRED_FLAGS)[number]): string => {
    const value = read(name);
    if (value === null || value.length === 0) {
      throw new Error(`integrated QA requires explicit ${name}`);
    }
    return value;
  };

  const viewports = readRequired('--viewports');
  const route = read('--route');
  const routes = read('--routes');
  const auth = readRequired('--auth');
  const graph = readRequired('--graph');
  const fixture = readRequired('--fixture');
  if (fixture !== 'midterm-session2-ui' && fixture !== 'midterm-session2-full') throw new Error('integrated QA requires --fixture midterm-session2-ui or midterm-session2-full');
  const targets = parseTargets(fixture, route, routes);
  if (auth !== 'synthetic-released') throw new Error('integrated QA requires --auth synthetic-released');
  if (graph !== 'off') throw new Error('integrated QA requires --graph off');
  if (read('--zoom') !== '200') throw new Error('integrated QA requires --zoom 200');
  const requiredViewports = viewports.split(',').map((value) => value.trim()).filter(Boolean);
  if (requiredViewports.join(',') !== DEFAULT_VIEWPORTS) {
    throw new Error(`integrated QA requires explicit --viewports ${DEFAULT_VIEWPORTS}`);
  }
  return {
    viewports,
    requiredViewports,
    fixture,
    targets,
    auth,
    graph,
    zoom: 200,
    evidenceDir:
      read('--evidence') ?? read('--evidence-dir') ?? '.omo/evidence/midterm-session2-web-ai-tutor/task-12/browser',
  };
}

function parseTargets(fixture: string, route: string | null, routes: string | null): readonly BrowserQaTarget[] {
  if (fixture === 'midterm-session2-ui') {
    if (route !== MIDTERM_SESSION2_ROUTE || routes !== null) throw new Error(`integrated QA requires exact route ${MIDTERM_SESSION2_ROUTE}`);
    return [{ route: MIDTERM_SESSION2_ROUTE, fixtureName: 'gs2-midterm' }];
  }
  if (routes === null || route !== null) throw new Error('full integrated QA requires --routes and no --route');
  const values = routes.split(',').map((value) => value.trim()).filter(Boolean);
  if (values.join(',') !== FULL_ROUTES.join(',')) throw new Error(`full integrated QA requires exact --routes ${FULL_ROUTES.join(',')}`);
  return values.map((value) => ({ route: `/lesson/${value}`, fixtureName: ROUTE_FIXTURES.get(value) ?? 'gs2-midterm' }));
}

export async function runWidgetBrowserFixtureQa(options: WidgetBrowserRunOptions): Promise<void> {
  const viewports = parseViewports(options.viewports);
  const requiredViewports = DEFAULT_VIEWPORTS.split(',');
  if (viewports.length !== 3 || !requiredViewports.every((name) => viewports.some((viewport) => viewport.name === name))) {
    throw new Error('integrated QA requires all three viewports: 390x844,768x1024,1280x900');
  }
  await mkdir(options.evidenceDir, { recursive: true });
  const workDir = await mkdtemp(join(tmpdir(), 'mathgo-ai-tutor-widget-qa-'));
  const lines: string[] = [];
  let server: WidgetQaServer | null = null;
  const harness = await startBrowser(options.debugPort);
  try {
    await harness.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.__qaConsoleErrors = 0; const qaError = console.error.bind(console); console.error = (...args) => { window.__qaConsoleErrors += 1; qaError(...args); };',
    });
    await createWidgetBundle(workDir, options.fixtureName);
    server = await startWidgetQaServer(workDir, { route: options.route, auth: options.auth, fixtureName: options.fixtureName });
    server.setGraphMode('off');
    const receipts = [];
    for (const viewport of viewports) {
      const receipt = await runWidgetViewport(harness.cdp, server, viewport, {
        evidenceDir: options.evidenceDir,
        graphExpected: false,
        fixtureName: options.fixtureName,
        route: options.route,
      });
      receipts.push(receipt);
      lines.push(...receipt.lines);
    }
    const pdfHrefBaselineMatched = receipts.every((receipt) => receipt.pdfHrefBaselineMatched);
    const materialCount = browserFixture(options.fixtureName).materials.length;
    lines.push(`screenshots: ${options.evidenceDir}`);
    lines.push(`provider-calls: ${server.calls().length}; aborts: ${server.aborts()}; auth: synthetic-released; route: ${options.route}`);
    lines.push(`UI_QA_OK fixture=${options.fixtureName} materialLabels=${materialCount} sourceOrder=true imeClear=true keyboard=true mathml=true graphNodes=0 graphRequests=0 horizontalOverflow=0 pdfHrefBaseline=${pdfHrefBaselineMatched}`);
    await writeFile(join(options.evidenceDir, 'summary.txt'), `${lines.join('\n')}\n`, 'utf8');
    const pdfHrefBaseline = browserPdfHrefBaseline(options.fixtureName);
    await writeFile(join(options.evidenceDir, 'summary.json'), `${JSON.stringify({ lines, calls: server.calls(), aborts: server.aborts(), route: options.route, auth: options.auth, graph: options.graph, fixture: options.fixtureName, pdfHrefBaseline: { matched: pdfHrefBaselineMatched, openCount: pdfHrefBaseline.open.length, downloadCount: pdfHrefBaseline.download.length } }, null, 2)}\n`, 'utf8');
    console.log(lines.join('\n'));
  } finally {
    harness.cdp.close();
    await stopBrowser(harness);
    if (server !== null) await server.close();
    await rm(workDir, { recursive: true, force: true });
  }
}

async function runWidgetBrowserMatrixQa(options: BrowserQaOptions): Promise<void> {
  await mkdir(options.evidenceDir, { recursive: true });
  const summaries: Array<Readonly<{ route: string; fixtureName: WidgetBrowserFixtureName; evidenceDir: string }>> = [];
  for (const [index, target] of options.targets.entries()) {
    const targetEvidence = join(options.evidenceDir, target.route.replace(/^\/lesson\//u, ''));
    await runWidgetBrowserFixtureQa({
      viewports: options.viewports,
      route: target.route,
      auth: options.auth,
      graph: options.graph,
      evidenceDir: targetEvidence,
      fixtureName: target.fixtureName,
      debugPort: Number(argValue('--debug-port', '9368')) + index,
    });
    summaries.push({ ...target, evidenceDir: targetEvidence });
  }
  const receipt = { status: 'pass', routes: summaries.length, viewports: options.requiredViewports, summaries };
  await writeFile(join(options.evidenceDir, 'matrix-summary.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(`UI_QA_MATRIX_OK routes=${summaries.length} viewports=${options.requiredViewports.length} evidence=${options.evidenceDir}`);
}

async function main(): Promise<void> {
  const options = parseBrowserQaOptions(process.argv.slice(2));
  await runWidgetBrowserMatrixQa(options);
}

const invokedScript = process.argv[1] ?? '';
if (invokedScript.endsWith('/widget-browser-qa.ts') || invokedScript.endsWith('/widget-browser-qa.js')) {
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
}
