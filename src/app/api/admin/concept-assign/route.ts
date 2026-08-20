/**
 * 자연어 학생-차시 배정 API.
 *
 * POST /api/admin/concept-assign
 *   { mode: 'plan',         command }       → preview + plan_id
 *   { mode: 'execute',      plan_id }       → 실행 + undo_token
 *   { mode: 'student-view', student_id }    → 학생 시즌 일정 조회
 *   { mode: 'undo',         undo_token }    → 직전 명령 되돌리기
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { callPlanner, revalidatePlanner, buildDiff } from '@/lib/concept-assign/handler';
import { storePlan, retrievePlan, deletePlan } from '@/lib/concept-assign/plan-cache';
import { isoToKstYmd } from '@/lib/concept-assign/date-resolver';
import type { AssignContext } from '@/lib/concept-assign/build-prompt';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);

async function checkAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401, msg: 'Unauthorized' };
  if (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes(user.email || '')) {
    return { ok: false as const, status: 403, msg: 'Forbidden' };
  }
  return { ok: true as const, user };
}

function service() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

async function loadContext(sc: ReturnType<typeof service>): Promise<AssignContext> {
  const [{ data: students }, { data: sets }] = await Promise.all([
    sc.from('profiles').select('id, name, school').order('name'),
    sc.from('learning_sets').select('id, subject_slug, chapter_order, title')
      .eq('kind', 'concept').order('subject_slug').order('chapter_order'),
  ]);
  return {
    students: (students || []).filter(s => s.name) as AssignContext['students'],
    sets: (sets || []) as AssignContext['sets'],
  };
}

export async function POST(req: NextRequest) {
  const auth = await checkAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status });
  const userEmail = auth.user.email || '';

  const body = await req.json();
  const sc = service();

  // ========= mode='plan' =========
  if (body.mode === 'plan') {
    const command: string = (body.command || '').trim();
    if (!command) return NextResponse.json({ error: '명령이 비어있음' }, { status: 400 });

    const ctx = await loadContext(sc);
    const studentIds = new Set(ctx.students.map(s => s.id));
    const setIds = new Set(ctx.sets.map(s => s.id));
    const studentMeta = new Map(ctx.students.map(s => [s.id, { name: s.name }]));
    const setMeta = new Map(ctx.sets.map(s => [
      s.id,
      { title: s.title, subject_slug: s.subject_slug, chapter_order: s.chapter_order },
    ]));

    let plannerOutput;
    try {
      plannerOutput = await callPlanner(ctx, command);
    } catch (e) {
      return NextResponse.json({ error: `Claude 호출 실패: ${(e as Error).message}` }, { status: 500 });
    }

    const { operations: validOps, warnings: revalidWarn, status: finalStatus } = revalidatePlanner(
      plannerOutput,
      { studentIds, setIds },
    );

    // unknown_student / parse_error 같은 상태는 operations 비워서 반환
    if (['ambiguous', 'unknown_student', 'unknown_set', 'parse_error'].includes(plannerOutput.status)) {
      return NextResponse.json({
        mode: 'plan',
        plan_id: null,
        status: plannerOutput.status,
        summary_ko: plannerOutput.summary_ko,
        ambiguity_candidates: plannerOutput.ambiguity_candidates || [],
        diff: { added: [], removed: [], moved: [], unchanged: [], warnings: revalidWarn },
        notes: plannerOutput.notes,
      });
    }

    const { added, removed, moved, unchanged, inserts, deletes } = await buildDiff(
      validOps,
      sc,
      setMeta,
      studentMeta,
    );

    const { id: plan_id, expiresAt } = storePlan({
      plan: { ...plannerOutput, status: finalStatus, operations: validOps },
      inserts,
      deletes,
      command,
      userEmail,
    });

    return NextResponse.json({
      mode: 'plan',
      plan_id,
      status: finalStatus,
      summary_ko: plannerOutput.summary_ko,
      diff: { added, removed, moved, unchanged, warnings: revalidWarn },
      expires_at: new Date(expiresAt).toISOString(),
      notes: plannerOutput.notes,
    });
  }

  // ========= mode='execute' =========
  if (body.mode === 'execute') {
    const plan_id: string = body.plan_id;
    if (!plan_id) return NextResponse.json({ error: 'plan_id 없음' }, { status: 400 });
    const cached = retrievePlan(plan_id, userEmail);
    if (!cached) return NextResponse.json({ error: 'plan_id 만료 또는 없음 — 다시 해석해주세요' }, { status: 410 });

    // 삭제 대상 row 스냅샷 (Undo용)
    let deletedSnapshot: any[] = [];
    if (cached.deletes.length > 0) {
      const { data } = await sc
        .from('assignments')
        .select('id, set_id, user_id, published_at, label, week_number, session_number, course_id')
        .in('id', cached.deletes);
      deletedSnapshot = data || [];
    }

    // RPC 실행 (트랜잭션)
    const { data: rpcResult, error: rpcErr } = await sc.rpc('exec_assignment_plan', {
      p_deletes: cached.deletes,
      p_inserts: cached.inserts,
    });
    if (rpcErr) {
      return NextResponse.json(
        {
          error:
            'RPC 실행 실패: ' +
            rpcErr.message +
            ' — sql/migration_concept_assign_rpc.sql 을 Supabase SQL Editor에서 실행했는지 확인하세요',
        },
        { status: 500 },
      );
    }

    const insertedIds: string[] = (rpcResult as any)?.inserted_ids || [];
    const deletedCount: number = (rpcResult as any)?.deleted || 0;

    // history 기록 (best-effort, 마이그 안 됐어도 본 작업은 성공으로 인정)
    let undo_token: string | null = null;
    try {
      const { data } = await sc
        .from('concept_assign_history')
        .insert({
          user_email: userEmail,
          command_text: cached.command,
          plan: cached.plan,
          inserted_ids: insertedIds,
          deleted_snapshot: deletedSnapshot,
        })
        .select('undo_token')
        .single();
      undo_token = (data as any)?.undo_token || null;
    } catch {
      // ignore — history 테이블 없거나 권한 없음
    }

    deletePlan(plan_id);

    return NextResponse.json({
      mode: 'execute',
      created: insertedIds.length,
      deleted: deletedCount,
      ids: insertedIds,
      undo_token,
    });
  }

  // ========= mode='student-view' =========
  if (body.mode === 'student-view') {
    const student_id: string = body.student_id;
    if (!student_id) return NextResponse.json({ error: 'student_id 없음' }, { status: 400 });

    const { data: assigns } = await sc
      .from('assignments')
      .select(`
        id, set_id, user_id, published_at, label,
        learning_sets (
          id, title, subject_slug, chapter_order,
          learning_set_videos ( id, bunny_video_id, problem_number, title, order_index, duration_seconds )
        )
      `)
      .eq('user_id', student_id)
      .not('set_id', 'is', null)
      .not('published_at', 'is', null);

    // video_watch_progress 조회 (해당 학생의 모든 영상)
    const allBunnyIds = new Set<string>();
    for (const a of (assigns as any[]) || []) {
      for (const v of a.learning_sets?.learning_set_videos || []) {
        if (v.bunny_video_id) allBunnyIds.add(v.bunny_video_id);
      }
    }
    let progressMap = new Map<string, { watch_percent: number; completed: boolean }>();
    if (allBunnyIds.size > 0) {
      const { data: progress } = await sc
        .from('video_watch_progress')
        .select('bunny_video_id, watch_percent, completed')
        .eq('user_id', student_id)
        .in('bunny_video_id', Array.from(allBunnyIds));
      progressMap = new Map(
        (progress || []).map((p: any) => [p.bunny_video_id, { watch_percent: p.watch_percent || 0, completed: !!p.completed }]),
      );
    }

    // published_at 기준 그룹핑
    type WeekItem = {
      assignment_id: string;
      set_id: string;
      title: string;
      subject_slug: string;
      chapter_order: number | null;
      videos: Array<{ id: string; title: string; problem_number: number | null; duration_seconds: number | null; watch_percent: number; completed: boolean }>;
      hasProgress: boolean;
    };
    const byWeek = new Map<string, { publishedAt: string; publishYmd: string; items: WeekItem[] }>();
    for (const a of (assigns as any[]) || []) {
      const ls = a.learning_sets;
      if (!ls) continue;
      const key = a.published_at;
      if (!byWeek.has(key)) {
        byWeek.set(key, { publishedAt: a.published_at, publishYmd: isoToKstYmd(a.published_at), items: [] });
      }
      const videos = (ls.learning_set_videos || [])
        .sort((x: any, y: any) => x.order_index - y.order_index)
        .map((v: any) => {
          const p = progressMap.get(v.bunny_video_id);
          return {
            id: v.id,
            title: v.title,
            problem_number: v.problem_number,
            duration_seconds: v.duration_seconds,
            watch_percent: p?.watch_percent || 0,
            completed: p?.completed || false,
          };
        });
      const hasProgress = videos.some((v: any) => v.watch_percent > 0);
      byWeek.get(key)!.items.push({
        assignment_id: a.id,
        set_id: ls.id,
        title: ls.title,
        subject_slug: ls.subject_slug,
        chapter_order: ls.chapter_order,
        videos,
        hasProgress,
      });
    }
    const weeks = Array.from(byWeek.values()).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    // 각 주 내부 chapter_order 정렬
    weeks.forEach(w => w.items.sort((a, b) => (a.chapter_order ?? 999) - (b.chapter_order ?? 999)));

    return NextResponse.json({ mode: 'student-view', weeks });
  }

  // ========= mode='undo' =========
  if (body.mode === 'undo') {
    const undo_token: string = body.undo_token;
    if (!undo_token) return NextResponse.json({ error: 'undo_token 없음' }, { status: 400 });

    const { data: hist, error: histErr } = await sc
      .from('concept_assign_history')
      .select('id, inserted_ids, deleted_snapshot, reverted_at, created_at, user_email')
      .eq('undo_token', undo_token)
      .single();
    if (histErr || !hist) {
      return NextResponse.json({ error: '되돌리기 토큰 만료 또는 없음' }, { status: 404 });
    }
    if (hist.user_email !== userEmail) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 });
    }
    if (hist.reverted_at) {
      return NextResponse.json({ error: '이미 되돌려짐' }, { status: 409 });
    }
    const ageMs = Date.now() - new Date(hist.created_at).getTime();
    if (ageMs > 5 * 60 * 1000) {
      return NextResponse.json({ error: '5분 경과 — 되돌리기 불가' }, { status: 410 });
    }

    // reverse: deleted_snapshot 다시 INSERT, inserted_ids DELETE
    const restoreInserts = (hist.deleted_snapshot as any[] || []).map((row: any) => ({
      // id 빼고 새로 발급
      set_id: row.set_id,
      user_id: row.user_id,
      published_at: row.published_at,
      label: row.label,
      week_number: row.week_number,
      session_number: row.session_number,
      course_id: row.course_id,
    }));
    const { error: rpcErr } = await sc.rpc('exec_assignment_plan', {
      p_deletes: hist.inserted_ids || [],
      p_inserts: restoreInserts,
    });
    if (rpcErr) {
      return NextResponse.json({ error: 'RPC 실행 실패: ' + rpcErr.message }, { status: 500 });
    }

    await sc.from('concept_assign_history').update({ reverted_at: new Date().toISOString() }).eq('id', hist.id);

    return NextResponse.json({ mode: 'undo', reverted: (hist.inserted_ids || []).length });
  }

  return NextResponse.json({ error: 'unknown mode' }, { status: 400 });
}
