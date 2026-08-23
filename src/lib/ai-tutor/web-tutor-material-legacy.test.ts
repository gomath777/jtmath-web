import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWebTutorAttachment } from './web-tutor-material';
import type { WebTutorLevel } from './web-input';
import type { WebLessonMaterialDescriptor } from './web-lesson-context';

const CURRENT_PDF_BYTES = new TextEncoder().encode('%PDF- current worksheet');

test('Given the owned 4-1 guide target is absent When resolving Then it fails closed without PDF fallback', async () => {
  // Given
  let fetchCalls = 0;
  let loadCalls = 0;

  // When
  const result = await resolveWebTutorAttachment({
    lessonSlug: 'ds2-gichul-03-b1273c',
    materials: [descriptor(41)],
    materialKey: materialKey(41),
    level: 41,
    problemNumber: 7,
    mode: 'hint',
    guideStore: {
      isRegistered: () => false,
      load: async () => {
        loadCalls += 1;
        return { ok: false, reason: 'not_found' };
      },
    },
    problemImageStore: {
      isRegistered: () => false,
      load: async () => ({ ok: false, reason: 'not_found' }),
    },
    fetchPort: {
      fetch: async () => {
        fetchCalls += 1;
        return new Response(new Blob([CURRENT_PDF_BYTES]), {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        });
      },
    },
  });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'registered_guide_unavailable' });
  assert.equal(loadCalls, 0);
  assert.equal(fetchCalls, 0);
});

test('Given the same lesson outside owned 4-1 problems When resolving Then the legacy PDF path remains available', async () => {
  // Given
  let fetchCalls = 0;

  // When
  const result = await resolveWebTutorAttachment({
    lessonSlug: 'ds2-gichul-03-b1273c',
    materials: [descriptor(42)],
    materialKey: materialKey(42),
    level: 42,
    problemNumber: 7,
    mode: 'hint',
    guideStore: {
      isRegistered: () => false,
      load: async () => ({ ok: false, reason: 'not_found' }),
    },
    problemImageStore: {
      isRegistered: () => false,
      load: async () => ({ ok: false, reason: 'not_found' }),
    },
    fetchPort: {
      fetch: async () => {
        fetchCalls += 1;
        return new Response(new Blob([CURRENT_PDF_BYTES]), {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        });
      },
    },
  });

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.attachment.kind, 'pdf');
  assert.equal(fetchCalls, 1);
});

test('Given another eligible trigonometry lesson When a registered guide exists Then the resolver keeps the legacy PDF path', async () => {
  // Given
  let fetchCalls = 0;
  const loadCalls: unknown[] = [];

  // When
  const result = await resolveWebTutorAttachment({
    lessonSlug: 'ds2-trig',
    materials: [descriptor(41)],
    materialKey: materialKey(41),
    level: 41,
    problemNumber: 3,
    mode: 'hint',
    guideStore: {
      isRegistered: () => true,
      load: async (target) => {
        loadCalls.push(target);
        return { ok: false, reason: 'not_found' };
      },
    },
    fetchPort: {
      fetch: async () => {
        fetchCalls += 1;
        return new Response(new Blob([new TextEncoder().encode('%PDF- synthetic')]), {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        });
      },
    },
  });

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(loadCalls, []);
  assert.equal(fetchCalls, 1);
  assert.equal(result.attachment.kind, 'pdf');
  assert.equal(result.guideContext, undefined);
});

function descriptor(level: WebTutorLevel): WebLessonMaterialDescriptor {
  return {
    materialKey: materialKey(level),
    blockId: `block-${level}`,
    sourcePath: 'content.pdf',
    sourceHash: null,
    label: level === 42 ? '레벨4-2' : '레벨4-1',
    order: level,
    sideLabel: null,
    subjectSlug: 'ds2',
    unit: '삼각함수',
    variant: 'default',
    level,
    fileName: level === 42 ? '삼각함수 레벨4-2.pdf' : '삼각함수 레벨4-1.pdf',
    url: `https://mathgo-pdfs.b-cdn.net/lv${level}.pdf`,
  };
}

function materialKey(level: WebTutorLevel): string {
  return `m-${level}`;
}
