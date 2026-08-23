import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ds2AssignedOnlyBrowserFixture,
  ds2AssignedAltBrowserFixture,
  ghMidtermBrowserFixture,
  ds2AssignedOnlyPdfHrefBaseline,
  gs2MidtermBrowserFixture,
  gs2MidtermPdfHrefBaseline,
  mj1MidtermBrowserFixture,
} from './widget-browser-fixtures';

test('GS2 browser fixture preserves the six released material labels in source order', () => {
  assert.deepEqual(
    gs2MidtermBrowserFixture.materials.map((material) => material.label),
    ['레벨4-2', '심화유형 1단계', '심화유형 2단계', '심화유형 3단계', '레벨5', '유형 올 스캔'],
  );
  assert.deepEqual(gs2MidtermBrowserFixture.materials.map((material) => material.order), [1, 2, 3, 4, 5, 6]);
  assert.equal(gs2MidtermBrowserFixture.materials.some((material) => material.label.startsWith('학습지')), false);
});

test('DS2 browser fixture contains only the assigned nested-side materials', () => {
  assert.deepEqual(
    ds2AssignedOnlyBrowserFixture.materials.map((material) => [material.materialKey, material.label, material.sideLabel]),
    [['m-1-side-a-pdf', '심화유형 3단계', 'A'], ['m-1-side-b-pdf', '심화유형 3단계', 'B']],
  );
  assert.deepEqual(
    ds2AssignedAltBrowserFixture.materials.map((material) => [material.materialKey, material.label, material.sideLabel]),
    [['ds2-alt-side-a-pdf', '레벨4-2', 'A'], ['ds2-alt-side-b-pdf', '레벨4-2', 'B']],
  );
  assert.equal(ds2AssignedOnlyBrowserFixture.materials.some((material) => material.materialKey.includes('content-pdf')), false);
});

test('MJ1 and GH browser fixtures preserve six released material labels in source order', () => {
  const labels = ['레벨4-2', '심화유형 1단계', '심화유형 2단계', '심화유형 3단계', '레벨5', '유형 올 스캔'];
  assert.deepEqual(mj1MidtermBrowserFixture.materials.map((material) => material.label), labels);
  assert.deepEqual(ghMidtermBrowserFixture.materials.map((material) => material.label), labels);
  assert.equal(mj1MidtermBrowserFixture.unit, '함수의 극한');
  assert.equal(ghMidtermBrowserFixture.unit, '이차곡선');
});

test('fixture PDF baselines carry one byte-exact browser-open and download href per material', () => {
  assert.equal(gs2MidtermPdfHrefBaseline.open.length, gs2MidtermBrowserFixture.materials.length);
  assert.equal(gs2MidtermPdfHrefBaseline.download.length, gs2MidtermBrowserFixture.materials.length);
  assert.equal(ds2AssignedOnlyPdfHrefBaseline.open.length, ds2AssignedOnlyBrowserFixture.materials.length);
  assert.equal(ds2AssignedOnlyPdfHrefBaseline.download.length, ds2AssignedOnlyBrowserFixture.materials.length);
  assert.equal(gs2MidtermPdfHrefBaseline.open.every((href, index) => href === gs2MidtermBrowserFixture.materials[index]?.pdfHref), true);
  assert.equal(gs2MidtermPdfHrefBaseline.download.every((href) => href.startsWith('/api/public/pdf-download?url=https%3A%2F%2F')), true);
});
