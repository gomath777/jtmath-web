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

// Load .env.local from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../.env.local') });

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
