import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// POST: Release curriculum items + generate KakaoTalk messages
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { curriculum_item_ids, curriculum_id, up_to_session } = await req.json();

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Determine which items to release
  let itemIds: string[] = [];

  if (curriculum_item_ids && Array.isArray(curriculum_item_ids)) {
    itemIds = curriculum_item_ids;
  } else if (curriculum_id && up_to_session) {
    // Release all sessions up to a given session number
    const { data: items } = await sc
      .from('curriculum_items')
      .select('id')
      .eq('curriculum_id', curriculum_id)
      .lte('session_number', up_to_session)
      .eq('is_released', false);
    itemIds = (items || []).map(i => i.id);
  }

  if (itemIds.length === 0) {
    return NextResponse.json({ error: '릴리즈할 차시가 없습니다' }, { status: 400 });
  }

  // Release items
  const { error: releaseError } = await sc
    .from('curriculum_items')
    .update({ is_released: true })
    .in('id', itemIds);

  if (releaseError) {
    return NextResponse.json({ error: releaseError.message }, { status: 500 });
  }

  // Get released items with curriculum info
  const { data: releasedItems } = await sc
    .from('curriculum_items')
    .select('id, curriculum_id, week_number, session_number, label')
    .in('id', itemIds);

  if (!releasedItems || releasedItems.length === 0) {
    return NextResponse.json({ released: 0, messages: [] });
  }

  // Get curriculum info
  const curriculumIds = Array.from(new Set(releasedItems.map(i => i.curriculum_id)));
  const { data: curricula } = await sc
    .from('curricula')
    .select('id, title, subject_slug')
    .in('id', curriculumIds);

  const curriculumMap = new Map((curricula || []).map(c => [c.id, c]));

  // Get students assigned to these curricula
  const { data: links } = await sc
    .from('student_curriculum_links')
    .select('profile_id, curriculum_id')
    .in('curriculum_id', curriculumIds);

  const profileIds = Array.from(new Set((links || []).map(l => l.profile_id)));

  if (profileIds.length === 0) {
    return NextResponse.json({
      released: itemIds.length,
      messages: [],
      note: '배정된 학생이 없습니다',
    });
  }

  // Get student tokens and names
  const { data: tokens } = await sc
    .from('student_tokens')
    .select('profile_id, slug, profiles!inner(name)')
    .in('profile_id', profileIds)
    .eq('is_active', true);

  // Generate KakaoTalk messages per student
  const messages: Array<{
    studentName: string;
    slug: string;
    message: string;
    curricula: string[];
  }> = [];

  for (const token of (tokens || [])) {
    const studentCurriculumIds = (links || [])
      .filter(l => l.profile_id === token.profile_id)
      .map(l => l.curriculum_id);

    const studentItems = releasedItems.filter(i =>
      studentCurriculumIds.includes(i.curriculum_id),
    );

    if (studentItems.length === 0) continue;

    // Build message for each released session
    const sessionLines = studentItems.map(item => {
      const curriculum = curriculumMap.get(item.curriculum_id);
      return `${curriculum?.title || ''} ${item.week_number}주차 ${item.session_number}차시`;
    });

    const profileData = token.profiles as unknown as { name: string };
    const studentName = profileData?.name || '';

    const message = [
      `[고T수학] ${sessionLines.join(', ')}`,
      '',
      `${studentItems[0].label || sessionLines[0]} 학습이 올라왔습니다!`,
      '',
      `학습 페이지: jtmath.kr/s/${token.slug}`,
      '',
      '문제 풀고 매쓰플랫에서 답안 제출 후 카톡 주세요~',
    ].join('\n');

    messages.push({
      studentName,
      slug: token.slug,
      message,
      curricula: sessionLines,
    });
  }

  return NextResponse.json({
    released: itemIds.length,
    messages,
  });
}
