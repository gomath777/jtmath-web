import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET: 학생 목록 + 강의 목록 (배정 모달용)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const [studentsRes, coursesRes] = await Promise.all([
    sc.from('profiles').select('id, name, school').order('name'),
    sc.from('courses').select('id, title').eq('is_active', true).order('title'),
  ]);

  return NextResponse.json({
    students: studentsRes.data || [],
    courses: coursesRes.data || [],
  });
}
