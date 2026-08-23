import assert from 'node:assert/strict';
import test from 'node:test';

import { createFixtures } from './web-handler.test-support';
import { GUIDE_LESSON_SLUG, guideLesson, verifiedGuideStore } from './web-handler-guide.test-support';

test('Given a verified guide and a provider timeout When answering a free-form question Then the handler returns a retry response without guide content', async () => {
  const fixtures = createFixtures({
    lesson: guideLesson,
    guideStore: verifiedGuideStore([]),
    providerResult: {
      answerText: 'synthetic timeout answer',
      confidence: 0,
      subjectSlug: null,
      conceptTags: [],
      errorType: 'timeout',
      needsTeacherReview: true,
      escalationReason: 'timeout',
    },
  });

  const response = await fixtures.post({
    lessonSlug: GUIDE_LESSON_SLUG,
    selectedMaterialKey: 'm-1-content-pdfs-3',
    message: '3번 조건의 의미를 설명해 줘',
  });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, 'provider_unavailable');
  assert.match(body.message, /답변 생성이 끊겼어요/);
  assert.doesNotMatch(body.message, /synthetic concept hint|synthetic start hint/);
  assert.equal(fixtures.providerRequests.length, 1);
});
