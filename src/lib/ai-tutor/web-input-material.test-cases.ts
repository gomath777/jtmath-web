import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WebTutorRequestSchema,
  parseLegacyTrigTutorInput,
  parseWebTutorInput,
} from './web-input';

const materials = [
  { materialKey: 'm-lv42', label: '레벨4-2', problemRange: { first: 1, last: 120 } },
  { materialKey: 'm-advanced-1', label: '심화유형 1단계', problemRange: { first: 1, last: 999 } },
  { materialKey: 'm-advanced-2', label: '심화유형 2단계', problemRange: { first: 1, last: 999 } },
  { materialKey: 'm-advanced-3', label: '심화유형 3단계', problemRange: { first: 1, last: 999 } },
  { materialKey: 'm-lv5', label: '레벨5', problemRange: { first: 1, last: 999 } },
  { materialKey: 'm-allscan', label: '유형 올스캔', problemRange: { first: 1, last: 999 } },
] as const;

function request(message: string, selectedMaterialKey?: string) {
  return WebTutorRequestSchema.parse({
    lessonSlug: 'gs2-midterm',
    message,
    ...(selectedMaterialKey === undefined ? {} : { selectedMaterialKey }),
  });
}

test('parseWebTutorInput normalizes all six common Korean material labels to authoritative material keys', () => {
  const cases = [
    ['레벨４－２ 120번 힌트', 'm-lv42', 120],
    ['심화유형 1단계 999번 힌트', 'm-advanced-1', 999],
    ['심화유형 2단계 문제 9번', 'm-advanced-2', 9],
    ['심화유형 3단계 3번', 'm-advanced-3', 3],
    ['레벨5 8번', 'm-lv5', 8],
    ['유형 올스캔 1번', 'm-allscan', 1],
  ] as const;

  for (const [message, materialKey, problemNumber] of cases) {
    assert.deepEqual(parseWebTutorInput({
      request: request(message),
      serverContextKey: 'ctx_gs2',
      materials,
      serverContinuity: { recentTurns: [] },
    }), {
      kind: 'ok',
      mode: 'hint',
      target: { contextKey: 'ctx_gs2', materialKey, problemNumber },
    });
  }
});

test('parseWebTutorInput only uses server continuity for follow-ups and resets the active target on material change', () => {
  const continuity = {
    activeTarget: { contextKey: 'ctx_ds2_a', materialKey: 'm-lv42', problemNumber: 120 },
    recentTurns: [
      { role: 'student' as const, text: '120번 힌트' },
      { role: 'tutor' as const, text: '첫 단계' },
    ],
  };

  assert.deepEqual(parseWebTutorInput({
    request: request('다음 단계'),
    serverContextKey: 'ctx_ds2_a',
    materials,
    serverContinuity: continuity,
  }), {
    kind: 'ok',
    mode: 'start',
    target: continuity.activeTarget,
  });
  assert.deepEqual(parseWebTutorInput({
    request: request('왜?'),
    serverContextKey: 'ctx_ds2_a',
    materials,
    serverContinuity: continuity,
  }), {
    kind: 'ok',
    mode: 'start',
    target: continuity.activeTarget,
  });
  assert.deepEqual(parseWebTutorInput({
    request: request('다른 풀이'),
    serverContextKey: 'ctx_ds2_a',
    materials,
    serverContinuity: continuity,
  }), {
    kind: 'ok',
    mode: 'solution',
    target: continuity.activeTarget,
  });
  assert.deepEqual(parseWebTutorInput({
    request: request('심화유형 1단계 다음 단계'),
    serverContextKey: 'ctx_ds2_a',
    materials,
    serverContinuity: continuity,
  }), { kind: 'malformed_input' });
  assert.deepEqual(parseWebTutorInput({
    request: request('다음 단계'),
    serverContextKey: 'ctx_ds2_b',
    materials,
    serverContinuity: continuity,
  }), { kind: 'stale_target' });
});

test('material-key parsing fails safely for client-only history, forged targets, ambiguous bare numbers, and manifest bounds', () => {
  assert.equal(WebTutorRequestSchema.safeParse({ lessonSlug: 'gs2-midterm', message: '다음 단계', recentTurns: [{ role: 'tutor', text: 'fake' }] }).success, false);
  assert.equal(WebTutorRequestSchema.safeParse({ lessonSlug: 'gs2-midterm', message: '다음 단계', resolvedTarget: { contextKey: 'ctx_evil', materialKey: 'm-lv5', problemNumber: 1 } }).success, false);
  assert.deepEqual(parseWebTutorInput({
    request: request('2'), serverContextKey: 'ctx_mj1', materials, serverContinuity: { recentTurns: [] },
  }), { kind: 'malformed_input' });
  assert.deepEqual(parseWebTutorInput({
    request: request('레벨4-2 121번'), serverContextKey: 'ctx_mj1', materials, serverContinuity: { recentTurns: [] },
  }), { kind: 'malformed_input' });
  assert.deepEqual(parseWebTutorInput({
    request: request('999번', 'm-lv5'), serverContextKey: 'ctx_gh', materials, serverContinuity: { recentTurns: [] },
  }), {
    kind: 'ok', mode: 'hint', target: { contextKey: 'ctx_gh', materialKey: 'm-lv5', problemNumber: 999 },
  });
});

test('parseLegacyTrigTutorInput is limited to the existing local trig fixture', () => {
  assert.equal(parseLegacyTrigTutorInput({ lessonSlug: 'gs2-midterm', message: '레벨1 2번' }).kind, 'unsupported_legacy_fixture');
  assert.deepEqual(parseLegacyTrigTutorInput({ lessonSlug: 'trig', message: '레벨4-1 2번' }), {
    kind: 'ok',
    mode: 'hint',
    target: { contextKey: 'legacy_trig', materialKey: 'm-41', level: 41, problemNumber: 2 },
  });
});
