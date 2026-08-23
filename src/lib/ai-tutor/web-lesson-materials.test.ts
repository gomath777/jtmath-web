import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  authorizeWebLessonMaterial,
  getWebLessonMaterialDescriptors,
  parseWebLessonPdfMaterials,
  resolveWebLessonContext,
  type WebLessonSessionBlock,
} from './web-lesson-context';
import {
  activeToken,
  baseIdentity,
  blocks,
  fakePort,
  lesson,
  now,
  releasedAssignment,
} from './web-lesson-context.test-support';

test('resolveWebLessonContext preserves the exact trigonometry material surface while making context assignment-bound', async () => {
  // Given
  const port = fakePort({ lesson, token: activeToken, assignments: [releasedAssignment], blocksByVariant: { honors: blocks } });

  // When
  const result = await resolveWebLessonContext({ port, identity: baseIdentity, lessonSlug: lesson.publicSlug, now });

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail('Expected context resolution to succeed');
  assert.match(result.context.contextKey, /^ctx_[A-Za-z0-9_-]{20,}$/);
  assert.deepEqual(result.context.materials, [
    { materialKey: 'm-1-content-pdfs-0', level: 1, label: '삼각함수 기출', fileName: '삼각함수 레벨1.pdf', order: 1 },
    { materialKey: 'm-1-content-pdfs-1', level: 2, label: '삼각함수 기출', fileName: '삼각함수 레벨2.pdf', order: 2 },
    { materialKey: 'm-1-content-pdfs-2', level: 3, label: '삼각함수 기출', fileName: '삼각함수 레벨3.pdf', order: 3 },
    { materialKey: 'm-1-content-pdfs-3', level: 41, label: '삼각함수 기출', fileName: '삼각함수 레벨4-1.pdf', order: 4 },
    { materialKey: 'm-1-content-pdfs-4', level: 42, label: '삼각함수 기출', fileName: '삼각함수 레벨4-2.pdf', order: 5 },
    { materialKey: 'm-1-content-pdfs-5', level: 99, label: '삼각함수 기출', fileName: '올스캔 #1 합성 모의.pdf', order: 6 },
  ]);
  assert.deepEqual(
    getWebLessonMaterialDescriptors(result).map((material) => [material.level, material.fileName, material.url]),
    [
      [1, '삼각함수 레벨1.pdf', 'https://cdn.example.invalid/lv1.pdf'],
      [2, '삼각함수 레벨2.pdf', 'https://cdn.example.invalid/lv2.pdf'],
      [3, '삼각함수 레벨3.pdf', 'https://cdn.example.invalid/lv3.pdf'],
      [41, '삼각함수 레벨4-1.pdf', 'https://cdn.example.invalid/lv4-1.pdf'],
      [42, '삼각함수 레벨4-2.pdf', 'https://cdn.example.invalid/lv4-2.pdf'],
      [99, '올스캔 #1 합성 모의.pdf', 'https://cdn.example.invalid/allscan.pdf'],
    ],
  );
});

test('resolveWebLessonContext serializes no profile assignment token or raw URL data', async () => {
  // Given
  const port = fakePort({ lesson, token: activeToken, assignments: [releasedAssignment], blocksByVariant: { honors: blocks } });

  // When
  const result = await resolveWebLessonContext({ port, identity: baseIdentity, lessonSlug: lesson.publicSlug, now });

  // Then
  assert.equal(result.ok, true);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(baseIdentity.profileId), false);
  assert.equal(serialized.includes(releasedAssignment.id), false);
  assert.equal(serialized.includes('https://cdn.example.invalid'), false);
  assert.equal(serialized.includes(activeToken.id), false);
});

test('resolveWebLessonContext falls back to default blocks only when assigned variant is empty', async () => {
  // Given
  const port = fakePort({
    lesson,
    token: activeToken,
    assignments: [releasedAssignment],
    blocksByVariant: { default: blocks },
  });

  // When
  const result = await resolveWebLessonContext({ port, identity: baseIdentity, lessonSlug: lesson.publicSlug, now });

  // Then
  assert.equal(result.ok, true);
  assert.deepEqual(port.calls.slice(-2), ['session_blocks:honors', 'session_blocks:default']);
});

