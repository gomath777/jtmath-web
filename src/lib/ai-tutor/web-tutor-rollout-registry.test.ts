import assert from 'node:assert/strict';
import test from 'node:test';
import ds2Catalog from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/catalog.json';
import ghCatalog from '../../data/ai-tutor-guides/2026-midterm-w1s2/gh/catalog.json';
import gs2Catalog from '../../data/ai-tutor-guides/2026-midterm-w1s2/gs2/catalog.json';
import mj1Catalog from '../../data/ai-tutor-guides/2026-midterm-w1s2/mj1/catalog.json';
import {
  defaultWebTutorRolloutCatalogEntries,
  resolveRegisteredWebTutorMaterials,
  resolveRegisteredWebTutorTarget,
} from './web-tutor-rollout-registry';
import type { WebLessonMaterialDescriptor } from './web-lesson-context';

const subjectCatalogs = [
  { subject: 'gs2', slug: 'gs2-midterm-2026-w1s2-plane-line', catalog: gs2Catalog },
  { subject: 'mj1', slug: 'mj1-midterm-2026-w1s2-limit', catalog: mj1Catalog },
  { subject: 'gh', slug: 'gh-midterm-2026-w1s2-conic', catalog: ghCatalog },
  { subject: 'ds2', slug: 'synthetic-ds2-a', catalog: ds2Catalog },
] as const;

test('Given generated session-2 catalogs When the rollout registry is loaded Then every verified manifest entry is registered once', () => {
  // Given
  const expectedCount = subjectCatalogs.reduce((total, item) => total + item.catalog.entries.length, 0);
  const generatedMaterialCounts = subjectCatalogs.map((item) => item.catalog.materials.length);

  // When
  const entries = defaultWebTutorRolloutCatalogEntries();
  const keys = new Set(entries.map((entry) => entry.manifestKey));

  // Then
  assert.deepEqual(generatedMaterialCounts, [6, 6, 6, 15]);
  assert.equal(entries.length, expectedCount);
  assert.equal(keys.size, expectedCount);
  assert.equal(entries.every((entry) => entry.status === 'verified'), true);
});

test('Given three shared subjects and two DS2 materials When descriptors resolve Then targets come from the generated catalog registry', () => {
  // Given
  const cases = [
    { subject: 'gs2', slug: 'gs2-midterm-2026-w1s2-plane-line', materialIndex: 0, problemNumber: 2 },
    { subject: 'mj1', slug: 'mj1-midterm-2026-w1s2-limit', materialIndex: 0, problemNumber: 2 },
    { subject: 'gh', slug: 'gh-midterm-2026-w1s2-conic', materialIndex: 0, problemNumber: 2 },
    { subject: 'ds2', slug: 'synthetic-ds2-a', materialIndex: 0, problemNumber: 2 },
    { subject: 'ds2', slug: 'synthetic-ds2-b', materialIndex: 10, problemNumber: 2 },
  ] as const;

  // When
  const resolved = cases.map((item) => {
    const catalog = subjectCatalogs.find((candidate) => candidate.subject === item.subject)?.catalog;
    assert.ok(catalog);
    const material = catalog.materials[item.materialIndex];
    assert.ok(material);
    const descriptor = descriptorFor({ subject: item.subject, material });
    return resolveRegisteredWebTutorTarget({
      lessonSlug: item.slug,
      descriptor,
      problemNumber: item.problemNumber,
    });
  });

  // Then
  assert.deepEqual(
    resolved.map((target) => target?.lessonKey),
    [
      'gs2-line-level4-2',
      'mj1-limit-level42',
      'gh-level42',
      'ds2-shimhwa-06-d9d616-b150aa4fab8e',
      'ds2-shimhwa-03-0240bd-65d0f3493e98',
    ],
  );
});

test('Given a generated shared catalog When material ranges resolve Then all six choices stay material-key scoped', () => {
  // Given
  const descriptors = mj1Catalog.materials.map((material) => descriptorFor({ subject: 'mj1', material }));

  // When
  const result = resolveRegisteredWebTutorMaterials({
    lessonSlug: 'mj1-midterm-2026-w1s2-limit',
    descriptors,
  });

  // Then
  assert.equal(result?.length, 6);
  assert.deepEqual(result?.map((material) => material.materialKey), mj1Catalog.materials.map((material) => material.materialKey));
  assert.equal(result?.every((material) => material.problemRange.first === 1), true);
});

