import { assertOk, type CdpClient, type Viewport } from '../summer-5week-demo-cdp';
import { evaluateObject } from './browser-qa-core';

export async function assertExpandedAccessibility(
  cdp: CdpClient,
  viewport: Viewport,
  lines: string[],
): Promise<void> {
  const facts = await evaluateObject(
    cdp,
    `(() => ({
      expanded: document.querySelector('section[aria-label="AI 튜터"] button')?.getAttribute('aria-expanded') === 'true',
      activeId: document.activeElement?.id ?? '',
      hasLog: document.querySelector('[role="log"][aria-live="polite"]') !== null,
      sendLabel: document.querySelector('button[aria-label="AI 튜터 질문 보내기"]') !== null
    }))()`,
  );
  assertOk(facts['expanded'] === true, `${viewport.name}: aria-expanded not true`);
  assertOk(facts['activeId'] === 'ai-tutor-message', `${viewport.name}: input did not receive focus`);
  assertOk(facts['hasLog'] === true, `${viewport.name}: aria-live log missing`);
  assertOk(facts['sendLabel'] === true, `${viewport.name}: send label missing`);
  lines.push(`${viewport.name}: focus and aria-live/log controls ok`);
}

export async function assertExactRouteAndSyntheticAuth(
  cdp: CdpClient,
  viewport: Viewport,
  lines: string[],
  route: string,
): Promise<void> {
  const facts = await evaluateObject(
    cdp,
    `(() => ({
      path: location.pathname,
      routeMeta: document.querySelector('meta[name="qa-route"]')?.getAttribute('content') ?? '',
      authMeta: document.querySelector('meta[name="qa-auth"]')?.getAttribute('content') ?? '',
      consoleErrors: Number(window.__qaConsoleErrors ?? 0)
    }))()`,
  );
  assertOk(facts['path'] === route, `${viewport.name}: exact lesson route missing`);
  assertOk(
    facts['routeMeta'] === route,
    `${viewport.name}: exact route evidence missing`,
  );
  assertOk(
    facts['authMeta'] === 'synthetic-released',
    `${viewport.name}: synthetic auth evidence missing`,
  );
  assertOk(Number(facts['consoleErrors']) === 0, `${viewport.name}: console errors observed`);
  lines.push(`${viewport.name}: exact route and synthetic released fixture verified`);
}

export async function assertMalformedLiteral(
  cdp: CdpClient,
  viewport: Viewport,
  lines: string[],
): Promise<void> {
  const facts = await evaluateObject(
    cdp,
    `(() => {
      const article = Array.from(document.querySelectorAll('.tutor-answer-content')).at(-1) ?? null;
      const innerHtml = article?.innerHTML ?? '';
      const textContent = article?.textContent ?? '';
      return {
        hasRawScriptNode: article?.querySelector('script') !== null,
        hasEscapedScriptLiteral: innerHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;') || textContent.includes('<script>alert(1)</script>'),
        hasPromptInjectionLiteral: textContent.includes('ignore previous instructions'),
        rawLatexVisible: textContent.includes('$$\\\\dfrac{1}{2}$'),
      };
    })()`,
  );
  assertOk(facts['hasRawScriptNode'] === false, `${viewport.name}: malformed literal response rendered a script node`);
  assertOk(
    facts['hasEscapedScriptLiteral'] === true,
    `${viewport.name}: malformed literal response lost escaped script text`,
  );
  assertOk(
    facts['hasPromptInjectionLiteral'] === true,
    `${viewport.name}: malformed literal response lost prompt-injection literal`,
  );
  assertOk(facts['rawLatexVisible'] === true, `${viewport.name}: malformed LaTeX should stay visible as literal text`);
  lines.push(`${viewport.name}: malformed LaTeX and script-like text stayed literal`);
}
