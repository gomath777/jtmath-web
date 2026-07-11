#!/usr/bin/env npx tsx

import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import {
  fixtureRosterConfig,
  parseRosterConfig,
  type ParsedRoster,
} from '../../src/lib/summer-5week/roster';

const EVIDENCE_PATH = '.omo/evidence/summer-5week-assigned-subjects/task-1-roster.txt';

function requestedCases(): readonly string[] {
  const cases: string[] = [];
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--case') {
      const value = args[index + 1];
      if (value) cases.push(value);
    }
  }
  return cases.length > 0 ? cases : ['valid-fixture', 'malformed', 'unknown-subject', 'pii-fields'];
}

function assertOk(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function expectError(result: ParsedRoster, code: string): void {
  assertOk(result.kind === 'error' && result.code === code, `expected ${code}`);
}

function runCase(name: string): string {
  switch (name) {
    case 'valid-fixture': {
      const result = fixtureRosterConfig();
      assertOk(result.kind === 'ok', 'fixture roster should parse');
      if (result.kind !== 'ok') return 'valid-fixture: failed';
      const subjectCounts = result.entries.map((entry) => entry.subjects.length).join(',');
      assertOk(result.entries.length === 3, 'duplicate PIN rows should merge');
      assertOk(subjectCounts === '1,2,2', 'expected sanitized subject counts 1,2,2');
      return `valid-fixture: ok entries=${result.entries.length} subjectCounts=${subjectCounts}`;
    }
    case 'malformed': {
      expectError(parseRosterConfig('[{"pin":"100101","subjects":["mj1"]}'), 'malformed');
      return 'malformed: ok rejected';
    }
    case 'unknown-subject': {
      expectError(parseRosterConfig('[{"pin":"100101","subjects":["bad"]}]'), 'unknown_subject');
      return 'unknown-subject: ok rejected';
    }
    case 'pii-fields': {
      expectError(parseRosterConfig('[{"pin":"100101","subjects":["mj1"],"name":"redacted"}]'), 'pii_field');
      return 'pii-fields: ok rejected';
    }
    default:
      throw new Error(`unknown case: ${name}`);
  }
}

async function main(): Promise<void> {
  const lines = requestedCases().map(runCase);
  await mkdir(dirname(EVIDENCE_PATH), { recursive: true });
  await writeFile(EVIDENCE_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log(lines.join('\n'));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
