import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { uploadPdf, generateStoragePath } from '@/utils/bunny-storage';

// POST: Manual odapji upload (admin web UI)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const pdfFile = formData.get('pdf') as File;
  const profileId = formData.get('profile_id') as string;
  const curriculumId = formData.get('curriculum_id') as string | null;

  if (!pdfFile || !profileId) {
    return NextResponse.json({ error: 'pdf, profile_id 필수' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Verify profile exists
  const { data: profile } = await sc
    .from('profiles')
    .select('id, name')
    .eq('id', profileId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: '학생을 찾을 수 없습니다' }, { status: 404 });
  }

  // Upload to Bunny.net Storage
  const bytes = await pdfFile.arrayBuffer();
  const storagePath = generateStoragePath('odapji', profile.name, pdfFile.name);

  const { cdnUrl } = await uploadPdf(bytes, storagePath);

  // Create DB record
  const { data: odapji, error } = await sc
    .from('odapji_files')
    .insert({
      profile_id: profileId,
      original_filename: pdfFile.name,
      storage_path: storagePath,
      cdn_url: cdnUrl,
      file_size_bytes: bytes.byteLength,
      curriculum_id: curriculumId || null,
    })
    .select('id, original_filename, cdn_url')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ odapji, studentName: profile.name });
}
