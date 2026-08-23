#!/usr/bin/env npx tsx

import { argValue } from './browser-qa-core';
import { runWidgetBrowserFixtureQa } from './widget-browser-qa';

const DEFAULT_VIEWPORTS = '390x844,768x1024,1280x900';

async function main(): Promise<void> {
  await runWidgetBrowserFixtureQa({
    viewports: argValue('--viewports', DEFAULT_VIEWPORTS),
    route: '/lesson/synthetic-ds2-assigned-only',
    auth: 'synthetic-released',
    graph: 'off',
    evidenceDir: argValue('--evidence', '.omo/evidence/midterm-session2-web-ai-tutor/task-12/ds2-browser'),
    fixtureName: 'ds2-assigned-only',
    debugPort: Number(argValue('--debug-port', '9369')),
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
