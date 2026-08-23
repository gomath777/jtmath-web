import assert from 'node:assert/strict';
import test from 'node:test';
import { WEB_INPUT_TEST_CONTEXT_KEY, parseWebTutorTestInput } from './web-input.test-support';

test('parseWebTutorInput resolves a normalized Korean label and short problem reference to its material key', () => {
  const result = parseWebTutorTestInput({ message: '레벨４－２ 문제 120번 힌트 줘' });

  assert.deepEqual(result, {
    kind: 'ok',
    mode: 'hint',
    target: { contextKey: WEB_INPUT_TEST_CONTEXT_KEY, materialKey: 'm-lv42', problemNumber: 120 },
  });
});

test('parseWebTutorInput asks for an authoritative material when a numbered request has no source', () => {
  assert.deepEqual(parseWebTutorTestInput({ message: '2번 힌트 줘' }), {
    kind: 'ambiguous_material',
    problemNumber: 2,
  });
});

test('parseWebTutorInput lets a selected material key resolve a short problem reference', () => {
  assert.deepEqual(parseWebTutorTestInput({
    message: '999번 힌트 줘',
    selectedMaterialKey: 'm-lv5',
  }), {
    kind: 'ok',
    mode: 'hint',
    target: { contextKey: WEB_INPUT_TEST_CONTEXT_KEY, materialKey: 'm-lv5', problemNumber: 999 },
  });
});

test('parseWebTutorInput rejects out-of-range and bare-number requests', () => {
  assert.deepEqual(parseWebTutorTestInput({ message: '레벨4-2 121번' }), { kind: 'malformed_input' });
  assert.deepEqual(parseWebTutorTestInput({ message: '0번' }), { kind: 'malformed_input' });
  assert.deepEqual(parseWebTutorTestInput({ message: '1000번' }), { kind: 'malformed_input' });
  assert.deepEqual(parseWebTutorTestInput({ message: '2' }), { kind: 'malformed_input' });
});
