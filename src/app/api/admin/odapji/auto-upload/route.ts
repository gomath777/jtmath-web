import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { uploadPdf, generateStoragePath } from '@/utils/bunny-storage';

// POST: Auto-upload odapji from file watcher script
// Auth: Bearer token (ODAPJI_UPLOAD_SECRET)
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.ODAPJI_UPLOAD_SECRET;

  if (!auth || !secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { filename, file_base64 } = await req.json();

  if (!filename || !file_base64) {
    return NextResponse.json({ error: 'filename, file_base64 필수' }, { status: 400 });
  }

  // Parse student name from filename
  // Patterns seen:
  //   "[오답] 수특유사 상난이도_테스트학생.pdf"         → 테스트학생
  //   "[오답 1] 수특 #123_테스트학생.pdf"              → 테스트학생
  //   "260411_[오답] 수특유사 상난이도_이영민_문제지.pdf" → 이영민
  //
  // Strategy: split by underscore, find the part that looks like a Korean name
  // (2-4 Korean characters), excluding known non-name parts
  // Common non-name Korean words that appear in filenames
  const NON_NAME = new Set(['문제지', '답안지', '해설', '오답', '학습지', '수특', '수특유사', '수특추가', '상난이도', '하난이도', '중난이도', '기출', '교육청', '평가원', '모의고사', '공수', '대수', '확통', '기하', '미적', '수학', '올스캔', '힌트북', '재오답', '유형반복', '지수로그', '나머지정리', '이차방정식', '이차함수', '복소수', '삼각함수', '중간범위']);

  let studentName = '';

  // Strip date prefix (260411_), bracket section, and .pdf
  const cleaned = filename
    .replace(/^\d{6}_/, '')           // remove date prefix
    .replace(/\[오답[^\]]*\]\s*/, '') // remove [오답...]
    .replace(/\.pdf$/i, '');          // remove .pdf

  // Split by underscore — student name is typically the LAST Korean-only part
  const parts = cleaned.split('_').map(s => s.trim()).filter(Boolean);

  // Search from END (name is usually last or second-to-last before 문제지)
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (/^[가-힣]{2,5}$/.test(part) && !NON_NAME.has(part)) {
      studentName = part;
      break;
    }
  }

  // Fallback: look for name in space-separated words (also from end)
  if (!studentName) {
    const words = cleaned.split(/[\s_]+/).filter(Boolean);
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i];
      if (/^[가-힣]{2,5}$/.test(w) && !NON_NAME.has(w)) {
        studentName = w;
        break;
      }
    }
  }

  if (!studentName) {
    return NextResponse.json({
      error: '파일명에서 학생 이름을 추출할 수 없습니다',
      hint: '파일명에 한글 학생 이름(2-4자)을 포함해주세요',
      filename,
      parsed_parts: parts,
    }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Find student by name (exact match first, then partial)
  let profile: { id: string; name: string } | null = null;

  const { data: exactMatch } = await sc
    .from('profiles')
    .select('id, name')
    .eq('name', studentName)
    .limit(1);

  if (exactMatch && exactMatch.length > 0) {
    profile = exactMatch[0];
  } else {
    // Partial match: student name contains the extracted text
    const { data: partialMatch } = await sc
      .from('profiles')
      .select('id, name')
      .ilike('name', `%${studentName}%`)
      .limit(5);

    if (partialMatch && partialMatch.length === 1) {
      profile = partialMatch[0];
    } else if (partialMatch && partialMatch.length > 1) {
      return NextResponse.json({
        error: '학생 이름이 여러 명과 매칭됩니다',
        candidates: partialMatch.map(p => p.name),
        filename,
      }, { status: 409 });
    }
  }

  if (!profile) {
    return NextResponse.json({
      error: `학생 "${studentName}"을 찾을 수 없습니다`,
      filename,
    }, { status: 404 });
  }

  // Upload to Bunny.net Storage
  const buffer = Buffer.from(file_base64, 'base64');
  const storagePath = generateStoragePath('odapji', profile.name, filename);

  const { cdnUrl } = await uploadPdf(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), storagePath);

  // Create DB record
  const { data: odapji, error } = await sc
    .from('odapji_files')
    .insert({
      profile_id: profile.id,
      original_filename: filename,
      storage_path: storagePath,
      cdn_url: cdnUrl,
      file_size_bytes: buffer.length,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    studentName: profile.name,
    odapjiId: odapji?.id,
    cdnUrl,
  });
}
