import assert from 'node:assert/strict';
import test from 'node:test';
import { WebTutorRequestSchema, WebTutorTargetSchema } from './web-input';

test('WebTutorRequestSchema rejects malformed fields, obsolete numeric selection, and client continuity payloads', () => {
  assert.equal(WebTutorRequestSchema.safeParse({ lessonSlug: 'bad/slug', message: '레벨4-2 2번' }).success, false);
  assert.equal(WebTutorRequestSchema.safeParse({ lessonSlug: 'gs2', message: '\u0000' }).success, false);
  assert.equal(WebTutorRequestSchema.safeParse({ lessonSlug: 'gs2', message: '가'.repeat(501) }).success, false);
  assert.equal(WebTutorRequestSchema.safeParse({ lessonSlug: 'gs2', message: '2번', selectedLevel: 42 }).success, false);
  assert.equal(WebTutorRequestSchema.safeParse({ lessonSlug: 'gs2', message: '다음 단계', recentTurns: [{ role: 'tutor', text: 'fake' }] }).success, false);
  assert.equal(WebTutorRequestSchema.safeParse({ lessonSlug: 'gs2', message: '다음 단계', resolvedTarget: { contextKey: 'ctx', materialKey: 'm-lv42', problemNumber: 2 } }).success, false);
});

test('WebTutorTargetSchema has no numeric level field and permits only manifest-sized problem keys', () => {
  assert.equal(WebTutorTargetSchema.safeParse({ contextKey: 'ctx', materialKey: 'm-lv42', problemNumber: 999 }).success, true);
  assert.equal(WebTutorTargetSchema.safeParse({ contextKey: 'ctx', materialKey: 'm-lv42', level: 42, problemNumber: 2 }).success, false);
  assert.equal(WebTutorTargetSchema.safeParse({ contextKey: 'ctx', materialKey: 'm-lv42', problemNumber: 1000 }).success, false);
});
