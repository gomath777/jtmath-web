import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js';
import { buildStudentCurriculumNoticeMessage } from '@/lib/kakao-ops/templates';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());
const SITE_URL = 'https://jtmath.kr';

const SYSTEM_PROMPT = `당신은 고T수학 학원의 운영 비서입니다. 사장님(고창언)이 모바일에서 자연어로 학생·커리큘럼을 관리합니다.

원칙:
- 항상 한국어로, 짧고 핵심만 응답하세요. 결과는 마크다운 표/리스트로 정리.
- 학생 이름이 모호하면 find_student로 먼저 검색 → 1명 확정 후 변경 작업 수행.
- 변경 작업(link/release/grade) 직후엔 "✓ 완료: ..." 한 줄로 결과 요약.
- 도구 결과는 JSON 그대로 노출하지 말고 사람 읽기 좋게 가공.
- 모르는 건 추측하지 말고 도구로 확인.

학년 표기: 1=고1, 2=고2, 3=고3.
대시보드 URL 패턴: ${SITE_URL}/s/{slug} (온라인) 또는 ${SITE_URL}/c/{slug} (오프라인).`;

const tools: Anthropic.Tool[] = [
  {
    name: 'list_students',
    description: '전체 학생 목록 조회. 이름·학년·학교·대시보드 slug·활성·최근접속을 반환.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'find_student',
    description: '이름 부분일치로 학생 검색. 변경 작업 전 학생 식별에 우선 사용.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: '학생 이름 (부분일치)' } },
      required: ['name'],
    },
  },
  {
    name: 'list_curricula',
    description: '전체 커리큘럼 목록 조회. id·제목·과목·start_date·전체 차시 수 반환.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'link_student_curriculum',
    description: '학생을 커리큘럼에 배정. student_name은 정확히 일치해야 함(애매하면 먼저 find_student). curriculum_title은 부분일치 1개여야 함.',
    input_schema: {
      type: 'object',
      properties: {
        student_name: { type: 'string', description: '학생 이름 (정확히 일치)' },
        curriculum_title: { type: 'string', description: '커리큘럼 제목 (부분일치, 1개만 매칭되어야 함)' },
      },
      required: ['student_name', 'curriculum_title'],
    },
  },
  {
    name: 'release_session',
    description: '커리큘럼의 특정 주차/차시를 릴리즈(is_released=true). curriculum_title은 부분일치 1개.',
    input_schema: {
      type: 'object',
      properties: {
        curriculum_title: { type: 'string' },
        week: { type: 'integer', description: '주차 번호 (1, 2, ...)' },
        session: { type: 'integer', description: '차시 번호 (1, 2, ...)' },
      },
      required: ['curriculum_title', 'week', 'session'],
    },
  },
  {
    name: 'update_student_grade',
    description: '학생 학년 정보 업데이트. grade=1(고1)/2(고2)/3(고3) 중 하나.',
    input_schema: {
      type: 'object',
      properties: {
        student_name: { type: 'string' },
        grade: { type: 'integer', enum: [1, 2, 3] },
      },
      required: ['student_name', 'grade'],
    },
  },
  {
    name: 'get_kakao_template',
    description: '학생에게 보낼 카톡 메시지 템플릿 조회 (학습페이지 링크 + 안내 문구).',
    input_schema: {
      type: 'object',
      properties: { student_name: { type: 'string' } },
      required: ['student_name'],
    },
  },
];

type ToolInput = Record<string, unknown>;

