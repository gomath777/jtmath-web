import { assertOk, type CdpClient, type Viewport } from '../summer-5week-demo-cdp';
import { evaluateObject } from './browser-qa-core';

export async function assertWorkbookTypography(cdp: CdpClient, viewport: Viewport, lines: string[]): Promise<void> {
  const facts = await evaluateObject(
    cdp,
    `(() => {
      const article = document.querySelector('.tutor-answer-content');
      const firstParagraph = article?.querySelector('p');
      const firstDisplay = article?.querySelector('[data-tutor-math="display"]');
      const inlineMath = article?.querySelector('[data-tutor-math="inline"]');
      const firstKatex = article?.querySelector('.katex');
      const fraction = article?.querySelector('.katex .mfrac');
      const fractionLine = fraction?.querySelector('.frac-line');
      const fractionLineRect = fractionLine instanceof HTMLElement ? fractionLine.getBoundingClientRect() : null;
      const fractionRows = Array.from(fraction?.querySelectorAll('.vlist > span') ?? []).map((node) => node.getBoundingClientRect());
      const numeratorBottom = fractionLineRect === null ? 0 : Math.max(0, ...fractionRows.filter((rect) => rect.bottom <= fractionLineRect.top).map((rect) => rect.bottom));
      const denominatorTop = fractionLineRect === null ? 0 : Math.min(Infinity, ...fractionRows.filter((rect) => rect.top >= fractionLineRect.bottom).map((rect) => rect.top));
      const answerCard = document.querySelector('.tutor-answer-card');
      const scrollableDisplay = Array.from(article?.querySelectorAll('[data-tutor-math="display"]') ?? []).find((node) => node instanceof HTMLElement && node.scrollWidth > node.clientWidth + 1);
      const body = document.body;
      const documentEl = document.documentElement;
      const paragraphStyle = firstParagraph instanceof HTMLElement ? getComputedStyle(firstParagraph) : null;
      const articleStyle = article instanceof HTMLElement ? getComputedStyle(article) : null;
      const answerCardStyle = answerCard instanceof HTMLElement ? getComputedStyle(answerCard) : null;
      const displayRect = firstDisplay instanceof HTMLElement ? firstDisplay.getBoundingClientRect() : null;
      const displayStyle = firstDisplay instanceof HTMLElement ? getComputedStyle(firstDisplay) : null;
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
      const literalNodes = Array.from(article?.querySelectorAll('[data-tutor-math="literal"]') ?? []);
      const inlineMathNodes = Array.from(article?.querySelectorAll('[data-tutor-math="inline"]') ?? []);
      return {
        tutorFontSizePx: Number.parseFloat(paragraphStyle?.fontSize ?? '0'), tutorLineHeightPx: Number.parseFloat(paragraphStyle?.lineHeight ?? '0'),
        tutorLineHeightRatio: paragraphStyle?.fontSize ? Number.parseFloat(paragraphStyle.lineHeight) / Number.parseFloat(paragraphStyle.fontSize) : 0,
        articleWordBreak: articleStyle?.wordBreak ?? '', articleOverflowWrap: articleStyle?.overflowWrap ?? '', articleWidthPx: articleRect?.width ?? 0,
        displayHeight: displayRect?.height ?? 0, inlineHeight: inlineRect?.height ?? 0, displayBottomGapPx: displayRect && displayKatexRect ? displayRect.bottom - displayKatexRect.bottom : 0,
        scrollableDisplayOwnsOverflow: scrollableDisplay instanceof HTMLElement ? scrollableDisplay.scrollWidth > scrollableDisplay.clientWidth + 1 : false,
        pageOverflowX: body.scrollWidth > body.clientWidth || documentEl.scrollWidth > documentEl.clientWidth,
        fieldsetBorderWidth: fieldsetStyle?.borderTopWidth ?? '', fieldsetPaddingLeft: fieldsetStyle?.paddingLeft ?? '', studentBubbleBackground: studentStyle?.backgroundColor ?? '', studentBubbleColor: studentStyle?.color ?? '',
        katexFontFamily: firstKatex instanceof HTMLElement ? getComputedStyle(firstKatex).fontFamily : '', fractionCount: article?.querySelectorAll('.katex .mfrac').length ?? 0,
        fractionLineCount: article?.querySelectorAll('.katex .mfrac .frac-line').length ?? 0, numeratorAboveLine: numeratorBottom > 0 && fractionLineRect !== null && numeratorBottom <= fractionLineRect.top,
        denominatorBelowLine: Number.isFinite(denominatorTop) && fractionLineRect !== null && denominatorTop >= fractionLineRect.bottom,
        hasMathMl: article?.querySelector('.katex-mathml math') !== null, faithfulMathMlCss: mathMlStyle?.position === 'absolute' && mathMlStyle?.width === '1px' && mathMlStyle?.height === '1px',
        visibleLiteralMathCount: literalNodes.filter((node) => node instanceof HTMLElement && getComputedStyle(node).display !== 'none').length,
        geometryLabelKatexCount: inlineMathNodes.filter((node) => ['PRQ', 'PQ', 'PR'].includes(node.getAttribute('aria-label') ?? '') && node.querySelector('.katex') !== null).length,
        scrollableInlineMathCount: inlineMathNodes.filter((node) => node instanceof HTMLElement && ['auto', 'scroll'].includes(getComputedStyle(node).overflowX)).length,
        displayScrollbarWidth: displayStyle?.scrollbarWidth ?? '',
        duplicateVisibleMathMl: Array.from(article?.querySelectorAll('.katex-mathml') ?? []).some((node) => node instanceof HTMLElement && (getComputedStyle(node).position !== 'absolute' || getComputedStyle(node).width !== '1px' || getComputedStyle(node).height !== '1px')),
      };
    })()`,
  );
  const number = (key: string): number => Number(facts[key]);
  assertOk(number('tutorFontSizePx') >= 15, `${viewport.name}: tutor prose font-size below workbook floor`);
  assertOk(number('tutorLineHeightPx') >= 24.75 && number('tutorLineHeightRatio') >= 1.65, `${viewport.name}: tutor prose line-height below workbook floor`);
  assertOk(facts['articleWordBreak'] === 'keep-all' && ['break-word', 'anywhere'].includes(String(facts['articleOverflowWrap'])), `${viewport.name}: tutor prose wrap policy drifted`);
  assertOk(number('articleWidthPx') >= 250 && number('displayHeight') > number('inlineHeight') * 1.2 && number('inlineHeight') > 0, `${viewport.name}: display math is not larger than inline math`);
  assertOk(number('displayBottomGapPx') >= 10 && facts['scrollableDisplayOwnsOverflow'] === true && facts['pageOverflowX'] === false, `${viewport.name}: workbook math overflow or spacing regression`);
  assertOk(facts['fieldsetBorderWidth'] === '0px' && facts['fieldsetPaddingLeft'] === '0px', `${viewport.name}: harness leaked raw fieldset chrome`);
  assertOk(String(facts['studentBubbleBackground']) !== 'rgba(0, 0, 0, 0)' && String(facts['studentBubbleColor']) === 'rgb(255, 255, 255)', `${viewport.name}: student bubble lost production colors`);
  assertOk(/KaTeX_/u.test(String(facts['katexFontFamily'])), `${viewport.name}: computed KaTeX font family missing`);
  assertOk(number('fractionCount') > 0 && number('fractionLineCount') > 0 && facts['numeratorAboveLine'] === true && facts['denominatorBelowLine'] === true, `${viewport.name}: fraction DOM or stacked geometry missing`);
  assertOk(facts['hasMathMl'] === true && facts['faithfulMathMlCss'] === true && facts['duplicateVisibleMathMl'] === false, `${viewport.name}: MathML is not hidden visually and present accessibly`);
  assertOk(number('visibleLiteralMathCount') === 0, `${viewport.name}: literal math fallback leaked into workbook answer`);
  assertOk(number('geometryLabelKatexCount') === 3, `${viewport.name}: P-Q-R geometry labels did not render as KaTeX`);
  assertOk(number('scrollableInlineMathCount') === 0, `${viewport.name}: inline math exposed horizontal scrollbar chrome`);
  assertOk(facts['displayScrollbarWidth'] === 'none', `${viewport.name}: display math exposed horizontal scrollbar chrome`);
  lines.push(`${viewport.name}: workbook typography facts ${JSON.stringify(facts)}`);
}
