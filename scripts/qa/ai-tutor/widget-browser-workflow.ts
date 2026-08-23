import { mkdir } from 'fs/promises';
import { join } from 'path';
import {
  assertOk,
  delay,
  screenshot,
  setViewport,
  storageState,
  type CdpClient,
  type Viewport,
} from '../summer-5week-demo-cdp';
import { clickButtonText, evaluate, evaluateObject, waitForRuntimePredicate, waitForText } from './browser-qa-core';
import { browserFixture, browserFixtureMaterialLabel, browserPdfHrefBaseline, type WidgetBrowserFixtureName } from './widget-browser-fixtures';
import { sendTutorMessage, waitForDisabledSend, waitForSelector } from './widget-browser-actions';
import {
  assertExactRouteAndSyntheticAuth,
  assertExpandedAccessibility,
  assertMalformedLiteral,
} from './widget-browser-accessibility';
import {
  assertGraphEvidence,
  assertZoomTypography,
} from './widget-browser-presentation';
import { assertWorkbookTypography } from './widget-browser-math-presentation';
import { assertPdfResourceActions } from './widget-browser-pdf-actions';
import type { WidgetQaServer } from './widget-browser-server';

export type WidgetQaScenarioOptions = {
  readonly evidenceDir: string;
  readonly graphExpected: boolean;
  readonly fixtureName: WidgetBrowserFixtureName;
  readonly route: string;
};

export type WidgetViewportReceipt = Readonly<{
  readonly lines: readonly string[];
  readonly pdfHrefBaselineMatched: boolean;
}>;

export async function runWidgetViewport(
  cdp: CdpClient,
  server: WidgetQaServer,
  viewport: Viewport,
  options: WidgetQaScenarioOptions,
): Promise<WidgetViewportReceipt> {
  await mkdir(options.evidenceDir, { recursive: true });
  const lines: string[] = [];
  await setViewport(cdp, viewport);
  await cdp.send('Page.navigate', { url: server.baseUrl });
  await waitForText(cdp, 'AI 튜터에게 힌트 묻기', `${viewport.name} launcher`);
  await assertExactRouteAndSyntheticAuth(cdp, viewport, lines, options.route);
  const pdfHrefBaselineMatched = await assertPdfHrefBaseline(cdp, viewport, lines, options.fixtureName);
  await assertPdfResourceActions({
    cdp,
    viewport,
    lines,
    evidenceDir: options.evidenceDir,
    materialCount: browserFixture(options.fixtureName).materials.length,
  });
  await clickButtonText(cdp, '열기');
  await waitForText(cdp, '질문할 학습지', `${viewport.name} expanded`);
  await assertExpandedAccessibility(cdp, viewport, lines);
  await assertMaterialSelectorAndIme(cdp, server, viewport, lines, options.fixtureName);
  await runHappyPath(cdp, server, viewport, lines, options);
  await runErrorAndLockPath(cdp, server, viewport, lines, options.evidenceDir, options.fixtureName);
  await runAbortAndStoragePath(cdp, server, viewport, lines);
  assertOk(server.calls().every((call) => !call.hasClientRecentTurns && !call.hasClientResolvedTarget), `${viewport.name}: client sent non-authoritative tutor continuity`);
  lines.push(`${viewport.name}: client request contained only message and selected material key`);
  return { lines, pdfHrefBaselineMatched };
}

async function assertMaterialSelectorAndIme(
  cdp: CdpClient,
  server: WidgetQaServer,
  viewport: Viewport,
  lines: string[],
  fixtureName: WidgetBrowserFixtureName,
): Promise<void> {
  const selectorFacts = await evaluateObject(
    cdp,
    `(() => ({
      labels: Array.from(document.querySelectorAll('fieldset button')).map((button) => button.textContent?.trim() ?? ''),
      target: document.querySelector('fieldset legend')?.textContent?.trim() ?? '',
    }))()`,
  );
  const fixture = browserFixture(fixtureName);
  const expected = fixture.materials.map(browserFixtureMaterialLabel);
  assertOk(JSON.stringify(selectorFacts['labels']) === JSON.stringify(expected), `${viewport.name}: material labels lost source order`);
  assertOk(selectorFacts['target'] === '질문할 학습지', `${viewport.name}: material target label missing`);

  const callsBeforeComposition = server.calls().length;
  await evaluate(cdp, `(() => {
    const input = document.getElementById('ai-tutor-message');
    if (!(input instanceof HTMLTextAreaElement)) throw new Error('tutor input missing');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (!setter) throw new Error('textarea setter missing');
    setter.call(input, '가');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true }));
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '가' }));
  })()`);
  const compositionFacts = await evaluateObject(cdp, `(() => ({ value: (document.getElementById('ai-tutor-message') instanceof HTMLTextAreaElement ? document.getElementById('ai-tutor-message').value : '') }))()`);
  assertOk(compositionFacts['value'] === '가', `${viewport.name}: Korean IME Enter cleared or duplicated composition text`);
  assertOk(server.calls().length === callsBeforeComposition, `${viewport.name}: Korean IME Enter submitted a partial composition`);
  await evaluate(cdp, `(() => { const input = document.getElementById('ai-tutor-message'); if (input instanceof HTMLTextAreaElement) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); } })()`);
  lines.push(`${viewport.name}: ${fixture.materials.length} ${fixture.name} source-ordered material labels and IME-safe Enter verified`);
}

