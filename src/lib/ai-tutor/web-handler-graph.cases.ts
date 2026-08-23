import assert from 'node:assert/strict';
import test from 'node:test';
import { createFixtures } from './web-handler.test-support';
import { GUIDE_LESSON_SLUG, guideLesson, verifiedGuideStore } from './web-handler-guide.test-support';
import type { TutorProviderResult } from './contracts';

test('Given graph-shaped client fields When posting to the web handler Then strict request parsing rejects them before provider work', async () => {
  const fixtures = createFixtures({ lesson: guideLesson, guideStore: verifiedGuideStore([]) });
  const response = await fixtures.post({
    lessonSlug: GUIDE_LESSON_SLUG,
    selectedMaterialKey: 'm-41',
    message: '3번 힌트 줘',
    visualSpec: { kind: 'forged' },
  });

  assert.equal(response.status, 422);
  assert.equal(fixtures.providerRequests.length, 0);
});

test('Given a malicious provider visual payload When posting Then the web response contains no graph or presentation fields', async () => {
  let providerCalls = 0;
  const fixtures = createFixtures({
    lesson: guideLesson,
    guideStore: verifiedGuideStore([]),
    provider: {
      answer: async () => {
        providerCalls += 1;
        // Deliberately crosses the typed provider boundary to exercise hostile runtime JSON.
        return {
          answerText: 'synthetic grounded answer',
          confidence: 0.92,
          subjectSlug: 'ds2',
          conceptTags: [],
          errorType: null,
          needsTeacherReview: false,
          escalationReason: null,
          visualSpec: { kind: 'forged_graph', points: [{ x: 1, y: 2 }] },
          presentation: { cards: ['forged'] },
        } as unknown as TutorProviderResult;
      },
    },
  });
  const response = await fixtures.post({
    lessonSlug: GUIDE_LESSON_SLUG,
    selectedMaterialKey: 'm-1-content-pdfs-3',
    message: '3번의 조건이 왜 필요한지 설명해 줘',
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(providerCalls, 1);
  assert.equal('visualSpec' in body, false);
  assert.equal('presentation' in body, false);
  assert.equal('graph' in body, false);
});
