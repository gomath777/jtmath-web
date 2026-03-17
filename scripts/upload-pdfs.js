#!/usr/bin/env node
/**
 * jtmath PDF 자동 업로드 스크립트
 * 
 * 폴더 구조:
 *   materials/
 *     algebra/delta-0/          ← PDF 파일들을 여기에 넣기
 *       1_1_1_ 거듭제곱과 거듭제곱근.pdf
 *       1_1_2_ 지수의 확장과 지수법칙.pdf
 *       ...
 *     common-math-1/delta-0/
 *     common-math-2/delta-0/
 *     calculus-1/delta-0/
 *     geometry/delta-0/
 * 
 * 실행 방법:
 *   node scripts/upload-pdfs.js
 * 
 * 사전 준비:
 *   .env.local에 SUPABASE_SERVICE_KEY 추가 필요
 *   (Supabase → Settings → API → service_role key)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// ── 설정 ──────────────────────────────────────────────────────
const MATERIALS_DIR = path.join(__dirname, '..', 'materials');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STORAGE_BUCKET = 'course-materials';
// ─────────────────────────────────────────────────────────────

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ .env.local에 SUPABASE_SERVICE_KEY가 없습니다.');
  console.error('   Supabase → Settings → API → service_role key 복사 후 추가:\n');
  console.error('   SUPABASE_SERVICE_KEY=eyJhbGci...\n');
  process.exit(1);
}

async function uploadPdf(localPath, storagePath) {
  const buffer = fs.readFileSync(localPath);
  const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: buffer,
  });

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
  if (res.ok) {
    console.log(`  ✅ ${path.basename(localPath)}`);
    return publicUrl;
  } else {
    const err = await res.text();
    console.error(`  ❌ ${path.basename(localPath)} → ${err}`);
    return null;
  }
}

async function main() {
  if (!fs.existsSync(MATERIALS_DIR)) {
    console.error(`❌ materials 폴더가 없습니다: ${MATERIALS_DIR}`);
    process.exit(1);
  }

  // subject/delta 폴더 구조 스캔 (flat - week 폴더 없음)
  const results = []; // { subject, delta, filename, localPath, storageUrl }

  const subjects = fs.readdirSync(MATERIALS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const subject of subjects) {
    const subjectDir = path.join(MATERIALS_DIR, subject.name);
    const deltas = fs.readdirSync(subjectDir, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const delta of deltas) {
      const deltaDir = path.join(subjectDir, delta.name);
      const pdfs = fs.readdirSync(deltaDir)
        .filter(f => f.toLowerCase().endsWith('.pdf'));

      if (pdfs.length === 0) continue;

      console.log(`\n📂 ${subject.name}/${delta.name} (${pdfs.length}개)`);

      for (const pdf of pdfs) {
        const localPath = path.join(deltaDir, pdf);
        const storagePath = `${subject.name}/${delta.name}/${pdf}`;
        const url = await uploadPdf(localPath, storagePath);
        if (url) results.push({ subject: subject.name, delta: delta.name, filename: pdf, url });
      }
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`✅ 완료: ${results.length}개 업로드`);
  console.log('══════════════════════════════════════════════════\n');

  // 결과 JSON 저장 (DB 업데이트 시 참고용)
  const outputPath = path.join(__dirname, '..', 'uploaded-pdfs.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`📄 결과 저장: uploaded-pdfs.json`);
  console.log('   저한테 이 파일 공유하시면 DB URL 업데이트 해드릴게요!\n');
}

main().catch(console.error);
