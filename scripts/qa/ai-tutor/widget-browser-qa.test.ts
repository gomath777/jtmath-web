import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBrowserQaOptions } from './widget-browser-qa';

const fixedMidtermArguments = [
  '--fixture', 'midterm-session2-ui',
  '--viewports', '390x844,768x1024,1280x900',
  '--route', '/lesson/gs2-midterm-2026-w1s2-plane-line',
  '--auth', 'synthetic-released',
  '--zoom', '200',
  '--graph', 'off',
] as const;

test('Given the integrated QA command, When exact route/auth/graph options are parsed, Then all required gates are explicit', () => {
  const options = parseBrowserQaOptions([
    ...fixedMidtermArguments,
  ]);

  assert.equal(options.fixture, 'midterm-session2-ui');
  assert.deepEqual(options.targets, [{ route: '/lesson/gs2-midterm-2026-w1s2-plane-line', fixtureName: 'gs2-midterm' }]);
  assert.equal(options.auth, 'synthetic-released');
  assert.equal(options.graph, 'off');
  assert.equal(options.zoom, 200);
  assert.deepEqual(options.requiredViewports, ['390x844', '768x1024', '1280x900']);
});

test('Given the full T15 browser matrix command, When routes are parsed, Then every subject fixture is explicit', () => {
  const options = parseBrowserQaOptions([
    '--fixture', 'midterm-session2-full',
    '--viewports', '390x844,768x1024,1280x900',
    '--routes', 'gs2-midterm-2026-w1s2-plane-line,mj1-midterm-2026-w1s2-limit,gh-midterm-2026-w1s2-conic,synthetic-ds2-a,synthetic-ds2-b',
    '--auth', 'synthetic-released',
    '--zoom', '200',
    '--graph', 'off',
  ]);

  assert.deepEqual(options.targets.map((target) => [target.route, target.fixtureName]), [
    ['/lesson/gs2-midterm-2026-w1s2-plane-line', 'gs2-midterm'],
    ['/lesson/mj1-midterm-2026-w1s2-limit', 'mj1-midterm'],
    ['/lesson/gh-midterm-2026-w1s2-conic', 'gh-midterm'],
    ['/lesson/synthetic-ds2-a', 'ds2-assigned-only'],
    ['/lesson/synthetic-ds2-b', 'ds2-assigned-alt'],
  ]);
});

test('Given the fixed midterm browser contract, When options are parsed, Then graph-on values are rejected', () => {
  assert.throws(() => parseBrowserQaOptions([...fixedMidtermArguments.slice(0, -1), 'on']), /--graph off/);
});

test('Given a missing required browser QA flag, When parsing integrated options, Then the command fails closed before browser startup', () => {
  assert.throws(
    () =>
      parseBrowserQaOptions([
        '--fixture', 'midterm-session2-ui',
        '--route',
        '/lesson/gs2-midterm-2026-w1s2-plane-line',
        '--auth',
        'synthetic-released',
        '--zoom', '200',
        '--graph',
        'off',
      ]),
    /explicit --viewports/,
  );
  assert.throws(
    () =>
      parseBrowserQaOptions([
        '--fixture', 'midterm-session2-ui',
        '--viewports',
        '390x844,768x1024,1280x900',
        '--auth',
        'synthetic-released',
        '--zoom', '200',
        '--graph',
        'off',
      ]),
    /exact route/,
  );
  assert.throws(
    () =>
      parseBrowserQaOptions([
        '--fixture', 'midterm-session2-ui',
        '--viewports',
        '390x844,768x1024,1280x900',
        '--route',
        '/lesson/gs2-midterm-2026-w1s2-plane-line',
        '--zoom', '200',
        '--graph',
        'off',
      ]),
    /explicit --auth/,
  );
  assert.throws(
    () =>
      parseBrowserQaOptions([
        '--fixture', 'midterm-session2-ui',
        '--viewports',
        '390x844,768x1024,1280x900',
        '--route',
        '/lesson/gs2-midterm-2026-w1s2-plane-line',
        '--auth',
        'synthetic-released',
        '--zoom', '200',
      ]),
    /explicit --graph/,
  );
});

test('Given a wrong integrated browser QA value, When parsing integrated options, Then the command fails closed with the exact guardrail', () => {
  assert.throws(
    () =>
      parseBrowserQaOptions([
        '--fixture', 'midterm-session2-ui',
        '--viewports',
        '390x844,1280x900',
        '--route',
        '/lesson/gs2-midterm-2026-w1s2-plane-line',
        '--auth',
        'synthetic-released',
        '--zoom', '200',
        '--graph',
        'off',
      ]),
    /explicit --viewports 390x844,768x1024,1280x900/,
  );
  assert.throws(
    () =>
      parseBrowserQaOptions([
        '--fixture', 'midterm-session2-ui',
        '--viewports',
        '390x844,768x1024,1280x900',
        '--route',
        '/lesson/not-the-owned-lesson',
        '--auth',
        'synthetic-released',
        '--zoom', '200',
        '--graph',
        'off',
      ]),
    /exact route/,
  );
  assert.throws(
    () =>
      parseBrowserQaOptions([
        '--fixture', 'midterm-session2-full',
        '--viewports',
        '390x844,768x1024,1280x900',
        '--routes',
        'gs2-midterm-2026-w1s2-plane-line,synthetic-ds2-a',
        '--auth',
        'synthetic-released',
        '--zoom',
        '200',
        '--graph',
        'off',
      ]),
    /full integrated QA requires exact --routes/,
  );
  assert.throws(
    () =>
      parseBrowserQaOptions([
        '--fixture', 'midterm-session2-ui',
        '--viewports',
        '390x844,768x1024,1280x900',
        '--route',
        '/lesson/gs2-midterm-2026-w1s2-plane-line',
        '--auth',
        'cookie',
        '--zoom', '200',
        '--graph',
        'off',
      ]),
    /--auth synthetic-released/,
  );
  assert.throws(
    () =>
      parseBrowserQaOptions([
        '--fixture', 'midterm-session2-ui',
        '--viewports',
        '390x844,768x1024,1280x900',
        '--route',
        '/lesson/gs2-midterm-2026-w1s2-plane-line',
        '--auth',
        'synthetic-released',
        '--zoom', '200',
        '--graph',
        'on',
      ]),
    /--graph off/,
  );
});