async function assertPdfHrefBaseline(cdp: CdpClient, viewport: Viewport, lines: string[], fixtureName: WidgetBrowserFixtureName): Promise<boolean> {
  const facts = await evaluateObject(
    cdp,
    `(() => {
      const fixture = document.querySelector('[data-qa-pdf-fixture]');
      const anchors = fixture ? Array.from(fixture.querySelectorAll('a[href]')) : [];
      return {
        open: anchors
          .filter((anchor) => anchor.getAttribute('aria-label')?.endsWith('브라우저에서 열기'))
          .map((anchor) => anchor.getAttribute('href') ?? ''),
        download: anchors
          .filter((anchor) => anchor.getAttribute('aria-label')?.endsWith('다운로드'))
          .map((anchor) => anchor.getAttribute('href') ?? ''),
      };
    })()`,
  );
  const baseline = browserPdfHrefBaseline(fixtureName);
  assertOk(JSON.stringify(facts['open']) === JSON.stringify(baseline.open), `${viewport.name}: PDF browser-open href baseline drifted`);
  assertOk(JSON.stringify(facts['download']) === JSON.stringify(baseline.download), `${viewport.name}: PDF download href baseline drifted`);
  lines.push(`${viewport.name}: actual DOM PDF open/download href arrays matched the ${baseline.open.length}-item fixture baseline`);
  return true;
}

async function runHappyPath(
  cdp: CdpClient,
  server: WidgetQaServer,
  viewport: Viewport,
  lines: string[],
  options: WidgetQaScenarioOptions,
): Promise<void> {
  await clickButtonText(cdp, firstFixtureMaterialLabel(options.fixtureName));
  await sendTutorMessage(cdp, '2번 힌트 줘');
  await waitForSelector(cdp, '.katex', `${viewport.name} rendered fraction`);
  await waitForText(cdp, '핵심 힌트:', `${viewport.name} hint response`);
  await assertWorkbookTypography(cdp, viewport, lines);
  await assertZoomTypography(cdp, viewport, lines, options.evidenceDir);
  await screenshot(cdp, join(options.evidenceDir, `happy-${viewport.name}.png`));
  lines.push(`${viewport.name}: workbook hint rendered KaTeX fraction with long display math`);

  const graphCallsBefore = server.calls().length;
  await sendTutorMessage(cdp, '그래프 그려줘');
  await waitForText(cdp, '핵심 힌트:', `${viewport.name} graph response`);
  if (options.graphExpected) {
    await waitForSelector(cdp, '[data-graph-card]', `${viewport.name} graph card`);
  }
  await assertGraphEvidence(cdp, server, viewport, lines, options.graphExpected, graphCallsBefore, options.evidenceDir);

  const invalidCallsBefore = server.calls().length;
  await sendTutorMessage(cdp, 'invalid visual');
  await waitForText(cdp, '핵심 힌트:', `${viewport.name} invalid visual response`);
  const invalidGraphFacts = await evaluateObject(
    cdp,
    '(() => ({ graphCards: document.querySelectorAll("[data-graph-card]").length, pageOverflowX: document.body.scrollWidth > document.body.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth }))()',
  );
  assertOk(
    server.calls().length === invalidCallsBefore + 1,
    `${viewport.name}: invalid visual retried or skipped provider call`,
  );
  assertOk(
    Number(invalidGraphFacts['graphCards']) === (options.graphExpected ? 1 : 0),
    `${viewport.name}: invalid visual changed graph card count`,
  );
  assertOk(invalidGraphFacts['pageOverflowX'] === false, `${viewport.name}: invalid visual overflowed page`);
  lines.push(`${viewport.name}: invalid visual stayed text-only without retry`);

  await sendTutorMessage(cdp, '다음 단계 알려줘');
  await waitForText(cdp, '풀이 시작:', `${viewport.name} retained target follow-up`);
  lines.push(`${viewport.name}: natural follow-up reused retained target`);

  await sendTutorMessage(cdp, 'malformed 테스트');
  await waitForText(cdp, '주의:', `${viewport.name} malformed literal response`);
  await assertMalformedLiteral(cdp, viewport, lines);
  const newestTurnFacts = await evaluateObject(cdp, '(() => { const log = document.querySelector("[role=log]"); return log instanceof HTMLElement ? { atBottom: log.scrollTop + log.clientHeight >= log.scrollHeight - 1 } : { atBottom: false }; })()');
  assertOk(newestTurnFacts['atBottom'] === true, `${viewport.name}: latest tutor turn was not scrolled into view`);
  await screenshot(cdp, join(options.evidenceDir, `malformed-${viewport.name}.png`));

  await cdp.send('Page.navigate', { url: server.baseUrl });
  await waitForText(cdp, 'AI 튜터에게 힌트 묻기', 'reset launcher');
  await clickButtonText(cdp, '열기');
}

