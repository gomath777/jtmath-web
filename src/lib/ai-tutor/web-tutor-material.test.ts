import assert from 'node:assert/strict';
import test from 'node:test';
import { preflightRegisteredGuidePdfFreshness, resolveWebTutorAttachment } from './web-tutor-material';
import {
  CURRENT_PDF_BYTES,
  CURRENT_PDF_HASH,
  descriptor,
  materialKey,
  registeredGuideStore,
  sharedDescriptor,
  verifiedGuideStore,
} from './web-tutor-material.test-support';
import type { WebTutorGuideStoreTarget } from './web-tutor-guide-store';
import './web-tutor-material-legacy.test';

test('Given a registered guide bound to the verified catalog When resolving a hint attachment Then its guide projection and problem PNG are returned without fetching PDF bytes', async () => {
  // Given
  let fetchCalls = 0;
  const loadedTargets: WebTutorGuideStoreTarget[] = [];

  // When
  const result = await resolveWebTutorAttachment({
    lessonSlug: 'ds2-gichul-03-b1273c',
    materials: [descriptor(41)],
    materialKey: materialKey(41),
    level: 41,
    problemNumber: 3,
    mode: 'hint',
    guideStore: verifiedGuideStore(loadedTargets, CURRENT_PDF_HASH),
    fetchPort: {
      fetch: async () => {
        fetchCalls += 1;
        return new Response(new Blob([CURRENT_PDF_BYTES]), {
          status: 200,
          headers: { 'content-type': 'application/pdf', 'content-length': String(CURRENT_PDF_BYTES.byteLength) },
        });
      },
    },
  });

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(loadedTargets, [{ lessonKey: 'ds2-trigonometry', level: 41, problemNumber: 3 }]);
  assert.equal(fetchCalls, 0);
  assert.equal(result.attachment.kind, 'image');
  assert.equal(result.attachment.sha256Hex, 'b'.repeat(64));
  assert.deepEqual(result.guideContext?.hints, { concept: 'synthetic concept hint' });
  assert.equal(JSON.stringify(result.guideContext).includes('synthetic answer'), false);
});

test('Given a GS2 session-2 registered material When resolving a hint attachment Then the rollout guide target is used instead of legacy PDF fallback', async () => {
  // Given
  const loadedTargets: WebTutorGuideStoreTarget[] = [];

  // When
  const result = await resolveWebTutorAttachment({
    lessonSlug: 'gs2-midterm-2026-w1s2-plane-line',
    materials: [sharedDescriptor({
      materialKey: 'm-1-content-pdf',
      subjectSlug: 'gs2',
      label: '레벨4-2',
      fileName: '직선의 방정식 레벨4-2.pdf',
      level: 42,
    })],
    materialKey: 'm-1-content-pdf',
    level: 42,
    problemNumber: 2,
    mode: 'hint',
    guideStore: registeredGuideStore({
      loadedTargets,
      lessonKey: 'gs2-line-level4-2',
      level: 44,
      problemNumber: 2,
      sourceHash: CURRENT_PDF_HASH,
    }),
    fetchPort: {
      fetch: async () => new Response(new Blob([CURRENT_PDF_BYTES]), {
        status: 200,
        headers: { 'content-type': 'application/pdf', 'content-length': String(CURRENT_PDF_BYTES.byteLength) },
      }),
    },
  });

  // Then
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(loadedTargets, [{ lessonKey: 'gs2-line-level4-2', level: 44, problemNumber: 2 }]);
  assert.equal(result.attachment.kind, 'image');
  assert.match(result.guideContext?.hints.concept ?? '', /synthetic concept hint/);
});

test('Given a registered guide with crop-bound provenance When preflighting freshness Then changed worksheet bytes fail closed outside chat request path', async () => {
  // Given
  let fetchCalls = 0;
  const loadedTargets: WebTutorGuideStoreTarget[] = [];
  const changedPdfBytes = new TextEncoder().encode('%PDF- changed worksheet');

  const result = await preflightRegisteredGuidePdfFreshness({
    lessonSlug: 'ds2-gichul-03-b1273c',
    materials: [descriptor(41)],
    materialKey: materialKey(41),
    level: 41,
    problemNumber: 3,
    guideStore: verifiedGuideStore(loadedTargets, CURRENT_PDF_HASH),
    fetchPort: {
      fetch: async () => {
        fetchCalls += 1;
        return new Response(new Blob([changedPdfBytes]), {
          status: 200,
          headers: { 'content-type': 'application/pdf', 'content-length': String(changedPdfBytes.byteLength) },
        });
      },
    },
  });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'source_hash_mismatch' });
  assert.deepEqual(loadedTargets, [{ lessonKey: 'ds2-trigonometry', level: 41, problemNumber: 3 }]);
  assert.equal(fetchCalls, 1);
});

test('Given a registered guide and a source PDF timeout When preflighting freshness Then the explicit QA path fails closed', async () => {
  // Given
  let fetchCalls = 0;
  const loadedTargets: WebTutorGuideStoreTarget[] = [];

  const result = await preflightRegisteredGuidePdfFreshness({
    lessonSlug: 'ds2-gichul-03-b1273c',
    materials: [descriptor(41)],
    materialKey: materialKey(41),
    level: 41,
    problemNumber: 3,
    registeredGuideSourceDeadlineMs: 5,
    guideStore: verifiedGuideStore(loadedTargets, CURRENT_PDF_HASH),
    fetchPort: {
      fetch: (_url, init) => {
        fetchCalls += 1;
        return new Promise<Response>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
        });
      },
    },
  });

  // Then
  assert.deepEqual(result, { ok: false, reason: 'source_unavailable' });
  assert.deepEqual(loadedTargets, [{ lessonKey: 'ds2-trigonometry', level: 41, problemNumber: 3 }]);
  assert.equal(fetchCalls, 1);
});