test('parseWebLessonPdfMaterials requires unique exact level 1 through 3 filenames', () => {
  // Given
  const duplicateBlocks: readonly WebLessonSessionBlock[] = [
    ...blocks,
    {
      id: 'block-trig-duplicate',
      blockType: 'content_group',
      orderIndex: 2,
      variant: 'honors',
      content: {
        pdf: { original_name: '삼각함수 레벨1.pdf', url: 'https://cdn.example.invalid/dupe.pdf' },
      },
    },
  ];

  // When
  const result = parseWebLessonPdfMaterials(duplicateBlocks);

  // Then
  assert.deepEqual(result, { ok: false, reason: 'duplicate_pdf' });
});

test('parseWebLessonPdfMaterials rejects absent PDFs and incomplete vertical slice PDFs as missing_pdf', () => {
  // Given
  const absent: readonly WebLessonSessionBlock[] = [{ ...blocks[0], content: { label: 'no pdf here' } }];
  const incomplete: readonly WebLessonSessionBlock[] = [
    {
      ...blocks[0],
      content: {
        pdf: { original_name: '삼각함수 레벨4-1.pdf', url: 'https://cdn.example.invalid/lv4.pdf' },
      },
    },
  ];

  // When
  const absentResult = parseWebLessonPdfMaterials(absent);
  const incompleteResult = parseWebLessonPdfMaterials(incomplete);

  // Then
  assert.deepEqual(absentResult, { ok: false, reason: 'missing_pdf' });
  assert.deepEqual(incompleteResult, { ok: false, reason: 'missing_pdf' });
});

