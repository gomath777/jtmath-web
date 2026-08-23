import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CalendarsNewClient from './CalendarsNewClient';

(globalThis as typeof globalThis & { React?: typeof React }).React = React;

test('CalendarsNewClient routes a master lesson click through the admin preview cookie bridge', () => {
  const markup = renderToStaticMarkup(
    <CalendarsNewClient
      students={[
        {
          slug: 'student-preview',
          profileId: 'profile-preview',
          name: '테스트',
          school: '',
          grade: 2,
          phase: null,
          sla: [
            {
              id: 'assignment-preview',
              lessonSlug: 'gs2-midterm-2026-w1s2-plane-line',
              subject_slug: 'gs2',
              subject_label: '공통수학2',
              category: 'gichul',
              week_number: 1,
              session_number: 2,
              variant_label: null,
              label: '평면좌표·직선의 방정식',
              publishDate: '2026-08-24',
              is_released: false,
            },
          ],
        },
      ]}
    />,
  );

  assert.match(
    markup,
    /href="\/api\/admin\/preview\?slug=student-preview&amp;to=%2Flesson%2Fgs2-midterm-2026-w1s2-plane-line"/,
  );
});
