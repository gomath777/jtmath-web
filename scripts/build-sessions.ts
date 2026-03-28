/**
 * 1주~3주(6차시) 블록 자동 생성 스크립트
 *
 * 노션 페이지 구조 기반:
 * - 1차시(홀수): 기출 레벨4 해설강의 + 올스캔 (영상 자동매칭)
 * - 2차시(짝수): 심화유형 3배수 + 힌트북 + 올스캔 (영상 없음)
 *
 * 실행: npx tsx scripts/build-sessions.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const sc = createClient(SUPABASE_URL, SUPABASE_KEY);

const DRIVE_BASE = '/Users/cego/Library/CloudStorage/GoogleDrive-gochangeon@gmail.com/My Drive/0lecture_vid/gs1';

// 차시별 콘텐츠 매핑 (노션 기반)
// 1주 1차시: 다항식과 나머지정리 - 기출 레벨3 해설 + 기출 레벨4-1 해설 + 올스캔#1
// 1주 2차시: 다항식과 나머지정리 - 심화유형 3배수 1단계/2단계 + 힌트북 + 기출레벨4-2 + 올스캔#2
// 2주 3차시: 복소수와 이차방정식 - 기출 레벨3 해설 + 기출 레벨4-1 해설 + 올스캔#3
// 2주 4차시: 복소수와 이차방정식 - 심화유형 3배수 1단계/2단계 + 힌트북 + 기출레벨4-2 + 올스캔#4
// 3주 5차시: 이차방정식과 이차함수 - 기출 레벨3 해설 + 기출 레벨4-1 해설 + 올스캔#5
// 3주 6차시: 이차방정식과 이차함수 - 심화유형 3배수 1단계/2단계 + 힌트북 + 기출레벨4-2 + 올스캔#6

interface BlockDef {
  block_type: 'section_header' | 'pdf' | 'hintbook' | 'video_group' | 'text';
  content: Record<string, unknown>;
  pdf_path?: string; // 로컬 PDF 경로 (업로드용)
  auto_match?: boolean; // 해설영상 자동매칭 여부
}

const SESSION_BLOCKS: Record<number, BlockDef[]> = {
  // 1주 1차시: 다항식과 나머지정리 (해설영상 포함)
  1: [
    { block_type: 'text', content: { body: '힌트북으로 해결 안되는 경우 질문 카톡 보내주세요! 영상해설 보내드립니다' } },
    { block_type: 'section_header', content: { title: '공수1 기출 다항식과 나머지정리 레벨3 해설강의', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.2 공수1 기출 다항식 나머지정리/다항식 나머지정리 레벨#3.pdf`, auto_match: true },
    { block_type: 'section_header', content: { title: '공수1 기출 다항식과 나머지정리 레벨4-1 해설강의', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.2 공수1 기출 다항식 나머지정리/다항식 나머지정리 레벨#4-1.pdf`, auto_match: true },
    { block_type: 'section_header', content: { title: '유형 올 스캔 (중간 전 범위) 앱 제출 후 카톡하기', color: 'dark' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf0 공수1 유형 올 스캔/올 스캔 중간범위#1.pdf` },
    { block_type: 'text', content: { body: '중간고사 전 범위 감각 유지를 위한 문제입니다' } },
  ],

  // 1주 2차시: 다항식과 나머지정리 (힌트북, 영상 없음)
  2: [
    { block_type: 'text', content: { body: '힌트북으로 해결 안되는 경우 질문 카톡 보내주세요! 영상해설 보내드립니다' } },
    { block_type: 'section_header', content: { title: '심화유형 문제 및 힌트북 (앱 제출 후 카톡하기)', color: 'green' } },
    // 심화유형 1단계
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.1 공수1심화유형 다항식 나머지정리 3배수/다항식 나머지정리 3배수 1단계.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.1 공수1심화유형 다항식 나머지정리 3배수/[힌트북] 다항식 나머지정리 3배수 1단계.pdf` },
    // 심화유형 2단계
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.1 공수1심화유형 다항식 나머지정리 3배수/다항식 나머지정리 3배수 2단계.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.1 공수1심화유형 다항식 나머지정리 3배수/[힌트북] 다항식 나머지정리 3배수 2단계.pdf` },
    { block_type: 'section_header', content: { title: '교육청 기출 레벨4 문제 및 힌트북 (앱 제출 후 카톡하기)', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.2 공수1 기출 다항식 나머지정리/다항식 나머지정리 레벨#4-2.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.2 공수1 기출 다항식 나머지정리/[힌트북] 다항식 나머지정리 레벨4-2.pdf` },
    { block_type: 'section_header', content: { title: '유형 올 스캔 (중간 전 범위) 앱 제출 후 카톡하기', color: 'dark' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf0 공수1 유형 올 스캔/올 스캔 중간범위#2.pdf` },
    { block_type: 'text', content: { body: '중간고사 전 범위 감각 유지를 위한 문제입니다' } },
    { block_type: 'section_header', content: { title: '(선택제출) 고난도 추가문제', color: 'red' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.1 공수1심화유형 다항식 나머지정리 3배수/다항식 나머지정리 3배수 3단계.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.1 공수1심화유형 다항식 나머지정리 3배수/[힌트북] 다항식 나머지정리 3배수 3단계.pdf` },
  ],

  // 2주 3차시: 복소수와 이차방정식 (해설영상 포함)
  3: [
    { block_type: 'text', content: { body: '힌트북으로 해결 안되는 경우 질문 카톡 보내주세요! 영상해설 보내드립니다' } },
    { block_type: 'section_header', content: { title: '공수1 기출 복소수와 이차방정식 레벨3 해설강의', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.4 공수1 기출 복소수와 이차방정식/복소수와 이차방정식 #3.pdf`, auto_match: true },
    { block_type: 'section_header', content: { title: '공수1 기출 복소수와 이차방정식 레벨4-1 해설강의', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.4 공수1 기출 복소수와 이차방정식/복소수와 이차방정식 #4-1.pdf`, auto_match: true },
    { block_type: 'section_header', content: { title: '유형 올 스캔 (중간 전 범위) 앱 제출 후 카톡하기', color: 'dark' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf0 공수1 유형 올 스캔/올 스캔 중간범위#3.pdf` },
    { block_type: 'text', content: { body: '중간고사 전 범위 감각 유지를 위한 문제입니다' } },
  ],

  // 2주 4차시: 복소수와 이차방정식 (힌트북, 영상 없음)
  4: [
    { block_type: 'text', content: { body: '힌트북으로 해결 안되는 경우 질문 카톡 보내주세요! 영상해설 보내드립니다' } },
    { block_type: 'section_header', content: { title: '심화유형 문제 및 힌트북 (앱 제출 후 카톡하기)', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.2 공수1심화유형 복소수와 이차방정식 3배수/복소수와 이차방정식 3배수 1단계.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.2 공수1심화유형 복소수와 이차방정식 3배수/고T의 힌트북 - 복소수와 이차방정식 3배수 1단계.pdf` },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.2 공수1심화유형 복소수와 이차방정식 3배수/복소수와 이차방정식 3배수 2단계.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.2 공수1심화유형 복소수와 이차방정식 3배수/고T의 힌트북 - 복소수와 이차방정식 3배수 2단계.pdf` },
    { block_type: 'section_header', content: { title: '교육청 기출 레벨4 문제 및 힌트북 (앱 제출 후 카톡하기)', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.4 공수1 기출 복소수와 이차방정식/복소수와 이차방정식 #4-2.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.4 공수1 기출 복소수와 이차방정식/고T의 힌트북 - 복소수와 이차방정식 4-2.pdf` },
    { block_type: 'section_header', content: { title: '유형 올 스캔 (중간 전 범위) 앱 제출 후 카톡하기', color: 'dark' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf0 공수1 유형 올 스캔/올 스캔 중간범위#4.pdf` },
    { block_type: 'text', content: { body: '중간고사 전 범위 감각 유지를 위한 문제입니다' } },
    { block_type: 'section_header', content: { title: '(선택제출) 고난도 추가문제', color: 'red' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.2 공수1심화유형 복소수와 이차방정식 3배수/복소수와 이차방정식 3배수 3단계.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.2 공수1심화유형 복소수와 이차방정식 3배수/고T의 힌트북 - 복소수와 이차방정식 3배수 3단계.pdf` },
  ],

  // 3주 5차시: 이차방정식과 이차함수 (해설영상 포함)
  5: [
    { block_type: 'text', content: { body: '힌트북으로 해결 안되는 경우 질문 카톡 보내주세요! 영상해설 보내드립니다' } },
    { block_type: 'section_header', content: { title: '공수1 기출 이차방정식과 이차함수 레벨3 해설강의', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.6 공수1 기출 이차방정식과 이차함수/이차방정식과 이차함수 #3.pdf`, auto_match: true },
    { block_type: 'section_header', content: { title: '공수1 기출 이차방정식과 이차함수 레벨4-1 해설강의', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.6 공수1 기출 이차방정식과 이차함수/이차방정식과 이차함수 #4-1.pdf`, auto_match: true },
    { block_type: 'section_header', content: { title: '유형 올 스캔 (중간 전 범위) 앱 제출 후 카톡하기', color: 'dark' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf0 공수1 유형 올 스캔/올 스캔 중간범위#5.pdf` },
    { block_type: 'text', content: { body: '중간고사 전 범위 감각 유지를 위한 문제입니다' } },
  ],

  // 3주 6차시: 이차방정식과 이차함수 (힌트북, 영상 없음)
  6: [
    { block_type: 'text', content: { body: '힌트북으로 해결 안되는 경우 질문 카톡 보내주세요! 영상해설 보내드립니다' } },
    { block_type: 'section_header', content: { title: '심화유형 문제 및 힌트북 (앱 제출 후 카톡하기)', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.3 공수1심화유형 이차방정식과 이차함수 3배수/이차방정식과 이차함수 3배수 1단계.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.3 공수1심화유형 이차방정식과 이차함수 3배수/[힌트북] 이차방정식과 이차함수 3배수 1단계.pdf` },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.3 공수1심화유형 이차방정식과 이차함수 3배수/이차방정식과 이차함수 3배수 2단계.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.3 공수1심화유형 이차방정식과 이차함수 3배수/[힌트북] 이차방정식과 이차함수 3배수 2단계.pdf` },
    { block_type: 'section_header', content: { title: '교육청 기출 레벨4 문제 및 힌트북 (앱 제출 후 카톡하기)', color: 'green' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.6 공수1 기출 이차방정식과 이차함수/이차방정식과 이차함수 #4-2.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 1.6 공수1 기출 이차방정식과 이차함수/[힌트북] 이차방정식과 이차함수 #4-2.pdf` },
    { block_type: 'section_header', content: { title: '유형 올 스캔 (중간 전 범위) 앱 제출 후 카톡하기', color: 'dark' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf0 공수1 유형 올 스캔/올 스캔 중간범위#6.pdf` },
    { block_type: 'text', content: { body: '중간고사 전 범위 감각 유지를 위한 문제입니다' } },
    { block_type: 'section_header', content: { title: '(선택제출) 고난도 추가문제', color: 'red' } },
    { block_type: 'pdf', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.3 공수1심화유형 이차방정식과 이차함수 3배수/이차방정식과 이차함수 3배수 3단계.pdf` },
    { block_type: 'hintbook', content: {}, pdf_path: `${DRIVE_BASE}/pdf 3.3 공수1심화유형 이차방정식과 이차함수 3배수/[힌트북] 이차방정식과 이차함수 3배수 3단계.pdf` },
  ],
};

async function uploadPdf(filePath: string): Promise<{ storagePath: string; url: string; originalName: string }> {
  const fileBuffer = fs.readFileSync(filePath);
  const originalName = path.basename(filePath);
  const safeName = `session-blocks/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;

  const { data, error } = await sc.storage
    .from('pdfs')
    .upload(safeName, fileBuffer, { contentType: 'application/pdf', upsert: false });

  if (error) throw new Error(`Upload failed for ${originalName}: ${error.message}`);

  const { data: urlData } = sc.storage.from('pdfs').getPublicUrl(data.path);

  return { storagePath: data.path, url: urlData.publicUrl, originalName };
}

async function main() {
  console.log('=== 커리큘럼 차시 ID 조회 ===');

  // 공수1 델타1 기말범위 커리큘럼의 차시들 가져오기
  const { data: items, error } = await sc
    .from('curriculum_items')
    .select('id, curriculum_id, week_number, session_number, label, publish_date')
    .order('session_number', { ascending: true });

  if (error || !items) {
    console.error('차시 조회 실패:', error);
    return;
  }

  console.log(`총 ${items.length}개 차시 발견`);

  // 1~6차시만 처리
  for (let sessionNum = 1; sessionNum <= 6; sessionNum++) {
    const item = items.find(i => i.session_number === sessionNum);
    if (!item) {
      console.log(`  ${sessionNum}차시: 찾을 수 없음, 건너뜀`);
      continue;
    }

    const blockDefs = SESSION_BLOCKS[sessionNum];
    if (!blockDefs) continue;

    console.log(`\n=== ${item.week_number}주차 ${sessionNum}차시 (${item.id}) ===`);

    // 기존 블록 삭제
    const { data: existingBlocks } = await sc
      .from('session_blocks')
      .select('id')
      .eq('curriculum_item_id', item.id);

    if (existingBlocks && existingBlocks.length > 0) {
      console.log(`  기존 블록 ${existingBlocks.length}개 삭제`);
      await sc.from('session_blocks').delete().eq('curriculum_item_id', item.id);
    }

    // 블록 생성
    for (let i = 0; i < blockDefs.length; i++) {
      const def = blockDefs[i];
      let content = { ...def.content };

      // PDF 파일이 있으면 업로드
      if (def.pdf_path) {
        if (!fs.existsSync(def.pdf_path)) {
          console.log(`  [${i}] ⚠️  파일 없음: ${path.basename(def.pdf_path)}`);
          continue;
        }
        try {
          const uploaded = await uploadPdf(def.pdf_path);
          content = {
            storage_path: uploaded.storagePath,
            url: uploaded.url,
            filename: uploaded.storagePath,
            original_name: uploaded.originalName,
          };
          console.log(`  [${i}] ✅ 업로드: ${uploaded.originalName}`);
        } catch (err) {
          console.log(`  [${i}] ❌ 업로드 실패: ${err}`);
          continue;
        }
      } else {
        console.log(`  [${i}] ✅ ${def.block_type}: ${(def.content.title as string) || (def.content.body as string) || ''}`);
      }

      const { error: insertError } = await sc
        .from('session_blocks')
        .insert({
          curriculum_item_id: item.id,
          block_type: def.block_type,
          order_index: i,
          content,
        });

      if (insertError) {
        console.log(`  [${i}] ❌ DB 삽입 실패: ${insertError.message}`);
      }
    }
  }

  console.log('\n=== 완료 ===');
}

main().catch(console.error);
