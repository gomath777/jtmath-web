import assert from 'node:assert/strict';
import test from 'node:test';
import { collectContentAssets, isReadinessListRow, isRowReady, type Ds2ReadinessRow } from './ds2-readiness';

test('collectContentAssets separates worksheets, hintbooks, and Bunny videos', () => {
  // Given
  const blocks = [
    {
      block_type: 'content_group',
      content: {
        pdfs: [
          { original_name: 'level-1.pdf', url: 'https://cdn.example/level-1.pdf' },
          { original_name: 'level-2.pdf', url: 'https://cdn.example/level-2.pdf' },
        ],
        hintbook: {
          original_name: 'hint.pdf',
          url: 'https://cdn.example/hint.pdf',
        },
        videos: [
          { bunny_video_id: 'video-a', title: '1번 해설' },
          { bunny_video_id: 'video-b', title: '2번 해설' },
        ],
      },
    },
  ];

  // When
  const result = collectContentAssets(blocks);

  // Then
  assert.deepEqual(result.pdfs.map((asset) => asset.name), ['level-1.pdf', 'level-2.pdf']);
  assert.deepEqual(result.hintbooks.map((asset) => asset.name), ['hint.pdf']);
  assert.deepEqual(result.videos.map((asset) => asset.title), ['1번 해설', '2번 해설']);
});

test('collectContentAssets removes duplicate references across blocks', () => {
  // Given
  const blocks = [
    {
      block_type: 'content_group',
      content: {
        pdf: { original_name: 'same.pdf', url: 'https://cdn.example/same.pdf' },
        videos: [{ bunny_video_id: 'same-video', title: '해설' }],
      },
    },
    {
      block_type: 'content_group',
      content: {
        pdf: { original_name: 'same.pdf', url: 'https://cdn.example/same.pdf' },
        videos: [{ bunny_video_id: 'same-video', title: '해설' }],
      },
    },
  ];

  // When
  const result = collectContentAssets(blocks);

  // Then
  assert.equal(result.pdfs.length, 1);
  assert.equal(result.videos.length, 1);
});

test('isRowReady treats shimhwa video as optional', () => {
  // Given
  const row: Ds2ReadinessRow = {
    id: 'lesson-a',
    category: 'shimhwa',
    sessionNumber: 4,
    title: '심화',
    variantLabel: null,
    publicSlug: 'lesson-a',
    assignmentCount: 0,
    blockCount: 1,
    assets: {
      pdfs: [{ name: 'stage.pdf', url: 'https://cdn.example/stage.pdf', health: 'unchecked' }],
      hintbooks: [],
      videos: [],
    },
  };

  // When
  const ready = isRowReady(row);

  // Then
  assert.equal(ready, true);
});

test('isRowReady requires both PDF and video for concept pages', () => {
  // Given
  const row: Ds2ReadinessRow = {
    id: 'lesson-b',
    category: 'concept',
    sessionNumber: 1,
    title: '개념',
    variantLabel: null,
    publicSlug: 'lesson-b',
    assignmentCount: 0,
    blockCount: 1,
    assets: {
      pdfs: [{ name: 'note.pdf', url: 'https://cdn.example/note.pdf', health: 'unchecked' }],
      hintbooks: [],
      videos: [],
    },
  };

  // When
  const ready = isRowReady(row);

  // Then
  assert.equal(ready, false);
});

test('isReadinessListRow hides supplemental variants from the canonical inventory', () => {
  // Given
  const row: Ds2ReadinessRow = {
    id: 'lesson-c',
    category: 'gichul',
    sessionNumber: 7,
    title: '수열의 합',
    variantLabel: '보강',
    publicSlug: 'lesson-c',
    assignmentCount: 0,
    blockCount: 1,
    assets: {
      pdfs: [{ name: 'level-3.pdf', url: 'https://cdn.example/level-3.pdf', health: 'unchecked' }],
      hintbooks: [],
      videos: [{ id: 'video-c', title: '해설', health: 'unchecked' }],
    },
  };

  // When
  const visible = isReadinessListRow(row);

  // Then
  assert.equal(visible, false);
});
