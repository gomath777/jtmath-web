#!/usr/bin/env npx ts-node
/**
 * 오답지 자동 업로드 파일 워처
 *
 * ~/Downloads 폴더 및 하위 폴더(260411_학습지/ 등)를 모니터링하여
 * [오답] 패턴의 PDF 파일을 감지하고 자동 업로드합니다.
 *
 * 사용법:
 *   npx ts-node scripts/odapji-watcher.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const WATCH_DIR = path.join(process.env.HOME || '~', 'Downloads');
const DONE_DIR = path.join(WATCH_DIR, 'odapji-done');
const API_URL = process.env.ODAPJI_API_URL || 'http://localhost:3000/api/admin/odapji/auto-upload';
const SECRET = process.env.ODAPJI_UPLOAD_SECRET || '';
// Matches: [오답], [오답 1], [오답노트], [오답 2] etc.
const PATTERN = /\[오답[^\]]*\].*\.pdf$/i;
const DEBOUNCE_MS = 3000;

if (!fs.existsSync(DONE_DIR)) {
  fs.mkdirSync(DONE_DIR, { recursive: true });
}

console.log('📂 오답지 워처 시작');
console.log(`   감시: ${WATCH_DIR} (하위폴더 포함)`);
console.log(`   완료: ${DONE_DIR}`);
console.log(`   API: ${API_URL}`);
console.log('');

const processing = new Set<string>();

async function processFile(filePath: string) {
  const filename = path.basename(filePath);

  if (processing.has(filePath)) return;
  processing.add(filePath);

  console.log(`📄 감지: ${filename}`);

  await new Promise(r => setTimeout(r, DEBOUNCE_MS));

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️ 파일이 사라졌습니다: ${filename}`);
    processing.delete(filePath);
    return;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileBase64 = fileBuffer.toString('base64');

    console.log(`   ⬆️ 업로드 중... (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB)`);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SECRET}`,
      },
      body: JSON.stringify({ filename, file_base64: fileBase64 }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`   ✅ ${result.studentName} → 업로드 완료`);

      fs.unlinkSync(filePath);
      console.log(`   🗑️ 원본 삭제 완료`);
    } else {
      console.log(`   ❌ 실패: ${result.error || '알 수 없는 오류'}`);
      if (result.candidates) {
        console.log(`      후보: ${result.candidates.join(', ')}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ 네트워크 오류: ${(err as Error).message}`);
  }

  processing.delete(filePath);
  console.log('');
}

/** Recursively find all matching PDFs in a directory */
function findOdapjiFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'odapji-done' || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findOdapjiFiles(fullPath));
      } else if (entry.isFile() && PATTERN.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch { /* permission errors etc */ }
  return results;
}

// --- Watch Downloads root for new files AND new subdirectories ---
const watchers: fs.FSWatcher[] = [];

function watchDir(dir: string) {
  try {
    const w = fs.watch(dir, (eventType, filename) => {
      if (!filename) return;
      const filePath = path.join(dir, filename);

      setTimeout(() => {
        if (!fs.existsSync(filePath)) return;
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          // New subfolder appeared — watch it and scan for odapji files inside
          console.log(`📁 새 폴더 감지: ${filename}/`);
          watchDir(filePath);
          const subFiles = findOdapjiFiles(filePath);
          subFiles.forEach(f => processFile(f));
        } else if (stat.isFile() && PATTERN.test(filename)) {
          processFile(filePath);
        }
      }, 500);
    });
    watchers.push(w);
  } catch { /* ignore */ }
}

// Watch root
watchDir(WATCH_DIR);

// Watch existing subdirectories (e.g., 260411_학습지/)
try {
  const rootEntries = fs.readdirSync(WATCH_DIR, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'odapji-done') {
      watchDir(path.join(WATCH_DIR, entry.name));
    }
  }
} catch { /* ignore */ }

// Scan for existing matching files (root + subdirectories)
const existingFiles = findOdapjiFiles(WATCH_DIR);
if (existingFiles.length > 0) {
  console.log(`📋 기존 오답지 ${existingFiles.length}개 발견:`);
  existingFiles.forEach(f => console.log(`   - ${path.relative(WATCH_DIR, f)}`));
  console.log('');

  (async () => {
    for (const f of existingFiles) {
      await processFile(f);
    }
  })();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 워처 종료');
  watchers.forEach(w => w.close());
  process.exit(0);
});

console.log('👀 새 오답지 파일 대기 중... (Ctrl+C로 종료)\n');