test('Given current GS2 live descriptors When material ranges resolve Then exact zero-based filenames map to verified guides', () => {
  // Given
  const descriptors = currentGs2LiveDescriptors();

  // When
  const ranges = resolveRegisteredWebTutorMaterials({
    lessonSlug: 'gs2-midterm-2026-w1s2-plane-line',
    descriptors,
  });
  const firstTarget = resolveRegisteredWebTutorTarget({
    lessonSlug: 'gs2-midterm-2026-w1s2-plane-line',
    descriptor: descriptors[0],
    problemNumber: 2,
  });

  // Then
  assert.equal(ranges?.length, 6);
  assert.deepEqual(ranges?.map((material) => material.materialKey), ['m-0-content-pdf', 'm-1-content-pdf', 'm-2-content-pdf', 'm-3-content-pdf', 'm-4-content-pdf', 'm-5-content-pdf']);
  assert.equal(firstTarget?.lessonKey, 'gs2-line-level4-2');
  assert.equal(firstTarget?.problemNumber, 2);
});

test('Given forged GS2 live aliases When subject or source hash drifts Then registry fails closed', () => {
  // Given
  const [firstDescriptor] = currentGs2LiveDescriptors();
  assert.ok(firstDescriptor);

  // When
  const forgedSubject = resolveRegisteredWebTutorTarget({
    lessonSlug: 'mj1-midterm-2026-w1s2-limit',
    descriptor: { ...firstDescriptor, subjectSlug: 'mj1' },
    problemNumber: 2,
  });
  const forgedHash = resolveRegisteredWebTutorTarget({
    lessonSlug: 'gs2-midterm-2026-w1s2-plane-line',
    descriptor: { ...firstDescriptor, sourceHash: '0'.repeat(64) },
    problemNumber: 2,
  });

  // Then
  assert.equal(forgedSubject, undefined);
  assert.equal(forgedHash, undefined);
});

test('Given live-shaped generated keys When shared and DS2 first materials resolve Then same-subject filename fallback wins', () => {
  // Given
  const cases = [
    { subject: 'gs2', slug: 'gs2-midterm-2026-w1s2-plane-line', catalog: gs2Catalog, lessonKey: 'gs2-line-level4-2' },
    { subject: 'mj1', slug: 'mj1-midterm-2026-w1s2-limit', catalog: mj1Catalog, lessonKey: 'mj1-limit-level42' },
    { subject: 'gh', slug: 'gh-midterm-2026-w1s2-conic', catalog: ghCatalog, lessonKey: 'gh-level42' },
    { subject: 'ds2', slug: 'synthetic-ds2-a', catalog: ds2Catalog, lessonKey: 'ds2-shimhwa-06-d9d616-b150aa4fab8e' },
  ] as const;

  // When
  const resolved = cases.map((item) => {
    const material = item.catalog.materials[0];
    assert.ok(material);
    return resolveRegisteredWebTutorTarget({
      lessonSlug: item.slug,
      descriptor: liveDescriptorFor({ subject: item.subject, material, orderIndex: 1, sourceHash: null }),
      problemNumber: 2,
    });
  });

  // Then
  assert.deepEqual(resolved.map((target) => target?.lessonKey), cases.map((item) => item.lessonKey));
});

test('Given duplicate allscan filenames across subjects When live descriptors resolve Then subject filtering removes global ambiguity', () => {
  // Given
  const mj1Allscan = mj1Catalog.materials[5];
  const ghAllscan = ghCatalog.materials[5];
  assert.ok(mj1Allscan);
  assert.ok(ghAllscan);
  assert.equal(mj1Allscan.fileName, ghAllscan.fileName);

  // When
  const mj1Target = resolveRegisteredWebTutorTarget({
    lessonSlug: 'mj1-midterm-2026-w1s2-limit',
    descriptor: liveDescriptorFor({ subject: 'mj1', material: mj1Allscan, orderIndex: 6, sourceHash: null }),
    problemNumber: 2,
  });
  const ghTarget = resolveRegisteredWebTutorTarget({
    lessonSlug: 'gh-midterm-2026-w1s2-conic',
    descriptor: liveDescriptorFor({ subject: 'gh', material: ghAllscan, orderIndex: 6, sourceHash: null }),
    problemNumber: 2,
  });

  // Then
  assert.equal(mj1Target?.lessonKey, 'mj1-limit-allscan');
  assert.equal(ghTarget?.lessonKey, 'gh-allscan');
});