async function runErrorAndLockPath(
  cdp: CdpClient,
  server: WidgetQaServer,
  viewport: Viewport,
  lines: string[],
  evidenceDir: string,
  fixtureName: WidgetBrowserFixtureName,
): Promise<void> {
  const callsBeforeGuard = server.calls().length;
  await sendTutorMessage(cdp, '2번 힌트 줘');
  await waitForText(cdp, '질문할 학습지를 선택하거나', `${viewport.name} worksheet guard`);
  assertOk(server.calls().length === callsBeforeGuard, `${viewport.name}: worksheet guard should not call tutor API`);
  await screenshot(cdp, join(evidenceDir, `clarification-${viewport.name}.png`));
  lines.push(`${viewport.name}: fresh no-level question shows local worksheet guard without API call`);

  await clickButtonText(cdp, firstFixtureMaterialLabel(fixtureName));
  await sendTutorMessage(cdp, '429 테스트');
  await waitForText(cdp, '잠시 후 다시 시도해 주세요.', `${viewport.name} 429 retry`);
  await sendTutorMessage(cdp, '503 테스트');
  await waitForText(cdp, '답변 생성이 끊겼어요.', `${viewport.name} 503 retry`);
  await waitForRuntimePredicate(
    cdp,
    '(() => { const input = document.getElementById("ai-tutor-message"); if (!(input instanceof HTMLElement)) return false; const rect = input.getBoundingClientRect(); return rect.bottom <= innerHeight && rect.top >= 0; })()',
    `${viewport.name}: retry composer`,
  );
  await screenshot(cdp, join(evidenceDir, `retry-${viewport.name}.png`));
  lines.push(`${viewport.name}: 429 and 503 retry UI surfaced and recovered`);
  await assertDuplicateSubmitLock(cdp, server, viewport, lines);
}

function firstFixtureMaterialLabel(fixtureName: WidgetBrowserFixtureName): string {
  const firstMaterial = browserFixture(fixtureName).materials[0];
  if (firstMaterial === undefined) throw new Error('browser fixture has no selectable material');
  return browserFixtureMaterialLabel(firstMaterial);
}

async function assertDuplicateSubmitLock(
  cdp: CdpClient,
  server: WidgetQaServer,
  viewport: Viewport,
  lines: string[],
): Promise<void> {
  const beforeDuplicateCount = server.calls().length;
  await sendTutorMessage(cdp, '중복 테스트');
  await waitForDisabledSend(cdp);
  await evaluate(cdp, 'document.querySelector("button[aria-label=\\"AI 튜터 질문 보내기\\"]")?.click()');
  await waitForText(cdp, '힌트:', `${viewport.name} duplicate lock response`);
  const duplicateCalls = server.calls().length - beforeDuplicateCount;
  assertOk(duplicateCalls === 1, `${viewport.name}: duplicate submit lock failed; calls=${duplicateCalls}`);
  lines.push(`${viewport.name}: duplicate submit lock kept one request`);
}

async function runAbortAndStoragePath(
  cdp: CdpClient,
  server: WidgetQaServer,
  viewport: Viewport,
  lines: string[],
): Promise<void> {
  const beforeAbortCount = server.aborts();
  await sendTutorMessage(cdp, 'abort 테스트');
  await waitForDisabledSend(cdp);
  await evaluate(cdp, 'document.getElementById("unmount-harness")?.click()');
  for (let attempt = 0; attempt < 20 && server.aborts() === beforeAbortCount; attempt += 1) {
    await delay(100);
  }
  assertOk(server.aborts() > beforeAbortCount, `${viewport.name}: abort on unmount not observed`);
  lines.push(`${viewport.name}: abort-on-unmount observed by synthetic server`);
  const storage = await storageState(cdp);
  assertOk(storage.localKeys.length === 0, `${viewport.name}: localStorage keys present`);
  assertOk(storage.sessionKeys.length === 0, `${viewport.name}: sessionStorage keys present`);
  lines.push(`${viewport.name}: no localStorage/sessionStorage keys`);
}
