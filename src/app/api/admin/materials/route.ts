import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { uploadPdf, generateStoragePath } from '@/utils/bunny-storage';

type AudienceType = 'all' | 'student' | 'curriculum';

// ───────── GET: List all materials (admin view) ─────────
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: materials, error } = await sc
    .from('shared_materials')
    .select(`
      id, title, description, original_filename, cdn_url, file_size_bytes,
      audience, profile_id, curriculum_id, uploaded_at,
      profiles:profile_id ( name ),
      curricula:curriculum_id ( title, subject_slug )
    `)
    .order('uploaded_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ materials: materials || [] });
}

// ───────── POST: Upload a new shared material ─────────
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const pdfFile = formData.get('pdf') as File | null;
  const title = (formData.get('title') as string | null)?.trim();
  const description = (formData.get('description') as string | null)?.trim() || null;
  const audience = formData.get('audience') as AudienceType | null;
  const profileId = formData.get('profile_id') as string | null;
  const curriculumId = formData.get('curriculum_id') as string | null;

  // ── Validate required ──
  if (!pdfFile) {
    return NextResponse.json({ error: 'PDF 파일이 필요합니다' }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: '자료 제목이 필요합니다' }, { status: 400 });
  }
  if (!audience || !['all', 'student', 'curriculum'].includes(audience)) {
    return NextResponse.json(
      { error: "audience는 'all' | 'student' | 'curriculum' 중 하나여야 합니다" },
      { status: 400 },
    );
  }
  if (audience === 'student' && !profileId) {
    return NextResponse.json({ error: '개별 학생 자료는 profile_id 필요' }, { status: 400 });
  }
  if (audience === 'curriculum' && !curriculumId) {
    return NextResponse.json({ error: '커리큘럼 자료는 curriculum_id 필요' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // ── Build sub-path for Bunny storage (keeps files organized) ──
  let subPath = 'all';
  if (audience === 'student' && profileId) {
    const { data: p } = await sc.from('profiles').select('name').eq('id', profileId).single();
    subPath = `student/${p?.name || profileId}`;
  } else if (audience === 'curriculum' && curriculumId) {
    const { data: c } = await sc.from('curricula').select('subject_slug').eq('id', curriculumId).single();
    subPath = `curriculum/${c?.subject_slug || curriculumId}`;
  }

  // ── Upload to Bunny Storage ──
  const bytes = await pdfFile.arrayBuffer();
  const storagePath = generateStoragePath('shared', subPath, pdfFile.name);

  let cdnUrl: string;
  try {
    const result = await uploadPdf(bytes, storagePath);
    cdnUrl = result.cdnUrl;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Bunny 업로드 실패' },
      { status: 500 },
    );
  }

  // ── Create DB record ──
  const { data: material, error } = await sc
    .from('shared_materials')
    .insert({
      title,
      description,
      original_filename: pdfFile.name,
      storage_path: storagePath,
      cdn_url: cdnUrl,
      file_size_bytes: bytes.byteLength,
      audience,
      profile_id: audience === 'student' ? profileId : null,
      curriculum_id: audience === 'curriculum' ? curriculumId : null,
    })
    .select('id, title, cdn_url, audience, uploaded_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ material });
}