test('raw material descriptor extraction cannot import without react-server condition', () => {
  // Given
  const probe = "require('tsx/cjs'); require('./src/lib/ai-tutor/web-lesson-context-core.ts')";

  // When
  const result = spawnSync(process.execPath, ['-e', probe], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  // Then
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}${result.stdout}`, /Server Component/);
});

test('resolveWebLessonContext returns source_error when the query port reports a source failure', async () => {
  // Given
  const port = fakePort({
    lesson,
    token: activeToken,
    assignments: [releasedAssignment],
    blocksByVariant: { honors: blocks },
    failOperation: 'loadSessionBlocks',
  });

  // When
  const result = await resolveWebLessonContext({ port, identity: baseIdentity, lessonSlug: lesson.publicSlug, now });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'source_error' });
});

test('Given a six-block released GS2 page When resolving Then client materials retain source order without server fields', async () => {
  // Given
  const sharedBlocks: readonly WebLessonSessionBlock[] = [
    { id: 'block-gs2-1', blockType: 'content_group', orderIndex: 1, variant: 'default', content: { label: '레벨4-2', pdf: { original_name: '직선의 방정식 레벨4-2.pdf', url: 'https://cdn.example.invalid/gs2-1.pdf', source_hash: 'a'.repeat(64) } } },
    { id: 'block-gs2-2', blockType: 'content_group', orderIndex: 2, variant: 'default', content: { label: '심화유형 1단계', pdf: { original_name: '직선의 방정식 심화유형 1단계.pdf', url: 'https://cdn.example.invalid/gs2-2.pdf' } } },
    { id: 'block-gs2-3', blockType: 'content_group', orderIndex: 3, variant: 'default', content: { label: '심화유형 2단계', pdf: { original_name: '직선의 방정식 심화유형 2단계.pdf', url: 'https://cdn.example.invalid/gs2-3.pdf' } } },
    { id: 'block-gs2-4', blockType: 'content_group', orderIndex: 4, variant: 'default', content: { label: '심화유형 3단계', pdf: { original_name: '직선의 방정식 심화유형 3단계.pdf', url: 'https://cdn.example.invalid/gs2-4.pdf' } } },
    { id: 'block-gs2-5', blockType: 'content_group', orderIndex: 5, variant: 'default', content: { label: '레벨5', pdf: { original_name: '직선의 방정식 레벨5.pdf', url: 'https://cdn.example.invalid/gs2-5.pdf' } } },
    { id: 'block-gs2-6', blockType: 'content_group', orderIndex: 6, variant: 'default', content: { label: '유형 올스캔', pdf: { original_name: '직선의 방정식 유형 올스캔.pdf', url: 'https://cdn.example.invalid/gs2-6.pdf' } } },
  ];
  const sharedLesson = {
    id: 'item-gs2-midterm',
    publicSlug: 'gs2-midterm-2026-w1s2-plane-line',
    title: '직선의 방정식',
    label: null,
    curricula: { subjectSlug: 'gs2', title: '공통수학2' },
  } as const;
  const assignment = {
    id: 'assignment-gs2', curriculumItemId: sharedLesson.id, profileId: baseIdentity.profileId,
    status: 'released' as const, scheduledDate: '2026-08-20', releasedAt: '2026-08-20T09:00:00.000Z', variant: 'default',
  };
  const port = fakePort({ lesson: sharedLesson, token: activeToken, assignments: [assignment], blocksByVariant: { default: sharedBlocks } });

  // When
  const result = await resolveWebLessonContext({ port, identity: baseIdentity, lessonSlug: sharedLesson.publicSlug, now });

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail('Expected the released GS2 shared page to resolve');
  assert.deepEqual(result.context.materials.map((material) => ({ materialKey: material.materialKey, label: material.label, fileName: material.fileName, order: material.order })), [
    { materialKey: 'm-1-content-pdf', label: '레벨4-2', fileName: '직선의 방정식 레벨4-2.pdf', order: 1 },
    { materialKey: 'm-2-content-pdf', label: '심화유형 1단계', fileName: '직선의 방정식 심화유형 1단계.pdf', order: 2 },
    { materialKey: 'm-3-content-pdf', label: '심화유형 2단계', fileName: '직선의 방정식 심화유형 2단계.pdf', order: 3 },
    { materialKey: 'm-4-content-pdf', label: '심화유형 3단계', fileName: '직선의 방정식 심화유형 3단계.pdf', order: 4 },
    { materialKey: 'm-5-content-pdf', label: '레벨5', fileName: '직선의 방정식 레벨5.pdf', order: 5 },
    { materialKey: 'm-6-content-pdf', label: '유형 올스캔', fileName: '직선의 방정식 유형 올스캔.pdf', order: 6 },
  ]);
  const serialized = JSON.stringify(result.context);
  assert.equal(serialized.includes('block-gs2'), false);
  assert.equal(serialized.includes('https://cdn.example.invalid'), false);
  assert.equal(serialized.includes('source_hash'), false);
  assert.equal(serialized.includes('assignment-gs2'), false);
});

test('Given nested sides and two distinct DS2 assignments When resolving Then materials and context authorization remain assignment-bound', async () => {
  // Given
  const profileA = { profileId: 'profile-ds2-a', slug: 'ds2-a', isMaster: false } as const;
  const profileB = { profileId: 'profile-ds2-b', slug: 'ds2-b', isMaster: false } as const;
  const lessonA = { id: 'item-ds2-a', publicSlug: 'ds2-assigned-a', title: '다항식', label: null, curricula: { subjectSlug: 'ds2', title: '대수' } } as const;
  const lessonB = { id: 'item-ds2-b', publicSlug: 'ds2-assigned-b', title: '함수', label: null, curricula: { subjectSlug: 'ds2', title: '대수' } } as const;
  const assignmentA = { id: 'assignment-ds2-a', curriculumItemId: lessonA.id, profileId: profileA.profileId, status: 'released' as const, scheduledDate: '2026-08-20', releasedAt: '2026-08-20T09:00:00.000Z', variant: 'honors' };
  const assignmentB = { id: 'assignment-ds2-b', curriculumItemId: lessonB.id, profileId: profileB.profileId, status: 'released' as const, scheduledDate: '2026-08-20', releasedAt: '2026-08-20T09:00:00.000Z', variant: 'honors' };
  const nestedSides: readonly WebLessonSessionBlock[] = [{
    id: 'block-ds2-a', blockType: 'content_group', orderIndex: 1, variant: 'honors', content: {
      label: '심화유형 3단계',
      side_a: { label: 'A', pdf: { original_name: '다항식 심화유형 3단계 A.pdf', url: 'https://cdn.example.invalid/ds2-a.pdf' } },
      side_b: { label: 'B', pdf: { original_name: '다항식 심화유형 3단계 B.pdf', url: 'https://cdn.example.invalid/ds2-b.pdf' } },
    },
  }];
  const singlePdf: readonly WebLessonSessionBlock[] = [{ id: 'block-ds2-b', blockType: 'content_group', orderIndex: 1, variant: 'honors', content: { label: '레벨5', pdfs: [{ original_name: '함수 레벨5.pdf', url: 'https://cdn.example.invalid/ds2-c.pdf' }] } }];
  const resultA = await resolveWebLessonContext({
    port: fakePort({ lesson: lessonA, token: { ...activeToken, profileId: profileA.profileId, slug: profileA.slug }, assignments: [assignmentA], blocksByVariant: { honors: nestedSides } }),
    identity: profileA, lessonSlug: lessonA.publicSlug, now,
  });
  const resultB = await resolveWebLessonContext({
    port: fakePort({ lesson: lessonB, token: { ...activeToken, profileId: profileB.profileId, slug: profileB.slug }, assignments: [assignmentB], blocksByVariant: { honors: singlePdf } }),
    identity: profileB, lessonSlug: lessonB.publicSlug, now,
  });

  // When
  const crossProfile = resultA.ok && resultB.ok
    ? authorizeWebLessonMaterial({ result: resultB, contextKey: resultA.context.contextKey, materialKey: resultA.context.materials[0]?.materialKey ?? '' })
    : null;
  const forgedMaterial = resultB.ok
    ? authorizeWebLessonMaterial({ result: resultB, contextKey: resultB.context.contextKey, materialKey: 'm-1-side-a-pdf' })
    : null;

  // Then
  assert.equal(resultA.ok, true);
  assert.equal(resultB.ok, true);
  if (!resultA.ok || !resultB.ok) assert.fail('Expected each assigned DS2 lesson to resolve');
  assert.deepEqual(resultA.context.materials.map((material) => [material.materialKey, material.sideLabel]), [['m-1-side-a-pdf', 'A'], ['m-1-side-b-pdf', 'B']]);
  assert.notEqual(resultA.context.contextKey, resultB.context.contextKey);
  assert.deepEqual(crossProfile, { ok: false, reason: 'stale_context' });
  assert.deepEqual(forgedMaterial, { ok: false, reason: 'forged_material' });
});

test('Given malformed and colliding material shapes When parsing Then the resolver fails with stable source or duplicate codes', () => {
  // Given
  const malformed: readonly WebLessonSessionBlock[] = [{ id: 'block-malformed', blockType: 'content_group', orderIndex: 1, variant: 'default', content: { pdfs: 'not-an-array' } }];
  const nestedCollision: readonly WebLessonSessionBlock[] = [
    { id: 'block-side-a', blockType: 'content_group', orderIndex: 1, variant: 'default', content: { side_a: { pdf: { original_name: 'a.pdf', url: 'https://cdn.example.invalid/a.pdf' } } } },
    { id: 'block-side-a-duplicate', blockType: 'content_group', orderIndex: 1, variant: 'default', content: { side_a: { pdf: { original_name: 'b.pdf', url: 'https://cdn.example.invalid/b.pdf' } } } },
  ];

  // When
  const malformedResult = parseWebLessonPdfMaterials(malformed);
  const collisionResult = parseWebLessonPdfMaterials(nestedCollision);

  // Then
  assert.deepEqual(malformedResult, { ok: false, reason: 'source_error' });
  assert.deepEqual(collisionResult, { ok: false, reason: 'duplicate_pdf' });
});

test('Given identical material sets under a changed assigned variant When resolving Then context keys are deterministic and stale', async () => {
  // Given
  const variantBlocks: readonly WebLessonSessionBlock[] = [{ id: 'block-variant', blockType: 'content_group', orderIndex: 1, variant: 'honors', content: { pdf: { original_name: 'assigned.pdf', url: 'https://cdn.example.invalid/assigned.pdf' } } }];
  const honors = { ...releasedAssignment, variant: 'honors' };
  const revised = { ...releasedAssignment, variant: 'revised' };
  const first = await resolveWebLessonContext({ port: fakePort({ lesson, token: activeToken, assignments: [honors], blocksByVariant: { honors: variantBlocks } }), identity: baseIdentity, lessonSlug: lesson.publicSlug, now });
  const repeat = await resolveWebLessonContext({ port: fakePort({ lesson, token: activeToken, assignments: [honors], blocksByVariant: { honors: variantBlocks } }), identity: baseIdentity, lessonSlug: lesson.publicSlug, now });
  const changed = await resolveWebLessonContext({ port: fakePort({ lesson, token: activeToken, assignments: [revised], blocksByVariant: { revised: variantBlocks } }), identity: baseIdentity, lessonSlug: lesson.publicSlug, now });

  // When
  const stale = first.ok && changed.ok
    ? authorizeWebLessonMaterial({ result: changed, contextKey: first.context.contextKey, materialKey: first.context.materials[0]?.materialKey ?? '' })
    : null;

  // Then
  assert.equal(first.ok, true);
  assert.equal(repeat.ok, true);
  assert.equal(changed.ok, true);
  if (!first.ok || !repeat.ok || !changed.ok) assert.fail('Expected synthetic assignment variants to resolve');
  assert.equal(first.context.contextKey, repeat.context.contextKey);
  assert.notEqual(first.context.contextKey, changed.context.contextKey);
  assert.deepEqual(stale, { ok: false, reason: 'stale_context' });
});
