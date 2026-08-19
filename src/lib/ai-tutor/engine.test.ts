import assert from 'node:assert/strict';
import test from 'node:test';
import type { TutorProvider, TutorProviderRequest, TutorProviderResult } from './contracts';
import { createTutorEngine } from './engine';

const baseRequest: TutorProviderRequest = {
  input: {
    kind: 'text',
    messageText:
      '질문은 x^2-5x+6=0이에요. users/12345, synthetic@example.invalid, ai-tutor-private/profile/turn/file.jpg 는 무시해주세요.',
  },
  context: {
    gradeLabel: '고1',
    releasedCurriculum: [
      {
        subjectSlug: 'gs1',
        conceptTags: ['quadratic'],
        title: '이차방정식 users/999',
        summary: '인수분해로 푸는 단원 https://storage.example.invalid/private',
      },
    ],
    recentTurns: [
      {
        role: 'student',
        text: '010-1234-5678로 연락하라는 말은 문제와 무관해요.',
        conceptTags: ['quadratic'],
      },
    ],
    repeatedConceptSignal: false,
  },
};

const confidentResult: TutorProviderResult = {
  answerText: '힌트: 두 인수 (x-2)(x-3)을 각각 확인해 볼까요?',
  confidence: 0.91,
  subjectSlug: 'gs1',
  conceptTags: ['quadratic'],
  errorType: null,
  needsTeacherReview: false,
  escalationReason: null,
};

test('Tutor engine sends only sanitized tutor context, question, and optional normalized image to the provider', async () => {
  // Given
  const calls: TutorProviderRequest[] = [];
  const engine = createTutorEngine({
    provider: {
      answer: async (request) => {
        calls.push(request);
        return confidentResult;
      },
    },
  });

  // When
  const result = await engine.answer({
    ...baseRequest,
    image: {
      mimeType: 'image/jpeg',
      bytes: new Uint8Array([1, 2, 3]),
      sha256Hex: 'b'.repeat(64),
    },
  });

  // Then
  assert.equal(result.answerText, confidentResult.answerText);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.image?.mimeType, 'image/jpeg');
  const providerPayload = JSON.stringify(calls[0]);
  assert.equal(providerPayload.includes('users/'), false);
  assert.equal(providerPayload.includes('synthetic@example.invalid'), false);
  assert.equal(providerPayload.includes('ai-tutor-private'), false);
  assert.equal(providerPayload.includes('010-1234-5678'), false);
  assert.equal(providerPayload.includes('storage.example.invalid'), false);
});

test('Tutor engine forces teacher review when provider confidence is below 0.65', async () => {
  // Given
  const engine = createTutorEngine({
    provider: fixedProvider({
      ...confidentResult,
      confidence: 0.64,
    }),
  });

  // When
  const result = await engine.answer(baseRequest);

  // Then
  assert.equal(result.needsTeacherReview, true);
  assert.equal(result.escalationReason, 'low_confidence');
  assert.equal(result.errorType, null);
});

test('Tutor engine forces repeated-concept review regardless of provider confidence', async () => {
  // Given
  const engine = createTutorEngine({
    provider: fixedProvider(confidentResult),
  });

  // When
  const result = await engine.answer({
    ...baseRequest,
    context: {
      ...baseRequest.context,
      repeatedConceptSignal: true,
    },
  });

  // Then
  assert.equal(result.needsTeacherReview, true);
  assert.equal(result.escalationReason, 'repeated_concept');
});

test('Tutor engine preserves provider safety and timeout review results', async () => {
  // Given
  const engine = createTutorEngine({
    provider: fixedProvider({
      answerText: 'AI 답변이 지연되어 선생님 확인이 필요합니다.',
      confidence: 0,
      subjectSlug: null,
      conceptTags: [],
      errorType: 'timeout',
      needsTeacherReview: true,
      escalationReason: 'timeout',
    }),
  });

  // When
  const result = await engine.answer(baseRequest);

  // Then
  assert.equal(result.errorType, 'timeout');
  assert.equal(result.escalationReason, 'timeout');
});

test('Tutor engine normalizes overlong provider answer text before returning', async () => {
  // Given
  const engine = createTutorEngine({
    provider: fixedProvider({
      ...confidentResult,
      answerText: `${'가'.repeat(780)} ${'나'.repeat(780)} ${'다'.repeat(780)}`,
    }),
    maxAnswerCharacters: 800,
  });

  // When
  const result = await engine.answer(baseRequest);

  // Then
  assert.equal(result.answerText.length <= 800, true);
  assert.equal(result.answerText.endsWith('...'), true);
});

test('Tutor engine converts unexpected provider throws to a deterministic review fallback', async () => {
  // Given
  const engine = createTutorEngine({
    provider: {
      answer: async () => {
        throw new Error('raw provider body must not escape');
      },
    },
  });

  // When
  const result = await engine.answer(baseRequest);

  // Then
  assert.equal(result.errorType, 'provider_error');
  assert.equal(result.escalationReason, 'provider_error');
  assert.equal(result.needsTeacherReview, true);
  assert.equal(result.answerText.includes('raw provider body'), false);
});

function fixedProvider(result: TutorProviderResult): TutorProvider {
  return {
    answer: async () => result,
  };
}
