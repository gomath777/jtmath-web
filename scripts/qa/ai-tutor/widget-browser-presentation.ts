import { join } from 'path';
import { assertOk, delay, screenshot, type CdpClient, type Viewport } from '../summer-5week-demo-cdp';
import { evaluate, evaluateObject } from './browser-qa-core';
import type { WidgetQaServer } from './widget-browser-server';

export function expectedGraphScreenshotNames(viewportNames: readonly string[]): readonly string[] {
  return viewportNames.map((viewportName) => graphScreenshotName(viewportName));
}

export async function assertGraphEvidence(
  cdp: CdpClient,
  server: WidgetQaServer,
  viewport: Viewport,
  lines: string[],
  expected: boolean,
  callsBefore: number,
  evidenceDir: string,
): Promise<void> {
  if (!expected) {
    await delay(160);
    const facts = await evaluateObject(
      cdp,
      '(() => ({ graphCards: document.querySelectorAll("[data-graph-card]").length, pageOverflowX: document.body.scrollWidth > document.body.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth }))()',
    );
    assertOk(Number(facts['graphCards']) === 0, `${viewport.name}: flag-off graph card rendered`);
    assertOk(facts['pageOverflowX'] === false, `${viewport.name}: flag-off graph overflowed page`);
    assertOk(
      server.calls().length === callsBefore + 1,
      `${viewport.name}: flag-off graph provider call count was not exactly one`,
    );
    const absentScreenshot = absentGraphScreenshotName(viewport.name);
    await screenshot(cdp, join(evidenceDir, absentScreenshot));
    lines.push(`${viewport.name}: graph flag-off returned text-only with no graph card/network request; screenshot ${absentScreenshot}`);
    return;
  }

  const facts = await evaluateObject(
    cdp,
    `(() => {
      const card = document.querySelector('[data-graph-card]');
      const svg = card?.querySelector('svg');
      const summary = card?.querySelector('[data-graph-summary]');
      const rect = card instanceof HTMLElement ? card.getBoundingClientRect() : null;
      const summaryRect = summary instanceof HTMLElement ? summary.getBoundingClientRect() : null;
      const summaryStyle = summary instanceof HTMLElement ? getComputedStyle(summary) : null;
      const resources = performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('graph') || name.includes('plot'));
      return {
        graphCards: document.querySelectorAll('[data-graph-card]').length,
        svgWidth: svg?.getBoundingClientRect().width ?? 0,
        svgHeight: svg?.getBoundingClientRect().height ?? 0,
        cardWidth: rect?.width ?? 0,
        pageOverflowX: document.body.scrollWidth > document.body.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth,
        accessibleTitle: svg?.querySelector('title')?.textContent ?? '',
        accessibleSummary: svg?.querySelector('desc')?.textContent?.trim() ?? '',
        visibleSummary: summary?.textContent?.trim() ?? '',
        visibleSummaryHeight: summaryRect?.height ?? 0,
        visibleSummaryDisplay: summaryStyle?.display ?? '',
        hasExternalGraphRequest: resources.length > 0,
        tabIndex: svg?.getAttribute('tabindex') ?? '',
      };
    })()`,
  );
  assertOk(Number(facts['graphCards']) === 1, `${viewport.name}: graph card missing or duplicated`);
  assertOk(Number(facts['svgWidth']) <= Number(facts['cardWidth']) + 1, `${viewport.name}: graph exceeds card width`);
  assertOk(Number(facts['svgHeight']) > 0, `${viewport.name}: graph has no bounded height`);
  assertOk(facts['pageOverflowX'] === false, `${viewport.name}: graph caused horizontal overflow`);
  assertOk(String(facts['accessibleTitle']).length > 0, `${viewport.name}: graph accessible title missing`);
  assertOk(String(facts['visibleSummary']).length > 0, `${viewport.name}: graph visible summary missing`);
  assertOk(facts['visibleSummary'] === facts['accessibleSummary'], `${viewport.name}: graph visible and accessible summaries diverged`);
  assertOk(Number(facts['visibleSummaryHeight']) > 0 && facts['visibleSummaryDisplay'] !== 'none', `${viewport.name}: graph summary is not visible`);
  assertOk(facts['hasExternalGraphRequest'] === false, `${viewport.name}: graph made a network request`);
  assertOk(facts['tabIndex'] === '-1', `${viewport.name}: graph entered keyboard tab order`);
  assertOk(
    server.calls().length === callsBefore + 1,
    `${viewport.name}: graph provider call count was not exactly one`,
  );
  await evaluate(
    cdp,
    `(() => {
      const graphCard = document.querySelector('[data-graph-card]');
      if (graphCard instanceof HTMLElement) {
        graphCard.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    })()`,
  );
  await delay(120);
  const graphScreenshot = graphScreenshotName(viewport.name);
  await screenshot(cdp, join(evidenceDir, graphScreenshot));
  lines.push(`${viewport.name}: graph boundedness/accessibility/no-network facts ${JSON.stringify(facts)}; screenshot ${graphScreenshot}`);
}

