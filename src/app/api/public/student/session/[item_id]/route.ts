import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStudentFromRequest, renewToken, setStudentCookie } from '@/utils/student-auth';

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gi: '기하', s2: '수학2',
};

// "1주 1차시" → { week_number, session_number }
function parseSlotLabel(label: string | null): { week_number: number; session_number: number } | null {
  if (!label) return null;
  const m = label.match(/^(\d+)주\s*(\d+)차시/);
  if (!m) return null;
  return { week_number: parseInt(m[1]), session_number: parseInt(m[2]) };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ item_id: string }> }) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { item_id } = await params;

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // ─── NEW MODEL: block_assignments (always try first) ─────────────────────────
  {
    const { data: baRaw, error: baError } = await (sc as any)
      .from('block_assignments')
      .select(`
        id, profile_id, scheduled_date, slot_label, is_released, variant, notes,
        content_block:content_blocks (
          id, subject_slug, title, category, unit_number
        )
      `)
      .eq('id', item_id)
      .single();

    const ba = baRaw as {
      id: string; profile_id: string; scheduled_date: string;
      slot_label: string | null; is_released: boolean; variant: string; notes: string | null;
      content_block: { id: string; subject_slug: string; title: string; category: string; unit_number: number | null } | null;
    } | null;

    if (baError || !ba) {
      // fallback: try legacy student_session id (links shared before migration)
      return getLegacySession(req, sc, student, item_id);
    }

    if (!student.isMaster && ba.profile_id !== student.profileId) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }
    if (!ba.is_released && !student.isMaster) {
      return NextResponse.json({ error: '아직 공개되지 않은 차시입니다' }, { status: 403 });
    }

    const cb = ba.content_block as unknown as {
      id: string; subject_slug: string; title: string; category: string; unit_number: number | null;
    } | null;

    if (!cb) return NextResponse.json({ error: '콘텐츠 블럭을 찾을 수 없습니다' }, { status: 404 });

    // block_contents 조회 — variant fallback → default
    let blocks: unknown[] = [];
    const requestedVariant = (ba.variant as string) || 'default';

    if (requestedVariant !== 'default') {
      const { data: variantBlocks } = await sc
        .from('block_contents')
        .select('*')
        .eq('content_block_id', cb.id)
        .eq('variant', requestedVariant)
        .order('order_index', { ascending: true });
      if (variantBlocks && variantBlocks.length > 0) blocks = variantBlocks;
    }
    if (blocks.length === 0) {
      const { data: defaultBlocks } = await sc
        .from('block_contents')
        .select('*')
        .eq('content_block_id', cb.id)
        .eq('variant', 'default')
        .order('order_index', { ascending: true });
      blocks = defaultBlocks || [];
    }

    const { data: progress } = await sc
      .from('video_watch_progress')
      .select('bunny_video_id, watch_percent, completed')
      .eq('user_id', student.profileId);

    const progressMap: Record<string, { watch_percent: number; completed: boolean }> = {};
    (progress || []).forEach((p: { bunny_video_id: string; watch_percent: number; completed: boolean }) => {
      progressMap[p.bunny_video_id] = { watch_percent: p.watch_percent, completed: p.completed };
    });

    if (!student.isMaster) {
      await sc.from('student_tokens')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('slug', student.slug);
    }

    const parsed = parseSlotLabel(ba.slot_label);
    const newToken = await renewToken(student);
    const res = NextResponse.json({
      item: {
        id: ba.id,
        week_number: parsed?.week_number ?? 1,
        session_number: parsed?.session_number ?? 1,
        label: ba.slot_label ?? cb.title,
        publish_date: ba.scheduled_date,
        is_released: ba.is_released,
      },
      curriculum: {
        title: SUBJECT_LABEL[cb.subject_slug] || cb.subject_slug,
        subject_slug: cb.subject_slug,
      },
      blocks,
      progress: progressMap,
    });
    return setStudentCookie(res, newToken);
  }

  // ─── LEGACY MODEL fallback ───────────────────────────────────────────────────
  return getLegacySession(req, sc, student, item_id);
}

