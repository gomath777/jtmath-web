import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStudentFromRequest } from '@/utils/student-auth';

/**
 * Student-facing shared materials endpoint.
 *
 * Returns materials visible to the requesting student:
 *   1. audience = 'all'
 *   2. audience = 'student' AND profile_id = me
 *   3. audience = 'curriculum' AND curriculum is in my assigned list
 */
export async function GET(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // 1. Look up student's assigned curriculum IDs
  const { data: links } = await sc
    .from('student_curriculum_links')
    .select('curriculum_id')
    .eq('profile_id', student.profileId);

  const curriculumIds = (links || []).map(l => l.curriculum_id);

  // 2. Fetch materials matching ANY of:
  //    - audience='all'
  //    - audience='student' AND profile_id=me
  //    - audience='curriculum' AND curriculum_id IN (my curricula)
  //
  // Supabase's `.or()` with foreign column filters is awkward, so we run it
  // as three queries and merge — still one round-trip for the student, and
  // avoids RPC/stored procs.
  const queries = [
    sc.from('shared_materials')
      .select('id, title, description, original_filename, cdn_url, file_size_bytes, audience, uploaded_at')
      .eq('audience', 'all'),
    sc.from('shared_materials')
      .select('id, title, description, original_filename, cdn_url, file_size_bytes, audience, uploaded_at')
      .eq('audience', 'student')
      .eq('profile_id', student.profileId),
  ];

  if (curriculumIds.length > 0) {
    queries.push(
      sc.from('shared_materials')
        .select('id, title, description, original_filename, cdn_url, file_size_bytes, audience, uploaded_at')
        .eq('audience', 'curriculum')
        .in('curriculum_id', curriculumIds),
    );
  }

  const results = await Promise.all(queries);

  // Collect and dedupe by id, sort newest first
  const seen = new Set<string>();
  const merged: NonNullable<(typeof results)[0]['data']> = [];
  for (const r of results) {
    if (r.error) {
      return NextResponse.json({ error: r.error.message }, { status: 500 });
    }
    for (const row of r.data || []) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        merged.push(row);
      }
    }
  }

  merged.sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
  );

  return NextResponse.json({ materials: merged });
}
