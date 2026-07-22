import assert from 'node:assert/strict';
import { MJ1_CONCEPT_PART1, MJ1_CONCEPT_PART2 } from '../../src/app/share/mj1-concept/data';

const lessons = [...MJ1_CONCEPT_PART1, ...MJ1_CONCEPT_PART2] as const;

assert.equal(lessons.length, 14, 'mj1 concept all share includes every concept lesson');
assert.equal(lessons[0]?.title, '함수의 극한', 'mj1 concept all share starts with function limits');
assert.equal(lessons.at(-1)?.title, '정적분의 활용', 'mj1 concept all share ends with definite integral applications');

const pdfCount = lessons.reduce((count, lesson) => count + lesson.pdfs.length, 0);
const videoCount = lessons.reduce((count, lesson) => count + lesson.videos.length, 0);

assert.equal(pdfCount, 19, 'mj1 concept all share includes all concept notes');
assert.equal(videoCount, 19, 'mj1 concept all share includes all concept videos');

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

console.log('mj1 concept all share qa checks passed');
