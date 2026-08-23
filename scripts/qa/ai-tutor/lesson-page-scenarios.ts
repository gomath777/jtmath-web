import { join } from 'path';
import { assertOk, delay, screenshot, setViewport, type CdpClient, type Viewport } from '../summer-5week-demo-cdp';
import { clickButtonText, evaluate, evaluateObject, waitForRuntimePredicate, waitForText } from './browser-qa-core';
import type { LessonQaServer } from './lesson-page-harness';

const EVIDENCE_DIR = '.omo/evidence/page-context-ai-tutor-widget/real-lesson-page-qa';

export async function runLessonViewport(cdp: CdpClient, server: LessonQaServer, viewport: Viewport): Promise<readonly string[]> {
  const lines: string[] = [];
  await setViewport(cdp, viewport);
  await cdp.send('Page.navigate', { url: server.baseUrl });
  await waitForText(cdp, '학습지 받기', `${viewport.name} lesson content`);
  await waitForText(cdp, 'AI 튜터에게 힌트 묻기', `${viewport.name} tutor launcher`);
  await scrollIntoView(cdp, 'a[href*="/api/public/pdf-download"]');
  await assertInitialLessonControls(cdp, viewport, lines);
  await clickButtonText(cdp, '2번');
  await waitForRuntimePredicate(cdp, 'document.querySelectorAll("iframe").length === 1', `${viewport.name} video player`);
  lines.push(`${viewport.name}: video toggle opens real LearningVideoPlayer iframe path`);
  await clickButtonText(cdp, '열기');
  await waitForText(cdp, '질문할 학습지', `${viewport.name} widget expanded`);
  await assertWidgetContextWiring(cdp, viewport, lines);
  await scrollIntoView(cdp, 'a[href*="/api/public/pdf-download"]');
  await screenshot(cdp, join(EVIDENCE_DIR, `lesson-widget-open-${viewport.name}.png`));
  await assertOverlayDoesNotCoverControls(cdp, viewport, lines);
  await submitContextBackedHint(cdp, server, viewport, lines);
  await assertKeyboardFlow(cdp, viewport, lines);
  await screenshot(cdp, join(EVIDENCE_DIR, `keyboard-focus-${viewport.name}.png`));
  return lines;
}

async function assertInitialLessonControls(cdp: CdpClient, viewport: Viewport, lines: string[]): Promise<void> {
  const initialFacts = await evaluateObject(cdp, interactionFacts());
  assertOk(initialFacts['pdfClickable'] === true, `${viewport.name}: PDF center not clickable`);
  assertOk(initialFacts['videoButtonClickable'] === true, `${viewport.name}: video toggle center not clickable`);
  lines.push(`${viewport.name}: actual LessonContent PDF and video controls render and are clickable before widget opens`);
  await screenshot(cdp, join(EVIDENCE_DIR, `lesson-initial-${viewport.name}.png`));
}

async function assertWidgetContextWiring(cdp: CdpClient, viewport: Viewport, lines: string[]): Promise<void> {
  const facts = await evaluateObject(cdp, `(() => ({
    contextLabel: Array.from(document.querySelectorAll('section[aria-label="AI 튜터"] p')).map((node) => node.textContent?.trim() ?? '').find((text) => text.includes('대수 · 삼각함수')) ?? '',
    materialLabels: Array.from(document.querySelectorAll('fieldset button')).map((button) => button.textContent?.trim() ?? ''),
  }))()`);
  assertOk(facts['contextLabel'] === '대수 · 삼각함수', `${viewport.name}: widget did not receive LessonContent tutorContext`);
  assertOk(JSON.stringify(facts['materialLabels']) === JSON.stringify(['삼각함수 레벨1', '삼각함수 레벨2']), `${viewport.name}: tutor materials were not client-safe context materials`);
  lines.push(`${viewport.name}: LessonContent tutorContext rendered the real widget label and two client materials`);
}

async function assertOverlayDoesNotCoverControls(cdp: CdpClient, viewport: Viewport, lines: string[]): Promise<void> {
  const overlayFacts = await evaluateObject(cdp, interactionFacts());
  assertOk(overlayFacts['pdfClickable'] === true, `${viewport.name}: PDF center covered after widget opens`);
  assertOk(overlayFacts['videoButtonClickable'] === true, `${viewport.name}: video control covered after widget opens`);
  lines.push(`${viewport.name}: widget open state does not cover PDF or video control centers`);
}

function interactionFacts(): string {
  return `(() => ({
    pdfClickable: ${isCenterClickableExpression('a[href*="/api/public/pdf-download"]')},
    videoButtonClickable: ${isCenterClickableExpression('button')},
    pdfCount: document.querySelectorAll('a[href*="/api/public/pdf-download"]').length,
    iframeCount: document.querySelectorAll('iframe').length
  }))()`;
}

