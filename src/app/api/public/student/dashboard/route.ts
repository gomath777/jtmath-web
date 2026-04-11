import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStudentFromRequest, renewToken, setStudentCookie } from '@/utils/student-auth';

export async function GET(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Get student profile
  const { data: profile } = await sc
    .from('profiles')
    .select('id, name, school')
    .eq('id', student.profileId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 });
  }

  // Get assigned curricula
  const { data: links } = await sc
    .from('student_curriculum_links')
    .select('curriculum_id')
    .eq('profile_id', student.profileId);

  const curriculumIds = (links || []).map(l => l.curriculum_id);

  if (curriculumIds.length === 0) {
    const newToken = await renewToken(student);
    const res = NextResponse.json({
      profile: { name: profile.name, school: profile.school },
      curricula: [],
      odapjiCount: 0,
    });
    return setStudentCookie(res, newToken);
  }

  // Get curricula with their items
  const { data: curricula } = await sc
    .from('curricula')
    .select('id, title, subject_slug, start_date')
    .in('id', curriculumIds);

  // Get released curriculum items
  const { data: items } = await sc
    .from('curriculum_items')
    .select('id, curriculum_id, week_number, session_number, label, publish_date, is_released')
    .in('curriculum_id', curriculumIds)
    .eq('is_released', true)
    .order('week_number', { ascending: true })
    .order('session_number', { ascending: true });

  // Get video watch progress for all videos in these sessions
  const { data: progressData } = await sc
    .from('video_watch_progress')
    .select('bunny_video_id, completed')
    .eq('user_id', student.profileId);

  const completedVideoIds = new Set(
    (progressData || []).filter(p => p.completed).map(p => p.bunny_video_id),
  );

  // Get session blocks to determine completion per session
  const itemIds = (items || []).map(i => i.id);
  const sessionVideoMap: Record<string, string[]> = {};

  if (itemIds.length > 0) {
    const { data: blocks } = await sc
      .from('session_blocks')
      .select('curriculum_item_id, content, block_type')
      .in('curriculum_item_id', itemIds)
      .eq('block_type', 'video_group');

    (blocks || []).forEach(b => {
      const videos = (b.content as { videos?: Array<{ bunny_video_id: string }> })?.videos || [];
      if (videos.length > 0) {
        if (!sessionVideoMap[b.curriculum_item_id]) sessionVideoMap[b.curriculum_item_id] = [];
        videos.forEach(v => sessionVideoMap[b.curriculum_item_id].push(v.bunny_video_id));
      }
    });
  }

  // Build response with session status
  const curriculaWithSessions = (curricula || []).map(c => {
    const sessionItems = (items || []).filter(i => i.curriculum_id === c.id);
    return {
      ...c,
      sessions: sessionItems.map(item => {
        const videoIds = sessionVideoMap[item.id] || [];
        const completedCount = videoIds.filter(id => completedVideoIds.has(id)).length;
        const totalCount = videoIds.length;
        let status: 'new' | 'in_progress' | 'completed' = 'new';
        if (totalCount > 0 && completedCount === totalCount) status = 'completed';
        else if (completedCount > 0) status = 'in_progress';

        return {
          id: item.id,
          week_number: item.week_number,
          session_number: item.session_number,
          label: item.label,
          status,
          videoProgress: totalCount > 0 ? `${completedCount}/${totalCount}` : null,
        };
      }),
    };
  });

  // Count unread odapji
  const { count: odapjiCount } = await sc
    .from('odapji_files')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', student.profileId)
    .eq('is_read', false);

  // Renew cookie
  const newToken = await renewToken(student);
  const res = NextResponse.json({
    profile: { name: profile.name, school: profile.school },
    curricula: curriculaWithSessions,
    odapjiCount: odapjiCount || 0,
  });
  return setStudentCookie(res, newToken);
}
