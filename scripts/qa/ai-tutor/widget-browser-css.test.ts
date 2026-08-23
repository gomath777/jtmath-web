import test from 'node:test';
import assert from 'node:assert/strict';
import { productKatexCss, qaCss } from './browser-qa-css';

test('Given the deterministic browser harness CSS, When it is generated, Then it excludes product KaTeX delivery', () => {
  const css = qaCss();

  assert.match(css, /fieldset\s*{\s*margin:\s*0;\s*padding:\s*0;[\s\S]*?}/);
  assert.match(css, /legend\s*{\s*padding:\s*0;[\s\S]*?}/);
  assert.match(css, /\.self-end\s*{\s*align-self:\s*flex-end;\s*}/);
  assert.match(css, /\.max-w-\\\[85\\%\\\]\s*{\s*max-width:\s*85%;\s*}/);
  assert.match(css, /\.bg-white\\\/70\s*{\s*background:\s*rgba\(250,\s*249,\s*245,\s*\.7\);\s*}/);
  assert.doesNotMatch(css, /font-family:KaTeX_Main/);
  assert.doesNotMatch(css, /url\(data:font\/woff2;base64,/);
  assert.doesNotMatch(css, /\.katex \.mfrac/);
  assert.match(css, /\.katex-mathml/);
});

test('Given browser rendering needs KaTeX, When its product-style fixture is requested, Then vendor rules are explicit and separate', () => {
  const css = productKatexCss();

  assert.match(css, /font-family:KaTeX_Main/);
  assert.match(css, /url\(data:font\/woff2;base64,/);
  assert.match(css, /\.katex \.mfrac/);
  assert.match(css, /\.katex \.mfrac \.frac-line/);
  assert.match(css, /\.katex \.sqrt>\.katex-root/);
});