function graphScreenshotName(viewportName: string): string {
  return `graph-card-${viewportName}.png`;
}

function absentGraphScreenshotName(viewportName: string): string {
  return `graph-absent-${viewportName}.png`;
}

export async function assertWorkbookTypography(
  cdp: CdpClient,
  viewport: Viewport,
  lines: string[],
): Promise<void> {
  const facts = await evaluateObject(
    cdp,
    `(() => {
      const article = document.querySelector('.tutor-answer-content');
      const firstParagraph = article?.querySelector('p');
      const firstDisplay = article?.querySelector('[data-tutor-math="display"]');
      const inlineMath = article?.querySelector('[data-tutor-math="inline"]');
      const answerCard = document.querySelector('.tutor-answer-card');
      const scrollableDisplay = Array.from(article?.querySelectorAll('[data-tutor-math="display"]') ?? []).find((node) => {
        if (!(node instanceof HTMLElement)) return false;
        return node.scrollWidth > node.clientWidth + 1;
      });
      const body = document.body;
      const documentEl = document.documentElement;
      const paragraphStyle = firstParagraph instanceof HTMLElement ? getComputedStyle(firstParagraph) : null;
      const articleStyle = article instanceof HTMLElement ? getComputedStyle(article) : null;
      const answerCardStyle = answerCard instanceof HTMLElement ? getComputedStyle(answerCard) : null;
      const displayRect = firstDisplay instanceof HTMLElement ? firstDisplay.getBoundingClientRect() : null;
      const inlineRect = inlineMath instanceof HTMLElement ? inlineMath.getBoundingClientRect() : null;
      const displayKatex = firstDisplay?.querySelector('.katex-display');
      const fieldset = document.querySelector('fieldset');
      const studentBubble = document.querySelector('p.bg-terracotta.text-white');
      const displayKatexRect = displayKatex instanceof HTMLElement ? displayKatex.getBoundingClientRect() : null;
      const articleRect = article instanceof HTMLElement ? article.getBoundingClientRect() : null;
      const mathMlNode = article?.querySelector('.katex-mathml');
      const mathMlStyle = mathMlNode instanceof HTMLElement ? getComputedStyle(mathMlNode) : null;
      const fieldsetStyle = fieldset instanceof HTMLElement ? getComputedStyle(fieldset) : null;
      const studentStyle = studentBubble instanceof HTMLElement ? getComputedStyle(studentBubble) : null;
      return {
        tutorFontSizePx: Number.parseFloat(paragraphStyle?.fontSize ?? '0'),
        tutorLineHeightPx: Number.parseFloat(paragraphStyle?.lineHeight ?? '0'),
        tutorLineHeightRatio: paragraphStyle?.fontSize ? Number.parseFloat(paragraphStyle.lineHeight) / Number.parseFloat(paragraphStyle.fontSize) : 0,
        articleWordBreak: articleStyle?.wordBreak ?? '',
        articleOverflowWrap: articleStyle?.overflowWrap ?? '',
        articleWidthPx: articleRect?.width ?? 0,
        displayHeight: displayRect?.height ?? 0,
        inlineHeight: inlineRect?.height ?? 0,
        displayBottomGapPx: displayRect && displayKatexRect ? displayRect.bottom - displayKatexRect.bottom : 0,
        scrollableDisplayOwnsOverflow: scrollableDisplay instanceof HTMLElement ? scrollableDisplay.scrollWidth > scrollableDisplay.clientWidth + 1 : false,
        pageOverflowX: body.scrollWidth > body.clientWidth || documentEl.scrollWidth > documentEl.clientWidth,
        fieldsetBorderWidth: fieldsetStyle?.borderTopWidth ?? '',
        fieldsetPaddingLeft: fieldsetStyle?.paddingLeft ?? '',
        studentBubbleBackground: studentStyle?.backgroundColor ?? '',
        studentBubbleColor: studentStyle?.color ?? '',
        hasMathMl: article?.querySelector('.katex-mathml math') !== null,
        faithfulMathMlCss: mathMlStyle?.position === 'absolute' && mathMlStyle?.width === '1px' && mathMlStyle?.height === '1px',
        visibleLiteralMathCount: Array.from(article?.querySelectorAll('[data-tutor-math="literal"]') ?? []).filter((node) => {
          if (!(node instanceof HTMLElement)) return false;
          return getComputedStyle(node).display !== 'none';
        }).length,
        duplicateVisibleMathMl: Array.from(article?.querySelectorAll('.katex-mathml') ?? []).some((node) => {
          if (!(node instanceof HTMLElement)) return false;
          const style = getComputedStyle(node);
          return style.position !== 'absolute' || style.width !== '1px' || style.height !== '1px';
        }),
      };
    })()`,
  );
  const fontSize = Number(facts['tutorFontSizePx']);
  const lineHeight = Number(facts['tutorLineHeightPx']);
  const lineHeightRatio = Number(facts['tutorLineHeightRatio']);
  const displayHeight = Number(facts['displayHeight']);
  const inlineHeight = Number(facts['inlineHeight']);
  const articleWidth = Number(facts['articleWidthPx']);
  const displayBottomGap = Number(facts['displayBottomGapPx']);
  assertOk(fontSize >= 15, `${viewport.name}: tutor prose font-size below workbook floor; got ${fontSize}`);
  assertOk(lineHeight >= 24.75, `${viewport.name}: tutor prose line-height below workbook floor; got ${lineHeight}`);
  assertOk(lineHeightRatio >= 1.65, `${viewport.name}: tutor prose line-height ratio below workbook floor; got ${lineHeightRatio}`);
  assertOk(facts['articleWordBreak'] === 'keep-all', `${viewport.name}: tutor prose should keep Korean word units; got ${String(facts['articleWordBreak'])}`);
  assertOk(
    ['break-word', 'anywhere'].includes(String(facts['articleOverflowWrap'])),
    `${viewport.name}: tutor prose overflow policy should be safe; got ${String(facts['articleOverflowWrap'])}`,
  );
  assertOk(articleWidth >= 250, `${viewport.name}: tutor answer width collapsed in normal mobile layout; got ${articleWidth}`);
  assertOk(
    displayHeight > inlineHeight * 1.2,
    `${viewport.name}: display math should read larger than inline math; got display=${displayHeight}, inline=${inlineHeight}`,
  );
  assertOk(displayBottomGap >= 10, `${viewport.name}: display math wrapper needs more bottom breathing room; got ${displayBottomGap}`);
  assertOk(facts['scrollableDisplayOwnsOverflow'] === true, `${viewport.name}: long display math should scroll inside the tutor card`);
  assertOk(facts['pageOverflowX'] === false, `${viewport.name}: page overflowed horizontally during workbook hint`);
  assertOk(facts['fieldsetBorderWidth'] === '0px' && facts['fieldsetPaddingLeft'] === '0px', `${viewport.name}: harness leaked raw fieldset chrome`);
  assertOk(
    String(facts['studentBubbleBackground']) !== 'rgba(0, 0, 0, 0)' && String(facts['studentBubbleColor']) === 'rgb(255, 255, 255)',
    `${viewport.name}: student bubble lost contrasting production colors ${JSON.stringify(facts)}`,
  );
  assertOk(facts['hasMathMl'] === true, `${viewport.name}: MathML accessibility tree missing`);
  assertOk(
    facts['faithfulMathMlCss'] === true,
    `${viewport.name}: synthetic harness is missing the faithful KaTeX accessibility CSS`,
  );
  assertOk(Number(facts['visibleLiteralMathCount']) === 0, `${viewport.name}: visible literal math fallback leaked into workbook answer`);
  assertOk(facts['duplicateVisibleMathMl'] === false, `${viewport.name}: MathML duplicate text became visibly rendered`);
  lines.push(`${viewport.name}: workbook typography facts ${JSON.stringify(facts)}`);
}

