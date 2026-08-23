#!/usr/bin/env npx tsx

import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseViewports, startBrowser, stopBrowser } from '../summer-5week-demo-cdp';
import { argValue } from './browser-qa-core';
import { createLessonPageBundle, startLessonQaServer, type LessonQaServer } from './lesson-page-harness';
import { runLessonViewport } from './lesson-page-scenarios';

const EVIDENCE_DIR = '.omo/evidence/page-context-ai-tutor-widget/real-lesson-page-qa';
const DEFAULT_VIEWPORTS = '390x844,1280x900';

async function main(): Promise<void> {
  const debugPort = Number(argValue('--debug-port', '9371'));
  const viewports = parseViewports(argValue('--viewports', DEFAULT_VIEWPORTS));
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const workDir = await mkdtemp(join(tmpdir(), 'mathgo-lesson-page-qa-'));
  const lines: string[] = [];
  let server: LessonQaServer | null = null;
  const harness = await startBrowser(debugPort);
  try {
    await createLessonPageBundle(workDir);
    server = await startLessonQaServer(workDir);
    for (const viewport of viewports) lines.push(...await runLessonViewport(harness.cdp, server, viewport));
    lines.push(`screenshots: ${viewports.map((viewport) => `lesson-initial-${viewport.name}.png lesson-widget-open-${viewport.name}.png keyboard-focus-${viewport.name}.png`).join(' ')}`);
    await writeFile(join(EVIDENCE_DIR, 'summary.txt'), `${lines.join('\n')}\n`, 'utf8');
    await writeFile(join(EVIDENCE_DIR, 'summary.json'), `${JSON.stringify({ lines }, null, 2)}\n`, 'utf8');
    console.log(lines.join('\n'));
  } finally {
    harness.cdp.close();
    await stopBrowser(harness);
    if (server !== null) await server.close();
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
