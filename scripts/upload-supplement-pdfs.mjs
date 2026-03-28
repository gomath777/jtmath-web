/**
 * GS1 보충자료 PDF → Supabase Storage 업로드 스크립트
 *
 * 실행 방법 (mathgo-web 루트에서):
 *   source .env.local && node scripts/upload-supplement-pdfs.mjs
 *
 * 완료 후 SupplementsClient.tsx에서 pdfUrl을 출력된 URL로 교체하세요.
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_KEY 환경변수가 없습니다.');
  console.error('   실행 방법: source .env.local && node scripts/upload-supplement-pdfs.mjs');
  process.exit(1);
}

// ─── 업로드할 PDF 목록 ───────────────────────────────────────────────────────
// PDF 파일들이 위치한 기본 경로 (본인 환경에 맞게 수정)
const GS1_PDF_BASE = process.env.GS1_PDF_BASE ||
  path.join(process.env.HOME, 'Library/CloudStorage/GoogleDrive-gochangeon@gmail.com/My Drive/0lecture_vid/gs1');

const PDFS = [
  {
    localPath: path.join(GS1_PDF_BASE, 'pdf 1.2 공수1 기출 다항식 나머지정리', '다항식 나머지정리 레벨#3.pdf'),
    storagePath: 'supplements/gs1/다항식-나머지정리-레벨3.pdf',
  },
  {
    localPath: path.join(GS1_PDF_BASE, 'pdf 1.2 공수1 기출 다항식 나머지정리', '다항식 나머지정리 레벨#4-1.pdf'),
    storagePath: 'supplements/gs1/다항식-나머지정리-레벨4-1.pdf',
  },
  {
    localPath: path.join(GS1_PDF_BASE, 'pdf 1.4 공수1 기출 복소수와 이차방정식', '복소수와 이차방정식 #3.pdf'),
    storagePath: 'supplements/gs1/복소수와-이차방정식-레벨3.pdf',
  },
  {
    localPath: path.join(GS1_PDF_BASE, 'pdf 1.4 공수1 기출 복소수와 이차방정식', '복소수와 이차방정식 #4-1.pdf'),
    storagePath: 'supplements/gs1/복소수와-이차방정식-레벨4-1.pdf',
  },
  {
    localPath: path.join(GS1_PDF_BASE, 'pdf 1.6 공수1 기출 이차방정식과 이차함수', '이차방정식과 이차함수 #3.pdf'),
    storagePath: 'supplements/gs1/이차방정식과-이차함수-레벨3.pdf',
  },
  {
    localPath: path.join(GS1_PDF_BASE, 'pdf 1.6 공수1 기출 이차방정식과 이차함수', '이차방정식과 이차함수 #4-1.pdf'),
    storagePath: 'supplements/gs1/이차방정식과-이차함수-레벨4-1.pdf',
  },
];

async function uploadPdf(localPath, storagePath) {
  if (!fs.existsSync(localPath)) {
    console.error(`  ❌ 파일 없음: ${localPath}`);
    return null;
  }

  const fileData = fs.readFileSync(localPath);
  const url = `${SUPABASE_URL}/storage/v1/object/pdfs/${storagePath}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: fileData,
  });

  if (res.ok) {
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/pdfs/${storagePath}`;
    console.log(`  ✅ ${path.basename(storagePath)}`);
    console.log(`     → ${publicUrl}`);
    return publicUrl;
  } else {
    const text = await res.text();
    console.error(`  ❌ ${path.basename(storagePath)}: ${res.status} ${text.slice(0, 100)}`);
    return null;
  }
}

// ─── 메인 실행 ───────────────────────────────────────────────────────────────
console.log('📂 GS1 보충자료 PDF 업로드 시작\n');

const results = {};
for (const { localPath, storagePath } of PDFS) {
  const url = await uploadPdf(localPath, storagePath);
  if (url) results[storagePath] = url;
}

console.log(`\n✅ 완료: ${Object.keys(results).length}/${PDFS.length}개 업로드`);

if (Object.keys(results).length > 0) {
  console.log('\n─── SupplementsClient.tsx에 복사할 URL ───');
  console.log('아래 값을 SupplementsClient.tsx의 pdfUrl 필드에 순서대로 입력하세요:\n');

  const mapping = {
    '다항식-나머지정리-레벨3.pdf':       '레벨3 > 1단원 (다항식/나머지정리)',
    '다항식-나머지정리-레벨4-1.pdf':     '레벨4 > 1단원 (다항식/나머지정리)',
    '복소수와-이차방정식-레벨3.pdf':      '레벨3 > 2단원 (복소수/이차방정식)',
    '복소수와-이차방정식-레벨4-1.pdf':   '레벨4 > 2단원 (복소수/이차방정식)',
    '이차방정식과-이차함수-레벨3.pdf':    '레벨3 > 3단원 (이차방정식/이차함수)',
    '이차방정식과-이차함수-레벨4-1.pdf': '레벨4 > 3단원 (이차방정식/이차함수)',
  };

  for (const [key, label] of Object.entries(mapping)) {
    const fullKey = `supplements/gs1/${key}`;
    const url = results[fullKey];
    if (url) console.log(`${label}:\n  pdfUrl: '${url}'\n`);
  }
}
