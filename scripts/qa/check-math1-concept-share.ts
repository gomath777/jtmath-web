import assert from 'node:assert/strict';
import { DS_CONCEPT_PART1, DS_CONCEPT_PART2 } from '../../src/app/share/ds-concept/data';

const lessons = [...DS_CONCEPT_PART1, ...DS_CONCEPT_PART2] as const;

assert.equal(lessons.length, 14, 'math1 concept share includes every ds concept lesson');
assert.equal(lessons[0]?.title, '지수', 'math1 concept share starts with exponents');
assert.equal(lessons.at(-1)?.title, '수학적 귀납법', 'math1 concept share ends with induction');

const pdfCount = lessons.reduce((count, lesson) => count + lesson.pdfs.length, 0);
const videoCount = lessons.reduce((count, lesson) => count + lesson.videos.length, 0);

assert.equal(pdfCount, 23, 'math1 concept share includes all concept notes');
assert.equal(videoCount, 23, 'math1 concept share includes all concept videos');

for (const lesson of lessons) {
  assert.ok(lesson.pdfs.length > 0, `${lesson.title} has at least one concept note`);
  assert.ok(lesson.videos.length > 0, `${lesson.title} has at least one concept video`);
  for (const pdf of lesson.pdfs) {
    assert.ok(pdf.url.startsWith('https://'), `${pdf.name} uses an absolute PDF URL`);
  }
  for (const video of lesson.videos) {
    assert.match(video.id, /^[0-9a-f-]{36}$/i, `${video.title} uses a Bunny video id`);
  }
}

console.log('math1 concept share qa checks passed');
