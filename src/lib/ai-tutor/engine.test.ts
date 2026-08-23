import assert from 'node:assert/strict';
import test from 'node:test';
import { AI_TUTOR_OUTPUT_FIELDS, type TutorProviderRequest } from './contracts';
import { createTutorEngine } from './engine';
import { baseRequest, confidentResult, fixedProvider } from './engine.test-support';

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

test('Given structured provider answer text When engine returns it Then meaningful lines and display math survive', async () => {
  // Given
  const engine = createTutorEngine({
    provider: fixedProvider({
      ...confidentResult,
      answerText: '핵심 힌트:\n\n$$\\dfrac{1}{2}$$\n\n다음 단계로 갈까요?',
    }),
  });

  // When
  const result = await engine.answer(baseRequest);
  const lines = result.answerText.split('\n');

  // Then
  assert.equal(lines.length >= 5, true);
  assert.equal(lines.includes(''), true);
  assert.equal(lines.includes('$$\\dfrac{1}{2}$$'), true);
});

test('Given a fake-provider manual QA scenario When engine returns an answer Then the shared output contract stays structured and bounded', async () => {
  // Given
  const engine = createTutorEngine({
    provider: fixedProvider({
      ...confidentResult,
      answerText: `핵심   힌트:

$$\\dfrac{1}{2}$$

풀이   시작: 조건을 먼저 정리해요.
010-1234-5678 synthetic@example.invalid users/synthetic-student
${'가'.repeat(400)}`,
    }),
    maxAnswerCharacters: 220,
  });

  // When
  const result = await engine.answer(baseRequest);
  const lines = result.answerText.split('\n');
  const serialized = JSON.stringify(result);

  // Then
  assert.deepEqual(Object.keys(result), [...AI_TUTOR_OUTPUT_FIELDS]);
  assert.equal(lines[0], '핵심 힌트:');
  assert.equal(lines[1], '');
  assert.equal(lines[2], '$$\\dfrac{1}{2}$$');
  assert.equal(result.answerText.includes('  '), false);
  assert.equal(serialized.includes('010-1234-5678'), false);
  assert.equal(serialized.includes('synthetic@example.invalid'), false);
  assert.equal(serialized.includes('users/synthetic-student'), false);
  assert.equal(result.answerText.length <= 220, true);
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

test('Given a metadata-capable provider When answering Then engine propagates model prompt token duration and attempt metadata', async () => {
  // Given
  const engine = createTutorEngine({
    provider: {
      answer: async () => confidentResult,
      answerWithMetadata: async () => ({
        result: confidentResult,
        metadata: {
          modelId: 'gemini-3.1-flash',
          modelAlias: 'fallback',
          promptVersion: 'ai-tutor-mvp-002',
          durationMs: 1234,
          tokenCounts: { input: 10, output: 20, total: 30 },
          attemptCount: 2,
        },
      }),
    },
  });

  // When
  const result = await engine.answerWithMetadata(baseRequest);

  // Then
  assert.equal(result.result.answerText, confidentResult.answerText);
  assert.deepEqual(result.metadata, {
    provider: 'gemini',
    modelId: 'gemini-3.1-flash',
    modelAlias: 'fallback',
    promptVersion: 'ai-tutor-mvp-002',
    latencyMs: 1234,
    tokenCounts: { input: 10, output: 20, total: 30 },
    attemptCount: 2,
  });
});
