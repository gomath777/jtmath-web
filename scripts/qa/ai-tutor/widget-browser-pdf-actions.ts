import { join } from 'node:path';
import { assertOk, screenshot, type CdpClient, type Viewport } from '../summer-5week-demo-cdp';
import { evaluate, evaluateObject } from './browser-qa-core';

interface PdfActionAssertionOptions {
  readonly cdp: CdpClient;
  readonly viewport: Viewport;
  readonly lines: string[];
  readonly evidenceDir: string;
  readonly materialCount: number;
}

export async function assertPdfResourceActions(options: PdfActionAssertionOptions): Promise<void> {
  const { cdp, viewport, lines, evidenceDir, materialCount } = options;
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  const facts = await evaluateObject(
    cdp,
    `(() => {
      const fixture = document.querySelector('[data-qa-pdf-fixture]');
      const anchors = fixture ? Array.from(fixture.querySelectorAll('a[href]')) : [];
      const controls = anchors.map((anchor) => {
        const rect = anchor.getBoundingClientRect();
        return { label: anchor.getAttribute('aria-label') ?? '', tabIndex: anchor.tabIndex, width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      const overlaps = controls.some((control, index) => controls.slice(index + 1).some((other) => control.left < other.right && control.right > other.left && control.top < other.bottom && control.bottom > other.top));
      const first = anchors[0];
      if (first instanceof HTMLElement) first.focus({ focusVisible: true });
      const focusStyle = first instanceof HTMLElement ? getComputedStyle(first) : null;
      return {
        anchorCount: anchors.length,
        openCount: controls.filter((control) => control.label.endsWith('브라우저에서 열기')).length,
        downloadCount: controls.filter((control) => control.label.endsWith('다운로드')).length,
        allFocusable: controls.every((control) => control.tabIndex >= 0),
        allVisible: controls.every((control) => control.width > 0 && control.height > 0),
        overlaps,
        focusOutlineVisible: focusStyle?.outlineStyle !== 'none' && focusStyle?.outlineWidth !== '0px',
      };
    })()`,
  );
  const expectedAnchors = materialCount * 2;
  assertOk(Number(facts['anchorCount']) === expectedAnchors, `${viewport.name}: expected ${expectedAnchors} separate PDF anchors`);
  assertOk(Number(facts['openCount']) === materialCount && Number(facts['downloadCount']) === materialCount, `${viewport.name}: PDF open/download action count drifted`);
  assertOk(facts['allFocusable'] === true && facts['allVisible'] === true, `${viewport.name}: PDF actions are not separately focusable and visible`);
  assertOk(facts['focusOutlineVisible'] === true, `${viewport.name}: PDF action focus-visible ring is not observable`);
  assertOk(facts['overlaps'] === false, `${viewport.name}: PDF action controls overlap`);
  await evaluate(cdp, 'document.querySelector("[data-qa-pdf-fixture] a[href]")?.scrollIntoView({ block: "center", inline: "nearest" })');
  await screenshot(cdp, join(evidenceDir, `pdf-actions-focus-${viewport.name}.png`));
  await cdp.send('Page.setDownloadBehavior', { behavior: 'deny', eventsEnabled: true });
  const downloadEvent = cdp.waitForEvent('Page.downloadWillBegin', 3_000);
  await evaluate(cdp, 'document.querySelector("[data-qa-pdf-fixture] a[aria-label$=\\"다운로드\\"]")?.click()');
  const event = await downloadEvent;
  assertOk(isDownloadEvent(event), `${viewport.name}: public PDF route did not produce a browser download event`);
  lines.push(`${viewport.name}: PDF action focus/geometry facts ${JSON.stringify(facts)}; public route download event observed without persistence`);
}

function isDownloadEvent(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'url' in value && typeof value.url === 'string' && value.url.includes('/api/public/pdf-download');
}
