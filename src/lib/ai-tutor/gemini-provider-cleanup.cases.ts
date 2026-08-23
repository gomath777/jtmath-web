import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

type ProductionFileCheck = {
  readonly label: string;
  readonly url: URL;
};

const maxPureLoc = 250;
const productionFiles: readonly ProductionFileCheck[] = [
  { label: 'gemini-provider.ts', url: new URL('./gemini-provider.ts', import.meta.url) },
  { label: 'gemini-web-routing.ts', url: new URL('./gemini-web-routing.ts', import.meta.url) },
] as const;

test('Given the Todo5 provider cleanup boundary When production files are measured Then each stays within the 250 pure LOC ceiling', () => {
  for (const file of productionFiles) {
    if (!existsSync(file.url)) continue;
    const pureLoc = countPureLines(readFileSync(file.url, 'utf8'));
    assert.ok(pureLoc <= maxPureLoc, `${file.label} is ${pureLoc} pure LOC`);
  }
});

function countPureLines(source: string): number {
  return source
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.startsWith('--');
    })
    .length;
}
