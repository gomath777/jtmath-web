import assert from 'node:assert/strict';
import test from 'node:test';
import { assertOk, parseViewports } from './summer-5week-demo-cdp';

test('Given the browser QA viewport contract, When parsing its three viewport values, Then dimensions stay explicit and ordered', () => {
  assert.deepEqual(parseViewports('390x844,768x1024,1280x900'), [
    { name: '390x844', width: 390, height: 844 },
    { name: '768x1024', width: 768, height: 1024 },
    { name: '1280x900', width: 1280, height: 900 },
  ]);
});

test('Given malformed browser viewport input or a failed browser assertion, When the shared QA boundary handles it, Then it fails closed', () => {
  assert.throws(() => parseViewports('390xbroken'), /invalid viewport/);
  assert.throws(() => assertOk(false, 'contract failed'), /contract failed/);
});
