import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_TUTOR_ESCALATION_REASONS,
  TutorProviderResultSchema,
  buildReviewResult,
} from './contracts';

test('TutorProviderResultSchema accepts exactly the structured output fields when values are bounded', () => {
  // Given
  const output = {
    answerText: '힌트: 먼저 이항해서 좌변을 정리해 볼까요?',
    confidence: 0.82,
    subjectSlug: 'gs1',
    conceptTags: ['quadratic', '인수분해'],
    errorType: null,
    needsTeacherReview: false,
    escalationReason: null,
  };

  // When
  const parsed = TutorProviderResultSchema.parse(output);

  // Then
  assert.deepEqual(Object.keys(parsed), [
    'answerText',
    'confidence',
    'subjectSlug',
    'conceptTags',
    'errorType',
    'needsTeacherReview',
    'escalationReason',
  ]);
  assert.equal(parsed.confidence, 0.82);
});

test('TutorProviderResultSchema rejects extra PII-shaped or chain-of-thought fields', () => {
  // Given
  const output = {
    answerText: '힌트만 제공합니다.',
    confidence: 0.7,
    subjectSlug: null,
    conceptTags: [],
    errorType: null,
    needsTeacherReview: false,
    escalationReason: null,
    phone: 'redacted-contact',
    chainOfThought: 'hidden reasoning',
  };

  // When / Then
  assert.equal(TutorProviderResultSchema.safeParse(output).success, false);
});

test('TutorProviderResultSchema bounds confidence and normalizes concept tags', () => {
  // Given
  const output = {
    answerText: '좋아요. 첫 번째로 틀린 줄을 같이 확인해 봅시다.',
    confidence: 1,
    subjectSlug: null,
    conceptTags: ['  QUADRATIC  ', '이차방정식'],
    errorType: null,
    needsTeacherReview: true,
    escalationReason: 'low_confidence',
  };

  // When
  const parsed = TutorProviderResultSchema.parse(output);

  // Then
  assert.deepEqual(parsed.conceptTags, ['quadratic', '이차방정식']);
  assert.equal(
    TutorProviderResultSchema.safeParse({ ...output, confidence: 1.01 }).success,
    false,
  );
  assert.equal(
    TutorProviderResultSchema.safeParse({
      ...output,
      conceptTags: Array.from({ length: 9 }, (_, index) => `tag-${index}`),
    }).success,
    false,
  );
});

test('AI_TUTOR_ESCALATION_REASONS includes every MVP escalation category', () => {
  // Given
  const reasons = new Set(AI_TUTOR_ESCALATION_REASONS);

  // When / Then
  assert.equal(reasons.has('low_confidence'), true);
  assert.equal(reasons.has('timeout'), true);
  assert.equal(reasons.has('provider_error'), true);
  assert.equal(reasons.has('invalid_output'), true);
  assert.equal(reasons.has('unsupported_attachment'), true);
  assert.equal(reasons.has('out_of_curriculum'), true);
  assert.equal(reasons.has('repeated_concept'), true);
});

test('buildReviewResult maps provider failure categories into review-needed output', () => {
  // Given / When
  const result = buildReviewResult({
    reason: 'invalid_output',
    errorType: 'invalid_output',
    answerText: '답변 형식이 안전하지 않아 선생님 확인이 필요합니다.',
  });

  // Then
  assert.deepEqual(result, {
    answerText: '답변 형식이 안전하지 않아 선생님 확인이 필요합니다.',
    confidence: 0,
    subjectSlug: null,
    conceptTags: [],
    errorType: 'invalid_output',
    needsTeacherReview: true,
    escalationReason: 'invalid_output',
  });
});
