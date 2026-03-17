#!/usr/bin/env node
/**
 * jtmath PDF 자동 업로드 스크립트
 * 
 * 사용법:
 *   1. 맥북 로컬 폴더에 PDF 정리 (아래 폴더 구조 참고)
 *   2. MATERIALS_DIR 경로를 실제 PDF 폴더 경로로 수정
 *   3. node scripts/upload-pdfs.js 실행
 * 
 * 예상 폴더 구조:
 *   materials/
 *     algebra/
 *       delta-0/
 *         week1/
 *           lesson1-level1.pdf   ← 레벨1 자료
 *           lesson1-level2.pdf   ← 레벨2 자료
 *           lesson2-level1.pdf
 *         week2/
 *           ...
 *     common-math-1/
 *       delta-0/
 *         ...
 */

const fs = require('fs');
const path = require('path');

// ── 설정 ──────────────────────────────────────────────────────
const MATERIALS_DIR = path.join(__dirname, '..', 'materials'); // 수정 가능
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role key 필요
const STORAGE_BUCKET = 'course-materials';
// ─────────────────────────────────────────────────────────────

async function uploadFile(localPath, storagePath) {
  const fileBuffer = fs.readFileSync(localPath);
  const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true', // 덮어쓰기 허용
    },
    body: fileBuffer,
  });

  if (res.ok) {
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
    console.log(`✅ 업로드 완료: ${storagePath}`);
    return publicUrl;
  } else {
    const err = await res.text();
    console.error(`❌ 업로드 실패: ${storagePath} →`, err);
    return null;
  }
}

function scanMaterials(dir, basePath = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relPath = basePath ? `${basePath}/${item.name}` : item.name;
    
    if (item.isDirectory()) {
      results.push(...scanMaterials(fullPath, relPath));
    } else if (item.name.toLowerCase().endsWith('.pdf')) {
      results.push({ localPath: fullPath, storagePath: relPath });
    }
  }
  return results;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ .env.local에 SUPABASE_SERVICE_KEY가 없습니다.');
    console.error('   Supabase 대시보드 → Settings → API → service_role key를 .env.local에 추가하세요:');
    console.error('   SUPABASE_SERVICE_KEY=eyJhbGci...');
    process.exit(1);
  }

  if (!fs.existsSync(MATERIALS_DIR)) {
    console.error(`❌ PDF 폴더가 없습니다: ${MATERIALS_DIR}`);
    console.error('   mathgo-web/ 안에 materials/ 폴더를 만들고 PDF를 넣어주세요.');
    process.exit(1);
  }

  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

  const files = scanMaterials(MATERIALS_DIR);
  console.log(`\n📂 PDF ${files.length}개 발견\n`);

  const uploaded = [];
  for (const file of files) {
    const url = await uploadFile(file.localPath, file.storagePath);
    if (url) uploaded.push({ path: file.storagePath, url });
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`✅ 완료: ${uploaded.length}/${files.length}개 업로드`);
  console.log('══════════════════════════════════════════');
  console.log('\n📋 업로드된 파일 목록 (Supabase Storage URL):');
  uploaded.forEach(f => console.log(`  ${f.path}\n    → ${f.url}`));
}

main().catch(console.error);