function isCenterClickableExpression(selector: string): string {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === el || el.contains(hit);
  })()`;
}

async function scrollIntoView(cdp: CdpClient, selector: string): Promise<void> {
  await evaluate(cdp, `
    (() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (element instanceof HTMLElement) element.scrollIntoView({ block: 'center', inline: 'center' });
    })()
  `);
  await delay(120);
}

async function submitContextBackedHint(cdp: CdpClient, server: LessonQaServer, viewport: Viewport, lines: string[]): Promise<void> {
  const callsBefore = server.calls().length;
  await clickTutorMaterial(cdp, '삼각함수 레벨1');
  await fillTutorInput(cdp, '2번 힌트 줘');
  await delay(80);
  await evaluate(cdp, 'document.querySelector("button[aria-label=\\"AI 튜터 질문 보내기\\"]")?.click()');
  await waitForText(cdp, '힌트:', `${viewport.name} context-backed tutor answer`);
  await waitForRuntimePredicate(cdp, 'document.querySelector(".katex") !== null', `${viewport.name} context-backed KaTeX`);
  const newestCall = server.calls()[server.calls().length - 1];
  assertOk(server.calls().length === callsBefore + 1, `${viewport.name}: context-backed hint did not call tutor API once`);
  assertOk(newestCall?.lessonSlug === 'synthetic-trig', `${viewport.name}: tutor API did not receive lesson slug`);
  assertOk(newestCall?.selectedMaterialKey === 'm-1-content-pdfs-0', `${viewport.name}: tutor API did not receive selected context material`);
  lines.push(`${viewport.name}: real AiTutorWidget submitted LessonContent materialKey=m-1-content-pdfs-0 for lessonSlug=synthetic-trig`);
}

async function clickTutorMaterial(cdp: CdpClient, label: string): Promise<void> {
  await evaluate(cdp, `
    (() => {
      const button = Array.from(document.querySelectorAll('fieldset button')).find((candidate) => candidate.textContent?.trim() === ${JSON.stringify(label)});
      if (!(button instanceof HTMLButtonElement)) throw new Error('material button not found: ${label}');
      button.click();
    })()
  `);
}

async function assertKeyboardFlow(cdp: CdpClient, viewport: Viewport, lines: string[]): Promise<void> {
  await fillTutorInput(cdp, '2번 힌트 줘');
  await delay(80);
  const tabFacts = await evaluateObject(cdp, `(() => {
    const tabbables = Array.from(document.querySelectorAll('button, textarea, a[href]')).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      return !element.hasAttribute('disabled') && style.display !== 'none' && style.visibility !== 'hidden';
    });
    return {
      textareaIndex: tabbables.findIndex((element) => element.id === 'ai-tutor-message'),
      sendIndex: tabbables.findIndex((element) => element.getAttribute('aria-label') === 'AI 튜터 질문 보내기'),
      closeIndex: tabbables.findIndex((element) => element.getAttribute('aria-label') === 'AI 튜터 닫기')
    };
  })()`);
  assertOk(Number(tabFacts['textareaIndex']) >= 0, `${viewport.name}: textarea missing from tab order`);
  assertOk(Number(tabFacts['sendIndex']) > Number(tabFacts['textareaIndex']), `${viewport.name}: send button does not follow textarea in tab order`);
  assertOk(Number(tabFacts['closeIndex']) >= 0, `${viewport.name}: close button missing from tab order`);
  await evaluate(cdp, 'document.querySelector("button[aria-label=\\"AI 튜터 질문 보내기\\"]")?.focus()');
  await assertFocusedControlVisible(cdp, viewport);
  await evaluate(cdp, 'document.querySelector("button[aria-label=\\"AI 튜터 닫기\\"]")?.click()');
  await waitForText(cdp, '열기', `${viewport.name} close return`);
  const closeFacts = await evaluateObject(cdp, `(() => ({ activeText: document.activeElement?.textContent ?? '', expanded: document.querySelector('section[aria-label="AI 튜터"] button')?.getAttribute('aria-expanded') }))()`);
  assertOk(String(closeFacts['activeText']).includes('열기'), `${viewport.name}: close did not return focus to launcher`);
  assertOk(closeFacts['expanded'] === 'false', `${viewport.name}: launcher aria-expanded not false after close`);
  lines.push(`${viewport.name}: keyboard tab reaches visible focus and close returns focus to launcher`);
}

async function fillTutorInput(cdp: CdpClient, message: string): Promise<void> {
  await evaluate(cdp, `
    (() => {
      const input = document.getElementById('ai-tutor-message');
      if (!(input instanceof HTMLTextAreaElement)) throw new Error('textarea missing');
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) throw new Error('textarea setter missing');
      setter.call(input, ${JSON.stringify(message)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()
  `);
}

async function assertFocusedControlVisible(cdp: CdpClient, viewport: Viewport): Promise<void> {
  const facts = await evaluateObject(cdp, `(() => {
    const active = document.activeElement;
    const style = active instanceof HTMLElement ? getComputedStyle(active) : null;
    return { id: active?.id ?? '', label: active?.getAttribute('aria-label') ?? '', outlineWidth: style?.outlineWidth ?? '', outlineStyle: style?.outlineStyle ?? '' };
  })()`);
  assertOk(facts['id'] === 'ai-tutor-message' || facts['label'] === 'AI 튜터 질문 보내기', `${viewport.name}: focused send control missing; facts=${JSON.stringify(facts)}`);
  assertOk(facts['outlineStyle'] !== 'none' || facts['outlineWidth'] !== '0px', `${viewport.name}: focused widget control has no visible outline`);
}