test('Given forged slug or hash When live descriptor resolves Then registry fails closed', () => {
  // Given
  const mj1Material = mj1Catalog.materials[0];
  const gs2Material = gs2Catalog.materials[0];
  assert.ok(mj1Material);
  assert.ok(gs2Material);
  const wrongHash = sourceHashFor(gs2Catalog, gs2Material.worksheetKey);

  // When
  const wrongSlug = resolveRegisteredWebTutorTarget({
    lessonSlug: 'gs2-midterm-2026-w1s2-plane-line',
    descriptor: liveDescriptorFor({ subject: 'mj1', material: mj1Material, orderIndex: 1, sourceHash: null }),
    problemNumber: 2,
  });
  const wrongHashTarget = resolveRegisteredWebTutorTarget({
    lessonSlug: 'mj1-midterm-2026-w1s2-limit',
    descriptor: liveDescriptorFor({
      subject: 'mj1',
      material: mj1Material,
      orderIndex: 1,
      sourceHash: wrongHash,
      materialKey: 'forged-mj1-key',
    }),
    problemNumber: 2,
  });

  // Then
  assert.equal(wrongSlug, undefined);
  assert.equal(wrongHashTarget, undefined);
});

function descriptorFor(input: Readonly<{
  readonly subject: 'gs2' | 'mj1' | 'gh' | 'ds2';
  readonly material: Readonly<{ readonly materialKey: string; readonly fileName: string }>;
}>): WebLessonMaterialDescriptor {
  return {
    materialKey: input.material.materialKey,
    blockId: `block-${input.material.materialKey}`,
    sourcePath: 'content.pdf',
    sourceHash: null,
    label: input.material.fileName.replace(/\.pdf$/, ''),
    order: 1,
    sideLabel: null,
    subjectSlug: input.subject,
    unit: input.subject,
    variant: 'default',
    level: 1,
    fileName: input.material.fileName,
    url: `https://mathgo-pdfs.b-cdn.net/${input.material.materialKey}.pdf`,
  };
}

function liveDescriptorFor(input: Readonly<{
  readonly subject: 'gs2' | 'mj1' | 'gh' | 'ds2';
  readonly material: Readonly<{ readonly fileName: string }>;
  readonly orderIndex: number;
  readonly sourceHash: string | null;
  readonly materialKey?: string;
}>): WebLessonMaterialDescriptor {
  const materialKey = input.materialKey ?? `m-${input.orderIndex}-content-pdf`;
  return {
    materialKey,
    blockId: `block-${materialKey}`,
    sourcePath: 'content.pdf',
    sourceHash: input.sourceHash,
    label: input.material.fileName.replace(/\.pdf$/, ''),
    order: input.orderIndex - 1,
    sideLabel: null,
    subjectSlug: input.subject,
    unit: input.subject,
    variant: 'default',
    level: 1,
    fileName: input.material.fileName,
    url: `https://mathgo-pdfs.b-cdn.net/${materialKey}.pdf`,
  };
}

function sourceHashFor(
  catalog: Readonly<{ readonly entries: readonly Readonly<{ readonly target: Readonly<{ readonly lessonKey: string }>; readonly problemAsset: Readonly<{ readonly sourceSha256: string }> }>[] }>,
  worksheetKey: string,
): string {
  const entry = catalog.entries.find((candidate) => candidate.target.lessonKey === worksheetKey);
  assert.ok(entry);
  return entry.problemAsset.sourceSha256;
}

function currentGs2LiveDescriptors(): readonly WebLessonMaterialDescriptor[] {
  return [
    liveGs2Descriptor(0, '레벨4-2', '평면좌표 직선의 방정식 레벨4-2.pdf'),
    liveGs2Descriptor(1, '심화유형 1단계', '평면좌표 직선의 방정식 1단계.pdf'),
    liveGs2Descriptor(2, '심화유형 2단계', '평면좌표 직선의 방정식 2단계.pdf'),
    liveGs2Descriptor(3, '심화유형 3단계', '평면좌표 직선의 방정식 3단계.pdf'),
    liveGs2Descriptor(4, '레벨5', '평면좌표 직선의 방정식 레벨5.pdf'),
    liveGs2Descriptor(5, '유형 올 스캔', '올 스캔 중간범위#2.pdf'),
  ];
}

function liveGs2Descriptor(orderIndex: number, label: string, fileName: string): WebLessonMaterialDescriptor {
  const materialKey = `m-${orderIndex}-content-pdf`;
  return {
    materialKey,
    blockId: `block-gs2-current-live-${orderIndex}`,
    sourcePath: 'content.pdf',
    sourceHash: null,
    label,
    order: orderIndex + 1,
    sideLabel: null,
    subjectSlug: 'gs2',
    unit: '평면좌표와 직선의 방정식',
    variant: 'default',
    level: 1,
    fileName,
    url: `https://mathgo-pdfs.b-cdn.net/gs2-current-live-${orderIndex}.pdf`,
  };
}
