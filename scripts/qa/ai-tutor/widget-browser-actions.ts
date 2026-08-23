import { delay, type CdpClient } from '../summer-5week-demo-cdp';
import { evaluate, evaluateBoolean, evaluateObject } from './browser-qa-core';

export async function sendTutorMessage(cdp: CdpClient, message: string): Promise<void> {
  await evaluate(cdp, `
    (() => {
      const input = document.getElementById('ai-tutor-message');
      if (!(input instanceof HTMLTextAreaElement)) throw new Error('tutor input missing');
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) throw new Error('textarea setter missing');
      setter.call(input, ${JSON.stringify(message)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const button = document.querySelector('button[aria-label=\\"AI 튜터 질문 보내기\\"]');
      if (!(button instanceof HTMLButtonElement)) throw new Error('send button missing');
      button.click();
    })()
  `);
}

export async function waitForSelector(cdp: CdpClient, selector: string, label: string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluateBoolean(cdp, `document.querySelector(${JSON.stringify(selector)}) !== null`)) return;
    await delay(100);
  }
  const debug = await evaluateObject(
    cdp,
    `(() => ({ url: location.href, text: document.body.innerText, html: document.body.innerHTML.slice(0, 500) }))()`,
  );
  throw new Error(`${label}: timed out waiting for ${selector}; debug=${JSON.stringify(debug)}`);
}

export async function waitForDisabledSend(cdp: CdpClient): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (
      await evaluateBoolean(
        cdp,
        'document.querySelector("button[aria-label=\\"AI 튜터 질문 보내기\\"]")?.disabled === true',
      )
    ) {
      return;
    }
    await delay(50);
  }
  throw new Error('send button did not enter disabled loading state');
}
