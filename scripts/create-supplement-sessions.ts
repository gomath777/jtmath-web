/**
 * gs1 보충자료 학습페이지 생성 스크립트
 * - 레벨3 보충: 다항식#3, 복소수#3, 이차방정식#3 (+ 해설영상 자동매칭)
 * - 레벨4 보충: 다항식#4-1, 복소수#4-1, 이차방정식#4-1 (+ 해설영상 자동매칭)
 * - 학생(58a6f48a) 배정
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

const sc = createClient(SUPABASE_URL, SERVICE_KEY);
const ai = new Anthropic({ apiKey: ANTHROPIC_KEY });

const STUDENT_ID = '58a6f48a-3efd-480f-afce-839c6751f7b9';
const SUBJECT_SLUG = 'gs1';

const BASE = "/Users/cego/Library/CloudStorage/GoogleDrive-gochangeon@gmail.com/My Drive/0lecture_vid/gs1";

const SESSIONS = [
  {
    label: 'gs1 레벨3 보충자료',
    sessionNumber: 1,
    pdfs: [
      { folder: 'pdf 1.2 공수1 기출 다항식 나머지정리', file: '다항식 나머지정리 레벨#3.pdf', sectionTitle: '공수1 기출 다항식과 나머지정리 레벨3 해설강의' },
      { folder: 'pdf 1.4 공수1 기출 복소수와 이차방정식', file: '복소수와 이차방정식 #3.pdf', sectionTitle: '공수1 기출 복소수와 이차방정식 레벨3 해설강의' },
      { folder: 'pdf 1.6 공수1 기출 이차방정식과 이차함수', file: '이차방정식과 이차함수 #3.pdf', sectionTitle: '공수1 기출 이차방정식과 이차함수 레벨3 해설강의' },
    ]
  },
  {
    label: 'gs1 레벨4 보충자료',
    sessionNumber: 2,
    pdfs: [
      { folder: 'pdf 1.2 공수1 기출 다항식 나머지정리', file: '다항식 나머지정리 레벨#4-1.pdf', sectionTitle: '공수1 기출 다항식과 나머지정리 레벨4-1 해설강의' },
      { folder: 'pdf 1.4 공수1 기출 복소수와 이차방정식', file: '복소수와 이차방정식 #4-1.pdf', sectionTitle: '공수1 기출 복소수와 이차방정식 레벨4-1 해설강의' },
      { folder: 'pdf 1.6 공수1 기출 이차방정식과 이차함수', file: '이차방정식과 이차함수 #4-1.pdf', sectionTitle: '공수1 기출 이차방정식과 이차함수 레벨4-1 해설강의' },
    ]
  }
];

// PDF에서 문제 메타데이터 추출
async function parsePdf(filePath: string): Promise<Array<{ number: number; text: string }>> {
  const pdfBuffer = fs.readFileSync(filePath);
  const base64 = pdfBuffer.toString('base64');

  const msg = await ai.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: `이 PDF에서 수능/학력평가 기출 문제 출처 정보를 추출하세요.
각 문제 번호와 출처 텍스트를 찾으세요. 출처 형식: [YYYY년 MM월 고N NN번/XX점] 또는 [YYYY년 N월 고N NN번]
JSON 배열로만 답하세요: [{"number": 1, "text": "[2025년 9월 고1 15번/4점]"}, ...]` }
      ]
    }]
  });

  try {
    const raw = (msg.content[0] as any).text;
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]);
  } catch {
    return [];
  }
}

// 문제 텍스트로 exam_videos 매칭
async function matchVideos(problems: Array<{ number: number; text: string }>) {
  const matched: Array<{ problem_number: number; bunny_video_id: string; title: string; raw_text: string }> = [];

  for (const p of problems) {
    const t = p.text;
    const yearM = t.match(/(\d{4})년/);
    const monthM = t.match(/(\d{1,2})월/);
    const gradeM = t.match(/고(\d)/);
    const problemM = t.match(/\s(\d{1,2})번/);

    if (!yearM || !monthM || !gradeM || !problemM) continue;

    const { data } = await sc
      .from('exam_videos')
      .select('id, bunny_video_id, title')
      .eq('subject_slug', SUBJECT_SLUG)
      .eq('year', parseInt(yearM[1]))
      .eq('month', parseInt(monthM[1]))
      .eq('grade', parseInt(gradeM[1]))
      .eq('problem', problemM[1])
      .eq('is_published', true)
      .limit(1);

    if (data && data.length > 0) {
      matched.push({
        problem_number: p.number,
        bunny_video_id: data[0].bunny_video_id,
        title: data[0].title,
        raw_text: t,
      });
    }
  }

  return matched;
}

// PDF를 Supabase Storage에 업로드
async function uploadPdf(filePath: string, fileName: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const storagePath = `learning-sets/${Date.now()}_${fileName.replace(/[^\w.-]/g, '_')}`;

  const { error } = await sc.storage
    .from('pdfs')
    .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: { publicUrl } } = sc.storage.from('pdfs').getPublicUrl(storagePath);
  return publicUrl;
}

async function main() {
  console.log('=== gs1 보충자료 세션 생성 시작 ===\n');

  // 1. 커리큘럼 생성
  const { data: curriculum, error: currErr } = await sc
    .from('curricula')
    .insert({
      title: 'gs1 기말범위 보충자료',
      subject_slug: SUBJECT_SLUG,
      description: '기말고사 대비 레벨3/4 보충',
      start_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (currErr) throw new Error('커리큘럼 생성 실패: ' + currErr.message);
  console.log(`✅ 커리큘럼 생성: ${curriculum.id}`);

  const today = new Date().toISOString().split('T')[0];
  const itemIds: string[] = [];

  for (const session of SESSIONS) {
    console.log(`\n--- ${session.label} ---`);

    // 2. curriculum_item 생성
    const { data: item, error: itemErr } = await sc
      .from('curriculum_items')
      .insert({
        curriculum_id: curriculum.id,
        label: session.label,
        week_number: 1,
        session_number: session.sessionNumber,
        publish_date: today,
        order_index: session.sessionNumber - 1,
      })
      .select()
      .single();

    if (itemErr) throw new Error('item 생성 실패: ' + itemErr.message);
    console.log(`  ✅ curriculum_item: ${item.id}`);
    itemIds.push(item.id);

    // 3. 안내 텍스트 블록
    await sc.from('session_blocks').insert({
      curriculum_item_id: item.id,
      block_type: 'text',
      order_index: 0,
      content: { body: '힌트북으로 해결 안되는 경우 질문 카톡 보내주세요! 영상해설 보내드립니다' }
    });

    let orderIdx = 1;

    // 4. 각 PDF별 섹션헤더 + PDF + 영상그룹
    for (const pdfInfo of session.pdfs) {
      const filePath = path.join(BASE, pdfInfo.folder, pdfInfo.file);
      console.log(`  📄 처리 중: ${pdfInfo.file}`);

      // 섹션 헤더
      await sc.from('session_blocks').insert({
        curriculum_item_id: item.id,
        block_type: 'section_header',
        order_index: orderIdx++,
        content: { title: pdfInfo.sectionTitle, color: 'green' }
      });

      // PDF 업로드
      const pdfUrl = await uploadPdf(filePath, pdfInfo.file);
      await sc.from('session_blocks').insert({
        curriculum_item_id: item.id,
        block_type: 'pdf',
        order_index: orderIdx++,
        content: { url: pdfUrl, original_name: pdfInfo.file }
      });
      console.log(`    ✅ PDF 업로드 완료`);

      // Claude로 문제 파싱 + 영상 매칭
      console.log(`    🤖 Claude 파싱 중...`);
      const problems = await parsePdf(filePath);
      console.log(`    📋 ${problems.length}개 문제 추출`);

      const videos = await matchVideos(problems);
      console.log(`    🎬 ${videos.length}/${problems.length}개 매칭`);

      if (videos.length > 0) {
        await sc.from('session_blocks').insert({
          curriculum_item_id: item.id,
          block_type: 'video_group',
          order_index: orderIdx++,
          content: { videos }
        });
        console.log(`    ✅ video_group 블록 삽입`);
      }
    }

    // 5. 학생 배정
    const { error: assignErr } = await sc.from('assignments').insert({
      user_id: STUDENT_ID,
      curriculum_id: curriculum.id,
      curriculum_item_id: item.id,
      label: session.label,
      week_number: 1,
      session_number: session.sessionNumber,
      published_at: new Date().toISOString(),
    });

    if (assignErr) {
      console.log(`  ⚠️  배정 실패: ${assignErr.message}`);
    } else {
      console.log(`  ✅ 학생 배정 완료`);
    }
  }

  console.log('\n=== 완료 ===');
  console.log('학생 학습페이지:');
  for (let i = 0; i < itemIds.length; i++) {
    console.log(`  ${SESSIONS[i].label}: /dashboard/learning/session/${itemIds[i]}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
