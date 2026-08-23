import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const rootLayoutPath = resolve(process.cwd(), 'src/app/layout.tsx');

test('root layout delivers KaTeX vendor CSS before project guardrails', () => {
  const rootLayoutSource = readFileSync(rootLayoutPath, 'utf8');
  const katexImport = "import 'katex/dist/katex.min.css';";
  const globalsImport = "import './globals.css';";
  const katexImportIndex = rootLayoutSource.indexOf(katexImport);
  const globalsImportIndex = rootLayoutSource.indexOf(globalsImport);

  assert.notEqual(
    katexImportIndex,
    -1,
    'src/app/layout.tsx must import the production KaTeX stylesheet directly',
  );
  assert.notEqual(globalsImportIndex, -1, 'src/app/layout.tsx must import project guardrails');
  assert.ok(
    katexImportIndex < globalsImportIndex,
    'KaTeX vendor CSS must load before ./globals.css so tutor guardrails remain the final cascade',
  );
});
