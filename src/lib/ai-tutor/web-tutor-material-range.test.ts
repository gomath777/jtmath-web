import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWebTutorMaterials } from './web-tutor-material-range';

const descriptor = {
  materialKey: 'synthetic-material',
  label: 'synthetic label',
  level: 41,
  blockId: 'synthetic-block',
  sourcePath: 'content.pdf',
  sourceHash: null,
  url: 'https://example.invalid/synthetic.pdf',
  fileName: 'synthetic.pdf',
  order: 1,
  sideLabel: null,
  subjectSlug: 'ds2',
  unit: 'synthetic',
  variant: 'synthetic',
} as const;

test('Given an unregistered rollout material When resolving web tutor ranges Then it fails closed rather than using a filename or client range', () => {
  const result = resolveWebTutorMaterials({ lessonSlug: 'gs2-midterm-2026-w1s2-plane-line', descriptors: [descriptor] });

  assert.equal(result.ok, false);
});

test('Given a registered GS2 session-2 material When resolving web tutor ranges Then the catalog problem count is used', () => {
  const result = resolveWebTutorMaterials({
    lessonSlug: 'gs2-midterm-2026-w1s2-plane-line',
    descriptors: [{
      ...descriptor,
      materialKey: 'm-1-content-pdf',
      subjectSlug: 'gs2',
      label: '레벨4-2',
      fileName: '직선의 방정식 레벨4-2.pdf',
      level: 42,
    }],
  });

  assert.deepEqual(result, {
    ok: true,
    materials: [{ materialKey: 'm-1-content-pdf', label: '레벨4-2', problemRange: { first: 1, last: 7 } }],
  });
});

test('Given the narrow legacy tutor route When resolving web tutor ranges Then only server descriptors become material-key ranges', () => {
  const result = resolveWebTutorMaterials({ lessonSlug: 'ds2-trig', descriptors: [descriptor] });

  assert.deepEqual(result, {
    ok: true,
    materials: [{ materialKey: 'synthetic-material', label: 'synthetic label', problemRange: { first: 1, last: 99 } }],
  });
});