export async function assertZoomTypography(
  cdp: CdpClient,
  viewport: Viewport,
  lines: string[],
  evidenceDir: string,
): Promise<void> {
  await evaluate(cdp, 'document.documentElement.style.zoom = "2"');
  await evaluate(
    cdp,
    `(() => {
      const answer = document.querySelector('.tutor-answer-content');
      if (answer instanceof HTMLElement) {
        answer.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    })()`,
  );
  await delay(120);
  const facts = await evaluateObject(
    cdp,
    `(() => {
      const body = document.body;
      const documentEl = document.documentElement;
      const answer = document.querySelector('.tutor-answer-content');
      const answerRect = answer instanceof HTMLElement ? answer.getBoundingClientRect() : null;
      return {
        pageOverflowX: body.scrollWidth > body.clientWidth || documentEl.scrollWidth > documentEl.clientWidth,
        zoom: document.documentElement.style.zoom || '',
        answerVisible: document.querySelector('.tutor-answer-content') instanceof HTMLElement,
        answerWidthPx: answerRect?.width ?? 0,
      };
    })()`,
  );
  assertOk(facts['zoom'] === '2', `${viewport.name}: 200% zoom was not applied`);
  assertOk(facts['answerVisible'] === true, `${viewport.name}: tutor answer disappeared at 200% zoom`);
  assertOk(
    Number(facts['answerWidthPx']) >= 170,
    `${viewport.name}: tutor answer visible width collapsed below the readable floor at 200% zoom; got ${Number(facts['answerWidthPx'])}`,
  );
  assertOk(facts['pageOverflowX'] === false, `${viewport.name}: page overflowed horizontally at 200% zoom`);
  await screenshot(cdp, join(evidenceDir, `zoom-200-${viewport.name}.png`));
  lines.push(`${viewport.name}: 200% zoom kept tutor answer readable without page overflow`);
  await evaluate(cdp, 'document.documentElement.style.zoom = ""');
}
