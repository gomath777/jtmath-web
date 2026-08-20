import assert from 'node:assert/strict';
import test from 'node:test';
import {
  duplicateFallbackResult,
  isAiTutorTurnStatus,
  storedAnswerFromTurn,
  type AiTutorTurnSnapshot,
} from './repository';

test('duplicateFallbackResult classifies processing duplicates without a provider-call signal', () => {
  // Given
  const status = 'processing';

  // When
  const result = duplicateFallbackResult(status);

  // Then
  assert.equal(result.needsTeacherReview, true);
  assert.equal(result.errorType, 'provider_error');
  assert.equal(result.escalationReason, 'provider_error');
  assert.match(result.answerText, /처리 중/);
});

test('duplicateFallbackResult classifies expired duplicates as timeout review cases', () => {
  // Given / When
  const result = duplicateFallbackResult('expired');

  // Then
  assert.equal(result.errorType, 'timeout');
  assert.equal(result.escalationReason, 'timeout');
  assert.equal(result.confidence, 0);
});

test('storedAnswerFromTurn returns completed stored answers without raw rows', () => {
  // Given
  const turn: AiTutorTurnSnapshot = {
    id: 'turn-stored',
    status: 'completed',
    answerText: '힌트: 두 근을 모두 확인해 봅시다.',
    confidence: 0.84,
    subjectSlug: 'gs1',
    conceptTags: ['quadratic'],
    errorTags: [],
    needsTeacherReview: false,
    escalationReason: null,
  };

  // When
  const answer = storedAnswerFromTurn(turn);

  // Then
  assert.equal(answer?.answerText, '힌트: 두 근을 모두 확인해 봅시다.');
  assert.equal(answer?.confidence, 0.84);
  assert.deepEqual(answer?.conceptTags, ['quadratic']);
});

test('storedAnswerFromTurn rejects non-completed or answerless turns', () => {
  // Given
  const turn: AiTutorTurnSnapshot = {
    id: 'turn-processing',
    status: 'processing',
    answerText: null,
    confidence: null,
    subjectSlug: null,
    conceptTags: [],
    errorTags: [],
    needsTeacherReview: false,
    escalationReason: null,
  };

  // When / Then
  assert.equal(storedAnswerFromTurn(turn), null);
});

test('isAiTutorTurnStatus narrows only persisted turn statuses', () => {
  // Given / When / Then
  assert.equal(isAiTutorTurnStatus('processing'), true);
  assert.equal(isAiTutorTurnStatus('completed'), true);
  assert.equal(isAiTutorTurnStatus('stale'), false);
});
