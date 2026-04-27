import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStudentFromRequest } from '@/utils/student-auth';
import { getVariantForSlug } from '@/lib/dashboardVariants';

/**
 * 경량 이벤트 로그. A/B/C Variant 테스트 기간 지표 수집용.
 *
 * Request body:
 *   {
 *     event_type: 'page_view' | 'task_click' | 'show_all_toggle' | 'tab_change' | string;
 *     metadata?: Record<string, unknown>;
 *   }
 *
 * variant는 서버에서 slug 기준으로 자동 태깅 — 클라이언트가 보낼 필요 없음.
 *
 * 실패 시에도 200으로 떨어뜨리는 정책:
 *   로깅 실패가 학생 UX를 막아서는 안 됨. 콘솔 경고만 남기고 silently swallow.
 */
export async function POST(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { event_type?: string; metadata?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const eventType = (body.event_type || '').trim();
  if (!eventType || eventType.length > 64) {
    return NextResponse.json({ ok: false, error: 'event_type 필수 (1-64자)' }, { status: 400 });
  }

  const variant = getVariantForSlug(student.slug);

  try {
    const sc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    await sc.from('student_events').insert({
      profile_id: student.profileId,
      event_type: eventType,
      variant,
      metadata: body.metadata ?? null,
    });
  } catch (err) {
    console.warn('[student/track] insert failed', err);
  }

  return NextResponse.json({ ok: true });
}
