/**
 * 신 학습 블럭 모델용 어드민 챗 API.
 *
 * POST /api/admin/blocks/chat
 *   { messages: Anthropic.MessageParam[] }
 *   → { text, toolCalls, assistantContent }
 *
 * 도구 목록:
 *   list_blocks         — content_blocks 검색
 *   list_students       — 전체 학생 목록
 *   get_student_calendar — 학생 배정 현황
 *   preview_assign      — 배정 변경 미리보기 (DB 변경 없음)
 *   execute_assign      — 배정 실행 (block_assignments INSERT/UPDATE)
 *   release_blocks      — 배정 릴리즈 (is_released=true)
 *   generate_kakao      — 카톡 메시지 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { buildBlockProgressUpdateMessage } from '@/lib/kakao-ops/templates';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
const SITE_URL = 'https://jtmath.kr';

const SUBJECT_LABEL: Record<string, string> = {
  gs1: '공통수학1', gs2: '공통수학2',
  ds: '대수', ds2: '대수',
  mj1: '미적분1', ms1: '미적분1', mj2: '미적분2',
  ht: '확률과통계', gh: '기하', gi: '기하', s2: '수학2',
};

const SYSTEM_PROMPT = `당신은 고T수학 학원 운영 비서입니다. 사장님(고창언)이 모바일/PC에서 자연어로 학생 학습 블럭을 관리합니다.

원칙:
- 항상 한국어, 짧고 핵심만. 결과는 마크다운 표/리스트.
- 학생 이름 모호하면 list_students로 먼저 확인.
- 배정 변경(assign) 전 반드시 preview_assign → 확인 받은 후 execute_assign.
- 직접 INSERT/DELETE하지 말고 반드시 execute_assign 도구만 사용.
- 릴리즈는 execute_assign 대신 release_blocks 사용.
- 도구 결과는 JSON 그대로 노출 X, 사람 읽기 좋게 가공.

카톡 메시지 패턴:
학습 페이지: ${SITE_URL}/s/{slug}
{slot_label} {요일} 진도 업데이트되었습니다.
문제 풀고 앱에 답안 제출 후 카톡주세요!`;

// in-memory preview cache (process 수준, 5분 TTL)
const previewCache = new Map<string, { ops: AssignOp[]; expiresAt: number }>();

interface AssignOp {
  op: 'assign' | 'unassign' | 'release';
  // assign
  profile_id?: string;
  content_block_id?: string;
  scheduled_date?: string;
  slot_label?: string;
  variant?: string;
  notes?: string;
  // unassign / release
  assignment_id?: string;
}

const tools: Anthropic.Tool[] = [
  {
    name: 'list_blocks',
    description: '학습 블럭(content_blocks) 목록 조회. 과목·카테고리·검색어로 필터.',
    input_schema: {
      type: 'object',
      properties: {
        subject_slug: { type: 'string', description: 'gs1/gs2/ds2/mj1/mj2/ht/gi/s2' },
        category: { type: 'string', description: 'gichul/shimhwa/level5/concept/supplement/mock_exam' },
        query: { type: 'string', description: '제목 부분일치 검색' },
      },
    },
  },
  {
    name: 'list_students',
    description: '전체 학생 목록. 이름·학년·학교·slug·마지막접속 반환.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_student_calendar',
    description: '학생의 block_assignments 조회. 4주치 배정 현황 반환.',
    input_schema: {
      type: 'object',
      properties: {
        student_name: { type: 'string', description: '학생 이름 (부분일치)' },
        weeks: { type: 'integer', description: '조회 주 수 (기본 4)', default: 4 },
      },
      required: ['student_name'],
    },
  },
  {
    name: 'preview_assign',
    description: '배정 변경 미리보기. DB 변경 없음. preview_id 반환 → execute_assign에 사용.',
    input_schema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          description: '배정 작업 목록',
          items: {
            type: 'object',
            properties: {
              op: { type: 'string', enum: ['assign', 'unassign', 'release'] },
              student_name: { type: 'string', description: 'assign 시 학생 이름 (부분일치)' },
              block_title: { type: 'string', description: 'assign 시 블럭 제목 (부분일치)' },
              scheduled_date: { type: 'string', description: 'assign 시 날짜 YYYY-MM-DD' },
              slot_label: { type: 'string', description: 'assign 시 슬롯 라벨 ex) "1주 1차시"' },
              variant: { type: 'string', description: 'assign 시 변형판 (기본 default)' },
              notes: { type: 'string', description: 'assign 시 메모' },
              assignment_id: { type: 'string', description: 'unassign/release 시 배정 ID' },
            },
            required: ['op'],
          },
        },
      },
      required: ['operations'],
    },
  },
  {
    name: 'execute_assign',
    description: 'preview_assign에서 받은 preview_id로 배정 실행. 반드시 preview 확인 후 사용.',
    input_schema: {
      type: 'object',
      properties: {
        preview_id: { type: 'string', description: 'preview_assign 반환값' },
      },
      required: ['preview_id'],
    },
  },
  {
    name: 'release_blocks',
    description: '배정(block_assignments)을 릴리즈(is_released=true). 학생명+날짜 또는 assignment_id로 지정.',
    input_schema: {
      type: 'object',
      properties: {
        student_name: { type: 'string', description: '학생 이름 (부분일치). date와 함께 사용.' },
        date: { type: 'string', description: '날짜 YYYY-MM-DD. student_name과 함께 사용.' },
        assignment_ids: { type: 'array', items: { type: 'string' }, description: '배정 ID 목록. 이걸 주면 student_name/date 무시.' },
      },
    },
  },
  {
    name: 'generate_kakao',
    description: '카톡 메시지 생성. 날짜 기준으로 그날 릴리즈된(또는 될) 학생들 메시지 반환.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: '배포 날짜 YYYY-MM-DD' },
        student_names: { type: 'array', items: { type: 'string' }, description: '학생 이름 목록. 없으면 그날 배정된 전원.' },
      },
      required: ['date'],
    },
  },
];

function service() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

type ToolInput = Record<string, unknown>;

async function executeTool(name: string, rawInput: unknown, sc: ReturnType<typeof service>): Promise<string> {
  const input = (rawInput || {}) as ToolInput;

  // clean expired previews
  const now = Date.now();
  previewCache.forEach((v, k) => { if (v.expiresAt < now) previewCache.delete(k); });

  try {
    switch (name) {

      case 'list_blocks': {
        let q = (sc as any).from('content_blocks').select('id, subject_slug, title, category, unit_number, tags');
        if (input.subject_slug) q = q.eq('subject_slug', input.subject_slug as string);
        if (input.category) q = q.eq('category', input.category as string);
        if (input.query) q = q.ilike('title', `%${input.query as string}%`);
        q = q.order('subject_slug').order('unit_number', { ascending: true, nullsFirst: false }).limit(50);
        const { data, error } = await q;
        if (error) return `에러: ${error.message}`;
        const rows = (data || []).map((b: any) => ({
          id: b.id,
          subject: SUBJECT_LABEL[b.subject_slug] || b.subject_slug,
          title: b.title,
          category: b.category,
          unit: b.unit_number,
        }));
        return JSON.stringify(rows);
      }

      case 'list_students': {
        const { data, error } = await sc
          .from('student_tokens')
          .select('slug, is_active, last_accessed_at, student_type, profiles!inner(id, name, school, grade)')
          .eq('is_active', true)
          .order('profiles(name)', { ascending: true });
        if (error) return `에러: ${error.message}`;
        return JSON.stringify((data || []).map((t: any) => ({
          profile_id: t.profiles.id,
          name: t.profiles.name,
          school: t.profiles.school,
          grade: t.profiles.grade,
          slug: t.slug,
          last_accessed: t.last_accessed_at?.slice(0, 10),
        })));
      }

      case 'get_student_calendar': {
        const name = (input.student_name as string) || '';
        const weeks = (input.weeks as number) || 4;
        const { data: profiles } = await sc.from('profiles').select('id, name').ilike('name', `%${name}%`);
        if (!profiles?.length) return `학생 없음: ${name}`;
        if (profiles.length > 3) return `여러 학생 매칭 (${profiles.length}명): ${profiles.map((p: any) => p.name).join(', ')} — 더 구체적으로`;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + weeks * 7);

        const results = [];
        for (const p of profiles) {
          const { data: bas } = await (sc as any)
            .from('block_assignments')
            .select('id, scheduled_date, slot_label, is_released, variant, content_block:content_blocks(subject_slug, title, category)')
            .eq('profile_id', p.id)
            .gte('scheduled_date', startDate.toISOString().slice(0, 10))
            .lte('scheduled_date', endDate.toISOString().slice(0, 10))
            .order('scheduled_date');
          results.push({
            name: p.name,
            profile_id: p.id,
            assignments: (bas || []).map((ba: any) => ({
              id: ba.id,
              date: ba.scheduled_date,
              label: ba.slot_label,
              released: ba.is_released,
              variant: ba.variant,
              block: ba.content_block ? {
                subject: SUBJECT_LABEL[ba.content_block.subject_slug] || ba.content_block.subject_slug,
                title: ba.content_block.title,
                category: ba.content_block.category,
              } : null,
            })),
          });
        }
        return JSON.stringify(results);
      }

      case 'preview_assign': {
        const rawOps = (input.operations as any[]) || [];
        const resolved: AssignOp[] = [];
        const preview: string[] = [];

        for (const op of rawOps) {
          if (op.op === 'assign') {
            // 학생 조회
            const { data: ps } = await sc.from('profiles').select('id, name').ilike('name', `%${op.student_name || ''}%`);
            if (!ps?.length) { preview.push(`❌ 학생 없음: ${op.student_name}`); continue; }
            if (ps.length > 1) { preview.push(`❌ 학생 여러 명 (${ps.map((p: any) => p.name).join(', ')}): 더 구체적으로`); continue; }
            const p = ps[0] as any;
            // 블럭 조회
            const { data: bs } = await (sc as any).from('content_blocks').select('id, subject_slug, title, category').ilike('title', `%${op.block_title || ''}%`).limit(5);
            if (!bs?.length) { preview.push(`❌ 블럭 없음: ${op.block_title}`); continue; }
            if (bs.length > 1) { preview.push(`❌ 블럭 여러 개 (${bs.map((b: any) => b.title).join(' / ')}): 더 구체적으로`); continue; }
            const b = bs[0] as any;
            resolved.push({ op: 'assign', profile_id: p.id, content_block_id: b.id, scheduled_date: op.scheduled_date, slot_label: op.slot_label, variant: op.variant || 'default', notes: op.notes });
            preview.push(`+ ${p.name} | ${op.scheduled_date} | ${b.title}${op.slot_label ? ` (${op.slot_label})` : ''}`);
          } else if (op.op === 'unassign') {
            const { data: ba } = await (sc as any).from('block_assignments').select('id, profile_id, scheduled_date, content_block:content_blocks(title), profiles(name)').eq('id', op.assignment_id).maybeSingle();
            if (!ba) { preview.push(`❌ 배정 없음: ${op.assignment_id}`); continue; }
            resolved.push({ op: 'unassign', assignment_id: op.assignment_id });
            preview.push(`- ${(ba.profiles as any)?.name} | ${ba.scheduled_date} | ${(ba.content_block as any)?.title}`);
          } else if (op.op === 'release') {
            const { data: ba } = await (sc as any).from('block_assignments').select('id, profile_id, scheduled_date, is_released, content_block:content_blocks(title), profiles(name)').eq('id', op.assignment_id).maybeSingle();
            if (!ba) { preview.push(`❌ 배정 없음: ${op.assignment_id}`); continue; }
            if (ba.is_released) { preview.push(`⚠️ 이미 릴리즈됨: ${(ba.profiles as any)?.name} | ${(ba.content_block as any)?.title}`); continue; }
            resolved.push({ op: 'release', assignment_id: op.assignment_id });
            preview.push(`🔓 ${(ba.profiles as any)?.name} | ${ba.scheduled_date} | ${(ba.content_block as any)?.title}`);
          }
        }

        if (resolved.length === 0) return `유효한 작업 없음:\n${preview.join('\n')}`;

        const preview_id = randomUUID();
        previewCache.set(preview_id, { ops: resolved, expiresAt: Date.now() + 5 * 60 * 1000 });

        return `미리보기:\n${preview.join('\n')}\n\npreview_id: ${preview_id}\n실행하려면 execute_assign을 호출하세요.`;
      }

      case 'execute_assign': {
        const preview_id = input.preview_id as string;
        const cached = previewCache.get(preview_id);
        if (!cached) return `preview_id 없음 또는 만료됨 (5분 TTL). preview_assign을 다시 호출하세요.`;
        previewCache.delete(preview_id);

        const deletes: string[] = cached.ops.filter(o => o.op === 'unassign').map(o => o.assignment_id!);
        const inserts = cached.ops.filter(o => o.op === 'assign').map(o => ({
          profile_id: o.profile_id,
          content_block_id: o.content_block_id,
          scheduled_date: o.scheduled_date,
          slot_label: o.slot_label ?? null,
          variant: o.variant || 'default',
          is_released: false,
          notes: o.notes ?? null,
        }));
        const releases: string[] = cached.ops.filter(o => o.op === 'release').map(o => o.assignment_id!);

        let result = '';

        if (deletes.length > 0 || inserts.length > 0) {
          const { data: rpcResult, error: rpcErr } = await (sc as any).rpc('exec_block_assignment_plan', {
            p_deletes: deletes.length > 0 ? deletes : null,
            p_inserts: inserts.length > 0 ? inserts : null,
          });
          if (rpcErr) return `RPC 에러: ${rpcErr.message}`;
          result += `완료: 삭제 ${rpcResult?.deleted ?? 0}건, 추가 ${(rpcResult?.inserted_ids ?? []).length}건\n`;
        }

        if (releases.length > 0) {
          const { error: relErr } = await (sc as any)
            .from('block_assignments')
            .update({ is_released: true })
            .in('id', releases);
          if (relErr) return `릴리즈 에러: ${relErr.message}`;
          result += `릴리즈: ${releases.length}건\n`;
        }

        return result || '완료 (0건)';
      }

      case 'release_blocks': {
        let ids: string[] = [];

        if (Array.isArray(input.assignment_ids) && input.assignment_ids.length > 0) {
          ids = input.assignment_ids as string[];
        } else if (input.student_name && input.date) {
          const { data: ps } = await sc.from('profiles').select('id').ilike('name', `%${input.student_name as string}%`);
          const profileIds = (ps || []).map((p: any) => p.id);
          if (!profileIds.length) return `학생 없음: ${input.student_name}`;
          const { data: bas } = await (sc as any)
            .from('block_assignments')
            .select('id')
            .in('profile_id', profileIds)
            .eq('scheduled_date', input.date as string)
            .eq('is_released', false);
          ids = (bas || []).map((b: any) => b.id);
        }

        if (ids.length === 0) return '릴리즈할 배정 없음';

        const { error } = await (sc as any)
          .from('block_assignments')
          .update({ is_released: true })
          .in('id', ids);
        if (error) return `에러: ${error.message}`;
        return `✅ 릴리즈 완료: ${ids.length}건`;
      }

      case 'generate_kakao': {
        const date = input.date as string;
        const studentNames = (input.student_names as string[] | undefined);

        // 해당 날짜 배정 조회
        let q = (sc as any)
          .from('block_assignments')
          .select('id, profile_id, slot_label, is_released, profiles!inner(name, id), student_tokens!inner(slug, student_type)');
        q = q.eq('scheduled_date', date);
        const { data: bas, error } = await q;
        if (error) return `에러: ${error.message}`;

        // 학생별 배정 그룹핑
        const byProfile = new Map<string, { name: string; slug: string; type: string; labels: string[] }>();
        for (const ba of bas || []) {
          const p = ba.profiles as any;
          const t = ba.student_tokens as any;
          if (!p || !t) continue;
          if (studentNames?.length && !studentNames.some((n: string) => p.name.includes(n))) continue;
          const key = p.id;
          const entry = byProfile.get(key) || { name: p.name, slug: t.slug, type: t.student_type || 'online', labels: [] as string[] };
          if (ba.slot_label) entry.labels.push(ba.slot_label);
          byProfile.set(key, entry);
        }

        if (byProfile.size === 0) return `${date}에 배정된 학생 없음`;

        // 요일 계산
        const dow = new Date(date + 'T00:00:00Z').getUTCDay();
        const weekdayPair = dow === 0 ? '월화' : dow === 3 ? '목금' : '';

        const messages: string[] = [];
        for (const s of Array.from(byProfile.values())) {
          const prefix = s.type === 'offline' ? '/c' : '/s';
          const slotLabel = s.labels.length ? s.labels[0] : '';
          const msg = buildBlockProgressUpdateMessage({
            siteUrl: SITE_URL,
            portalBasePath: prefix,
            portalSlug: s.slug,
            slotLabel,
            weekdayPair,
          });
          messages.push(`[${s.name}]\n${msg}`);
        }

        return messages.join('\n\n---\n\n');
      }

      default:
        return `알 수 없는 도구: ${name}`;
    }
  } catch (err) {
    return `예외: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes(user.email || ''))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY 미설정' }, { status: 500 });
  }

  let body: { messages?: Anthropic.MessageParam[] } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }); }

  const messages: Anthropic.MessageParam[] = Array.isArray(body.messages) ? [...body.messages] : [];
  if (messages.length === 0) return NextResponse.json({ error: 'messages 비어있음' }, { status: 400 });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sc = service();
  const toolCalls: Array<{ name: string; input: unknown; result: string }> = [];

  for (let i = 0; i < 10; i++) {
    let response;
    try {
      response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        return NextResponse.json({ error: `Anthropic API ${err.status}: ${err.message}` }, { status: 500 });
      }
      throw err;
    }

    if (response.stop_reason === 'end_turn') {
      const text = response.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('\n');
      return NextResponse.json({ text, assistantContent: response.content, toolCalls });
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const result = await executeTool(block.name, block.input, sc);
        toolCalls.push({ name: block.name, input: block.input, result });
        results.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }
      messages.push({ role: 'user', content: results });
      continue;
    }

    return NextResponse.json({ text: '(예상치 못한 응답)', assistantContent: response.content, toolCalls });
  }

  return NextResponse.json({ error: '도구 루프 너무 깊음' }, { status: 500 });
}
