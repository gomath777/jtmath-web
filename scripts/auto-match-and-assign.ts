/**
 * 1차시/3차시/5차시 PDF → 영상 자동매칭 + 전체 6차시 학생 배정
 *
 * 1. 홀수 차시(1,3,5)의 레벨3/레벨4-1 PDF를 Claude API로 분석
 * 2. exam_videos 테이블에서 매칭되는 영상 찾기
 * 3. video_group 블록을 PDF 바로 다음에 삽입
 * 4. 6차시 전체를 테스트 학생에게 배정
 * 5. publish_date를 오늘로 변경 (미리보기 가능하게)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { parsePdfWithClaude as parsePdfViaCli, type ParsedProblem as CliParsedProblem } from '../src/lib/parse-pdf';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const sc = createClient(SUPABASE_URL, SUPABASE_KEY);

const DRIVE_BASE = '/Users/cego/Library/CloudStorage/GoogleDrive-gochangeon@gmail.com/My Drive/0lecture_vid/gs1';

// 테스트 학생 ID
const TEST_USER_ID = 'ee58784c-7712-4ee3-941b-4850b6143e6b';
const CURRICULUM_ID = 'cde11e26-320b-4dbd-bbc5-38fe93f19e8c';

// 홀수 차시에서 영상 매칭이 필요한 PDF 파일 경로
const PDFS_TO_MATCH: Record<string, { itemId: string; localPath: string }[]> = {
  '1': [
    {
      itemId: '40b58d0d-1bb4-4441-9eb6-37445d8b41a5',
      localPath: `${DRIVE_BASE}/pdf 1.2 공수1 기출 다항식 나머지정리/다항식 나머지정리 레벨#3.pdf`,
    },
    {
      itemId: '40b58d0d-1bb4-4441-9eb6-37445d8b41a5',
      localPath: `${DRIVE_BASE}/pdf 1.2 공수1 기출 다항식 나머지정리/다항식 나머지정리 레벨#4-1.pdf`,
    },
  ],
  '3': [
    {
      itemId: '9bb645f6-745b-4527-ba9d-e735ab8d0110',
      localPath: `${DRIVE_BASE}/pdf 1.4 공수1 기출 복소수와 이차방정식/복소수와 이차방정식 #3.pdf`,
    },
    {
      itemId: '9bb645f6-745b-4527-ba9d-e735ab8d0110',
      localPath: `${DRIVE_BASE}/pdf 1.4 공수1 기출 복소수와 이차방정식/복소수와 이차방정식 #4-1.pdf`,
    },
  ],
  '5': [
    {
      itemId: '67592076-26df-4940-89ed-4f29340226c4',
      localPath: `${DRIVE_BASE}/pdf 1.6 공수1 기출 이차방정식과 이차함수/이차방정식과 이차함수 #3.pdf`,
    },
    {
      itemId: '67592076-26df-4940-89ed-4f29340226c4',
      localPath: `${DRIVE_BASE}/pdf 1.6 공수1 기출 이차방정식과 이차함수/이차방정식과 이차함수 #4-1.pdf`,
    },
  ],
};

// 전체 curriculum_item IDs
const ALL_ITEMS = [
  { session: 1, id: '40b58d0d-1bb4-4441-9eb6-37445d8b41a5' },
  { session: 2, id: '16941583-c033-4f0c-9bb6-23660eaa4f91' },
  { session: 3, id: '9bb645f6-745b-4527-ba9d-e735ab8d0110' },
  { session: 4, id: '42841f9c-ff0d-4da4-bac4-a9f011cf6318' },
  { session: 5, id: '67592076-26df-4940-89ed-4f29340226c4' },
  { session: 6, id: '5e75b7cc-1bf5-4aec-878c-42a0ceb1d744' },
];

interface ParsedProblem {
  problem_number: number;
  year: number | null;
  month: number | null;
  grade: number | null;
  problem: number | null;
  raw_text: string;
}

// Claude CLI 서브프로세스 사용 — Anthropic API 키 크레딧 안 씀.
// (이전엔 anthropic.messages.create 직접 호출이라 PDF당 크레딧 소모됨)
async function parsePdfWithClaude(pdfPath: string): Promise<ParsedProblem[]> {
  const fileBuffer = fs.readFileSync(pdfPath);
  console.log(`    Claude CLI 호출 중... (${Math.round(fileBuffer.length / 1024)}KB)`);
  try {
    const parsed = await parsePdfViaCli(fileBuffer);
    return parsed as CliParsedProblem[] as ParsedProblem[];
  } catch (err) {
    console.log(`    ⚠️ 파싱 실패: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

async function matchVideos(problems: ParsedProblem[]): Promise<{
  bunny_video_id: string;
  title: string;
  problem_number: number;
  raw_text: string;
}[]> {
  const matched = [];

  for (const p of problems) {
    if (!p.year || !p.month || !p.grade || !p.problem) continue;

    const { data } = await sc
      .from('exam_videos')
      .select('id, bunny_video_id, title')
      .eq('year', p.year)
      .eq('month', p.month)
      .eq('grade', p.grade)
      .eq('problem', p.problem)
      .eq('subject_slug', 'gs1')
      .eq('is_published', true)
      .eq('is_chapter_summary', false)
      .not('bunny_video_id', 'is', null)
      .limit(1)
      .single();

    if (data) {
      matched.push({
        bunny_video_id: data.bunny_video_id,
        title: data.title,
        problem_number: p.problem_number,
        raw_text: p.raw_text,
      });
    }
  }

  return matched;
}

async function insertVideoGroupAfterPdf(
  curriculumItemId: string,
  pdfBlockId: string,
  pdfOrderIndex: number,
  matchedVideos: { bunny_video_id: string; title: string; problem_number: number; raw_text: string }[],
  parsedProblems: ParsedProblem[],
  pdfContent: Record<string, unknown>
) {
  const videoOrderIndex = pdfOrderIndex + 1;

  // 이후 블록들을 1칸씩 밀기
  const { data: laterBlocks } = await sc
    .from('session_blocks')
    .select('id, order_index')
    .eq('curriculum_item_id', curriculumItemId)
    .gte('order_index', videoOrderIndex)
    .neq('id', pdfBlockId)
    .order('order_index', { ascending: false });

  if (laterBlocks && laterBlocks.length > 0) {
    for (const b of laterBlocks) {
      await sc.from('session_blocks').update({ order_index: b.order_index + 1 }).eq('id', b.id);
    }
  }

  // PDF 블록에 parsed_problems 저장
  await sc.from('session_blocks').update({
    content: { ...pdfContent, parsed_problems: parsedProblems },
  }).eq('id', pdfBlockId);

  // video_group 블록 삽입
  const { data: videoBlock, error } = await sc
    .from('session_blocks')
    .insert({
      curriculum_item_id: curriculumItemId,
      block_type: 'video_group',
      order_index: videoOrderIndex,
      content: {
        videos: matchedVideos,
        linked_pdf_block_id: pdfBlockId,
      },
    })
    .select('*')
    .single();

  if (error) {
    console.log(`    ❌ video_group 삽입 실패: ${error.message}`);
  }

  return videoBlock;
}

async function main() {
  console.log('=== STEP 1: 홀수 차시 PDF → 영상 자동매칭 ===\n');

  for (const [sessionNum, pdfs] of Object.entries(PDFS_TO_MATCH)) {
    console.log(`\n--- ${sessionNum}차시 영상매칭 ---`);

    for (const pdf of pdfs) {
      const fileName = pdf.localPath.split('/').pop()!;
      console.log(`  📄 ${fileName}`);

      // PDF 블록 찾기
      const { data: blocks } = await sc
        .from('session_blocks')
        .select('id, order_index, content')
        .eq('curriculum_item_id', pdf.itemId)
        .eq('block_type', 'pdf')
        .order('order_index');

      const pdfBlock = blocks?.find(b =>
        (b.content as any).original_name === fileName
      );

      if (!pdfBlock) {
        console.log(`    ⚠️ DB에서 블록을 찾을 수 없음`);
        continue;
      }

      // Claude API로 PDF 분석
      const problems = await parsePdfWithClaude(pdf.localPath);
      console.log(`    📋 ${problems.length}개 문제 추출됨`);
      problems.forEach(p => {
        console.log(`       ${p.problem_number}번: ${p.raw_text}`);
      });

      // exam_videos에서 매칭
      const matchedVideos = await matchVideos(problems);
      console.log(`    🎬 ${matchedVideos.length}/${problems.length}개 영상 매칭됨`);
      matchedVideos.forEach(v => {
        console.log(`       ✅ ${v.raw_text} → ${v.title}`);
      });

      if (matchedVideos.length > 0) {
        // video_group 블록 삽입
        await insertVideoGroupAfterPdf(
          pdf.itemId,
          pdfBlock.id,
          pdfBlock.order_index,
          matchedVideos,
          problems,
          pdfBlock.content as Record<string, unknown>
        );
        console.log(`    ✅ video_group 블록 삽입 완료 (order_index: ${pdfBlock.order_index + 1})`);
      } else {
        console.log(`    ⚠️ 매칭된 영상 없음, video_group 블록 생략`);
      }
    }
  }

  // STEP 2: publish_date를 오늘로 변경
  console.log('\n\n=== STEP 2: publish_date를 오늘로 변경 ===');
  const today = new Date().toISOString().split('T')[0]; // 2026-03-26
  for (const item of ALL_ITEMS) {
    const { error } = await sc
      .from('curriculum_items')
      .update({ publish_date: today })
      .eq('id', item.id);
    if (error) {
      console.log(`  ❌ ${item.session}차시 publish_date 변경 실패: ${error.message}`);
    } else {
      console.log(`  ✅ ${item.session}차시 → ${today}`);
    }
  }

  // STEP 3: 테스트 학생에게 6차시 전부 배정
  console.log('\n\n=== STEP 3: 학생 배정 ===');

  // 기존 배정 중 이 커리큘럼 관련 것 확인
  const { data: existingAssignments } = await sc
    .from('assignments')
    .select('id, curriculum_item_id')
    .eq('user_id', TEST_USER_ID)
    .eq('curriculum_id', CURRICULUM_ID);

  const existingItemIds = new Set(existingAssignments?.map(a => a.curriculum_item_id) || []);
  console.log(`  기존 배정: ${existingAssignments?.length || 0}개`);

  // 각 차시의 set_id 필요 — assignments 테이블에 set_id가 필수인지 확인
  // 기존 assignment에서 set_id 가져오기
  const { data: anyAssignment } = await sc
    .from('assignments')
    .select('set_id')
    .eq('user_id', TEST_USER_ID)
    .limit(1)
    .single();

  const defaultSetId = anyAssignment?.set_id || null;
  console.log(`  기본 set_id: ${defaultSetId}`);

  for (const item of ALL_ITEMS) {
    if (existingItemIds.has(item.id)) {
      console.log(`  ${item.session}차시: 이미 배정됨, 건너뜀`);
      continue;
    }

    const { error } = await sc.from('assignments').insert({
      user_id: TEST_USER_ID,
      curriculum_id: CURRICULUM_ID,
      curriculum_item_id: item.id,
      set_id: defaultSetId,
      label: `${Math.ceil(item.session / 2)}주차 ${item.session}차시`,
      week_number: Math.ceil(item.session / 2),
      session_number: item.session,
      published_at: new Date().toISOString(),
    });

    if (error) {
      console.log(`  ❌ ${item.session}차시 배정 실패: ${error.message}`);
    } else {
      console.log(`  ✅ ${item.session}차시 배정 완료`);
    }
  }

  // STEP 4: 최종 블록 상태 확인
  console.log('\n\n=== STEP 4: 최종 블록 구조 확인 ===');
  for (const item of ALL_ITEMS) {
    const { data: blocks } = await sc
      .from('session_blocks')
      .select('block_type, order_index, content')
      .eq('curriculum_item_id', item.id)
      .order('order_index');

    console.log(`\n  ${item.session}차시 (${blocks?.length}개 블록):`);
    blocks?.forEach(b => {
      const c = b.content as any;
      const label = c.title || c.original_name || c.body || (c.videos ? `${c.videos.length}개 영상` : '');
      console.log(`    ${b.order_index}. [${b.block_type}] ${label}`);
    });
  }

  console.log('\n\n=== 완료 ===');
  console.log(`학생 세션 페이지 확인: /dashboard/learning/session/{item_id}`);
  ALL_ITEMS.forEach(item => {
    console.log(`  ${item.session}차시: /dashboard/learning/session/${item.id}`);
  });
}

main().catch(console.error);
