/**
 * CLI 스크립트 공용 헬퍼
 * - 인자 파싱 (--key value, --flag)
 * - Supabase service client
 * - 출력 포맷 (JSON / 테이블)
 */

import { fileURLToPath } from 'url';
import * as path from 'path';
import { config } from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load .env.local from project root.
// `override: true` — 쉘에 이미 있는 빈 env 변수(예: `ANTHROPIC_API_KEY=""`)가
// dotenv의 기본 no-override 정책에 막혀 무시되는 버그 방지. 스크립트는 .env.local을 진실의 원천으로.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

// --- CLI argument parsing ---

export interface ParsedArgs {
  flags: Set<string>;
  options: Record<string, string>;
  positional: string[];
}

export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
  const flags = new Set<string>();
  const options: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        flags.add(key);
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, options, positional };
}

// --- Supabase client ---

export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY 환경변수 필요');
  }
  return createClient(url, key);
}

// --- Output helpers ---

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(rows: Record<string, unknown>[], columns?: string[]): void {
  if (rows.length === 0) {
    console.log('(empty)');
    return;
  }
  const cols = columns || Object.keys(rows[0]);
  const widths = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length)));

  const line = (parts: string[]) => parts.map((p, i) => p.padEnd(widths[i])).join('  ');
  console.log(line(cols));
  console.log(line(cols.map((_, i) => '─'.repeat(widths[i]))));
  rows.forEach(r => console.log(line(cols.map(c => String(r[c] ?? '')))));
}

// --- Logging ---

export function log(emoji: string, msg: string): void {
  console.log(`${emoji} ${msg}`);
}

export function error(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

export function success(msg: string): void {
  console.log(`✅ ${msg}`);
}

export function info(msg: string): void {
  console.log(`ℹ️  ${msg}`);
}

export function warn(msg: string): void {
  console.log(`⚠️  ${msg}`);
}

// --- Dry-run wrapper ---

export function dryRunBanner(isDryRun: boolean): void {
  if (isDryRun) {
    console.log('');
    console.log('🔍 DRY RUN MODE — DB에 실제 변경 없음');
    console.log('');
  }
}

// --- Slug generation ---

export function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomPart = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `jt-${randomPart}`;
}

// --- Required option helper ---

export function required(args: ParsedArgs, key: string): string {
  const val = args.options[key];
  if (!val) error(`--${key} 옵션이 필요합니다`);
  return val;
}

// --- Help text ---

export function printHelp(scriptName: string, usage: string, examples: string[]): void {
  console.log(`사용법: ${usage}`);
  console.log('');
  console.log('예시:');
  examples.forEach(e => console.log(`  ${e}`));
  console.log('');
}

// --- Public slug generation (한글 → 영문 슬러그) ---

const KEYWORD_TO_SLUG: Array<[RegExp, string]> = [
  [/다항식|나머지정리|인수정리/, 'poly'],
  [/삼각함수.*활용|삼각함수활용/, 'trig-app'],
  [/삼각함수/, 'trig'],
  [/순열.*조합|경우의 ?수/, 'permcomb'],
  [/이차방정식|이차함수/, 'quad'],
  [/여러가지 ?방정식|방정식.*부등식|부등식/, 'eqineq'],
  [/지수.*로그|로그/, 'log'],
  [/지수/, 'expn'],
  [/미분/, 'diff'],
  [/적분/, 'integ'],
  [/극한|수열의 ?극한/, 'limit'],
  [/수열/, 'seq'],
  [/확률/, 'prob'],
  [/통계/, 'stat'],
  [/도형의 ?방정식|도형/, 'geom'],
  [/집합|명제/, 'set'],
  [/함수/, 'func'],
  [/벡터/, 'vec'],
];

function transliterateKorean(label: string): string {
  for (const [re, en] of KEYWORD_TO_SLUG) {
    if (re.test(label)) return en;
  }
  return '';
}

export function buildPublicSlug({
  subjectSlug,
  week,
  session,
  label,
  explicitSuffix,
  itemId,
}: {
  subjectSlug: string;
  week: number | null;
  session: number | null;
  label?: string;
  explicitSuffix?: string;
  itemId?: string;
}): string {
  const parts: string[] = [subjectSlug.toLowerCase()];
  if (week != null) parts.push(`w${week}`);
  if (session != null) parts.push(`s${session}`);

  let suffix = explicitSuffix?.trim().toLowerCase() || '';
  if (suffix && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(suffix)) {
    parts.push(suffix);
  } else {
    const auto = label ? transliterateKorean(label) : '';
    if (auto) parts.push(auto);
    else if (itemId) parts.push(itemId.slice(0, 6));
  }
  return parts.join('-');
}