async function getLegacySession(
  _req: NextRequest,
  sc: any,
  student: any,
  item_id: string,
) {
  const { data: ss, error: ssError } = await sc
    .from('student_sessions')
    .select('id, profile_id, subject_slug, week_number, session_number, label, publish_date, is_released, variant, lecture:lectures(id, title, subject_slug)')
    .eq('id', item_id)
    .single();

  if (ssError || !ss) return NextResponse.json({ error: '차시를 찾을 수 없습니다' }, { status: 404 });
  if (!student.isMaster && ss.profile_id !== student.profileId) return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
  if (!ss.is_released && !student.isMaster) return NextResponse.json({ error: '아직 공개되지 않은 차시입니다' }, { status: 403 });

  const requestedVariant = ss.variant;
  const lecture = ss.lecture as unknown as { id: string; title: string; subject_slug: string } | null;

  let blocks: unknown[] = [];
  if (lecture?.id) {
    if (requestedVariant !== 'default') {
      const { data: variantBlocks } = await sc
        .from('session_blocks').select('*')
        .eq('lecture_id', lecture.id).eq('variant', requestedVariant)
        .order('order_index', { ascending: true });
      if (variantBlocks && variantBlocks.length > 0) blocks = variantBlocks;
    }
    if (blocks.length === 0) {
      const { data: defaultBlocks } = await sc
        .from('session_blocks').select('*')
        .eq('lecture_id', lecture.id).eq('variant', 'default')
        .order('order_index', { ascending: true });
      blocks = defaultBlocks || [];
    }
  }

  // lecture_id 없이 curriculum_item_id로만 연결된 경우 (admin:session CLI로 생성된 차시)
  if (blocks.length === 0 && !lecture?.id) {
    const { data: links } = await sc
      .from('student_curriculum_links')
      .select('curriculum_id')
      .eq('profile_id', ss.profile_id);
    let curriculumIds = (links ?? []).map((l: { curriculum_id: string }) => l.curriculum_id);

    // 커리큘럼 배정 없는 학생은 subject_slug의 모든 커리큘럼에서 week/session 매칭
    if (curriculumIds.length === 0) {
      const { data: allCurricula } = await sc
        .from('curricula').select('id').eq('subject_slug', ss.subject_slug);
      curriculumIds = (allCurricula ?? []).map((c: { id: string }) => c.id);
    }

    if (curriculumIds.length > 0) {
      const { data: ciList } = await sc
        .from('curriculum_items')
        .select('id')
        .in('curriculum_id', curriculumIds)
        .eq('week_number', ss.week_number)
        .eq('session_number', ss.session_number);
      const ciIds = (ciList ?? []).map((c: { id: string }) => c.id);
      if (ciIds.length > 0) {
        const { data: ciBlocks } = await sc
          .from('session_blocks').select('*')
          .in('curriculum_item_id', ciIds)
          .order('order_index', { ascending: true });
        blocks = ciBlocks || [];
      }
    }
  }

  const { data: progress } = await sc
    .from('video_watch_progress').select('bunny_video_id, watch_percent, completed')
    .eq('user_id', student.profileId);

  const progressMap: Record<string, { watch_percent: number; completed: boolean }> = {};
  (progress || []).forEach((p: { bunny_video_id: string; watch_percent: number; completed: boolean }) => {
    progressMap[p.bunny_video_id] = { watch_percent: p.watch_percent, completed: p.completed };
  });

  if (!student.isMaster) {
    await sc.from('student_tokens')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('slug', student.slug);
  }

  const newToken = await renewToken(student);
  const res = NextResponse.json({
    item: {
      id: ss.id, week_number: ss.week_number, session_number: ss.session_number,
      label: ss.label ?? lecture?.title ?? null,
      publish_date: ss.publish_date, is_released: ss.is_released,
    },
    curriculum: { title: SUBJECT_LABEL[ss.subject_slug] || ss.subject_slug, subject_slug: ss.subject_slug },
    blocks,
    progress: progressMap,
  });
  return setStudentCookie(res, newToken);
}