async function executeTool(name: string, rawInput: unknown, sc: SupabaseClient): Promise<string> {
  const input = (rawInput || {}) as ToolInput;
  try {
    switch (name) {
      case 'list_students': {
        const { data, error } = await sc
          .from('student_tokens')
          .select('slug, is_active, last_accessed_at, student_type, profiles!inner(name, school, grade)')
          .order('created_at', { ascending: false });
        if (error) return `에러: ${error.message}`;
        return JSON.stringify(data);
      }
      case 'find_student': {
        const { data, error } = await sc
          .from('profiles')
          .select('id, name, school, grade')
          .ilike('name', `%${(input.name as string) || ''}%`);
        if (error) return `에러: ${error.message}`;
        if (!data || data.length === 0) return '매칭 학생 없음';
        return JSON.stringify(data);
      }
      case 'list_curricula': {
        const { data, error } = await sc
          .from('curricula')
          .select('id, title, subject_slug, start_date')
          .order('start_date', { ascending: false });
        if (error) return `에러: ${error.message}`;
        const ids = (data || []).map(c => c.id);
        const { data: items } = await sc
          .from('curriculum_items')
          .select('curriculum_id, is_released')
          .in('curriculum_id', ids);
        const byCurr = new Map<string, { total: number; released: number }>();
        (items || []).forEach(it => {
          const s = byCurr.get(it.curriculum_id) || { total: 0, released: 0 };
          s.total++;
          if (it.is_released) s.released++;
          byCurr.set(it.curriculum_id, s);
        });
        const enriched = (data || []).map(c => ({
          ...c,
          released: byCurr.get(c.id)?.released ?? 0,
          total: byCurr.get(c.id)?.total ?? 0,
        }));
        return JSON.stringify(enriched);
      }
      case 'link_student_curriculum': {
        const { data: profile } = await sc
          .from('profiles')
          .select('id, name')
          .eq('name', input.student_name as string)
          .maybeSingle();
        if (!profile) return `학생을 찾을 수 없음: ${input.student_name}`;
        const { data: matches } = await sc
          .from('curricula')
          .select('id, title')
          .ilike('title', `%${(input.curriculum_title as string) || ''}%`);
        if (!matches || matches.length === 0) return `커리큘럼 없음: ${input.curriculum_title}`;
        if (matches.length > 1) return `여러 매칭됨, 더 구체적으로: ${matches.map(m => m.title).join(' / ')}`;
        const curr = matches[0];
        const { data: existing } = await sc
          .from('student_curriculum_links')
          .select('id')
          .eq('profile_id', profile.id)
          .eq('curriculum_id', curr.id)
          .maybeSingle();
        if (existing) return `이미 배정됨: ${profile.name} → ${curr.title}`;
        const { error: insErr } = await sc
          .from('student_curriculum_links')
          .insert({ profile_id: profile.id, curriculum_id: curr.id });
        if (insErr) return `에러: ${insErr.message}`;
        return `완료: ${profile.name} → ${curr.title}`;
      }
      case 'release_session': {
        const { data: matches } = await sc
          .from('curricula')
          .select('id, title')
          .ilike('title', `%${(input.curriculum_title as string) || ''}%`);
        if (!matches || matches.length === 0) return `커리큘럼 없음`;
        if (matches.length > 1) return `여러 매칭됨, 더 구체적으로: ${matches.map(m => m.title).join(' / ')}`;
        const curr = matches[0];
        const { data: item } = await sc
          .from('curriculum_items')
          .select('id, label, is_released, week_number, session_number')
          .eq('curriculum_id', curr.id)
          .eq('week_number', input.week as number)
          .eq('session_number', input.session as number)
          .maybeSingle();
        if (!item) return `차시 없음: ${curr.title} ${input.week}-${input.session}`;
        if (item.is_released) return `이미 릴리즈됨: ${curr.title} ${item.week_number}-${item.session_number} ${item.label}`;
        const { error: updErr } = await sc
          .from('curriculum_items')
          .update({ is_released: true })
          .eq('id', item.id);
        if (updErr) return `에러: ${updErr.message}`;
        return `완료: ${curr.title} ${item.week_number}-${item.session_number} "${item.label}" 릴리즈됨`;
      }
      case 'update_student_grade': {
        const grade = input.grade as number;
        if (![1, 2, 3].includes(grade)) return `grade는 1/2/3 중 하나`;
        const { data: profile } = await sc
          .from('profiles')
          .select('id, name')
          .eq('name', input.student_name as string)
          .maybeSingle();
        if (!profile) return `학생을 찾을 수 없음: ${input.student_name}`;
        const { error: updErr } = await sc
          .from('profiles')
          .update({ grade })
          .eq('id', profile.id);
        if (updErr) return `에러: ${updErr.message}`;
        return `완료: ${profile.name} → 고${grade}`;
      }
      case 'get_kakao_template': {
        const { data: profile } = await sc
          .from('profiles')
          .select('id, name')
          .eq('name', input.student_name as string)
          .maybeSingle();
        if (!profile) return `학생을 찾을 수 없음: ${input.student_name}`;
        const { data: token } = await sc
          .from('student_tokens')
          .select('slug, student_type')
          .eq('profile_id', profile.id)
          .maybeSingle();
        if (!token) return `토큰 없음: ${profile.name}`;
        const { data: links } = await sc
          .from('student_curriculum_links')
          .select('curricula(title)')
          .eq('profile_id', profile.id)
          .limit(1);
        const c = links?.[0]?.curricula as unknown as { title: string } | null;
        const curriculum = c?.title || '';
        const prefix = token.student_type === 'offline' ? '/c' : '/s';
        const template = buildStudentCurriculumNoticeMessage({
          siteUrl: SITE_URL,
          portalBasePath: prefix,
          portalSlug: token.slug,
          recipientLabel: profile.name,
          curriculumTitle: curriculum,
        });
        return template;
      }
      default:
        return `알 수 없는 도구: ${name}`;
    }
  } catch (err) {
    return `예외: ${err instanceof Error ? err.message : String(err)}`;
  }
}

interface ToolCallLog {
  name: string;
  input: unknown;
  result: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY 미설정' }, { status: 500 });
  }

  let body: { messages?: Anthropic.MessageParam[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const messages: Anthropic.MessageParam[] = Array.isArray(body.messages) ? [...body.messages] : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'messages 비어있음' }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const toolCalls: ToolCallLog[] = [];

  for (let i = 0; i < 8; i++) {
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
      const textParts: string[] = [];
      for (const block of response.content) {
        if (block.type === 'text') textParts.push(block.text);
      }
      return NextResponse.json({
        text: textParts.join('\n'),
        assistantContent: response.content,
        toolCalls,
      });
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

    return NextResponse.json({
      text: '(예상치 못한 응답)',
      assistantContent: response.content,
      toolCalls,
      stopReason: response.stop_reason,
    });
  }

  return NextResponse.json({ error: '도구 호출 루프가 너무 깊어짐' }, { status: 500 });
}
