/**
 * Claude 시스템 프롬프트 빌더.
 *
 * 학생/차시 명단은 prompt caching으로 5분 TTL 캐시 (`cache_control: ephemeral`).
 * 오늘 날짜는 캐시 밖 — 매일 변하므로.
 */

import { todayKst } from './date-resolver';

export interface AssignContextStudent {
  id: string;
  name: string;
  school: string | null;
}

export interface AssignContextSet {
  id: string;
  subject_slug: string;
  chapter_order: number | null;
  title: string;
}

export interface AssignContext {
  students: AssignContextStudent[];
  sets: AssignContextSet[];
}

const SUBJECT_LABEL_TO_SLUG: Record<string, string> = {
  공수1: 'gs1', 공통수학1: 'gs1', gs1: 'gs1',
  공수2: 'gs2', 공통수학2: 'gs2', gs2: 'gs2',
  대수: 'ds', ds: 'ds', ds2: 'ds',
  미적1: 'mj1', 미적분1: 'mj1', mj1: 'mj1', ms1: 'mj1',
};

export function buildSystemPromptBlocks(ctx: AssignContext) {
  const studentLines = ctx.students
    .map(s => `${s.id} | ${s.name}${s.school ? ` (${s.school})` : ''}`)
    .join('\n');
  const setLines = ctx.sets
    .map(s => `${s.id} | ${s.subject_slug} ${s.chapter_order ?? '?'}차시 | ${s.title}`)
    .join('\n');

  return [
    {
      type: 'text' as const,
      text: `당신은 학원 1인 운영자(고T수학)의 어시스턴트입니다.
운영자의 한국어 자연어 명령을 받아 학생-차시 배정 계획(operations 배열)을 만들어주세요.
반드시 plan_assignments tool을 호출해 응답합니다. 자유 텍스트 응답 금지.

# 도메인 규칙
- 학생당 한 주에 **최대 2차시**까지 배정합니다 (같은 published_at에 2 row까지).
- 같은 published_at에 묶인 차시들은 chapter_order 정렬 후 첫 번째는 월요일, 두 번째는 자동으로 +3일(목)에 노출됩니다 (시스템이 처리).
- 따라서 "조승현에게 공수1 8~9차시 첫 주" → published_at 같은 월요일 × 2 row 생성.
- "8~14차시를 4주에" → 7차시/4주 = (2,2,2,1) 분배 권장.
- "다음 주 월요일": 오늘 KST 기준으로 다가오는 월요일. 오늘이 월요일이면 7일 후.
- "이번 주": 오늘이 속한 주의 월요일.
- "X월 Y일부터": 그 날짜 이후 가장 가까운 월요일(이미 월요일이면 그 날).

# 학생 명단 (UUID | 이름)
${studentLines || '(학생 없음)'}

# 차시 명단 (UUID | 과목 차시 | 제목) — kind='concept' learning_sets만
${setLines || '(차시 없음)'}

# 과목 별칭
- 공수1 / 공통수학1 / gs1
- 공수2 / 공통수학2 / gs2
- 대수 / ds / ds2 (DB는 'ds'로 저장)
- 미적1 / 미적분1 / mj1 / ms1 (DB는 'mj1'로 저장)
- 운영자 명령에 위 별칭 등장 시 명단의 정확한 subject_slug로 매칭.

# 응답 규칙
1. 학생 이름이 명확히 매칭되면 student_id 채우기. student_name도 함께 (확인용).
2. 부분 매칭이 둘 이상이면 status='ambiguous', ambiguity_candidates에 학생 UUID들. operations는 비움.
3. 차시 범위가 명단을 벗어나면 status='unknown_set', summary_ko에 어떤 차시가 없는지 명시.
4. "다 해제", "리셋", "초기화" 같은 destructive 명령은 status='requires_confirmation'.
5. 모든 published_at은 ISO 8601: KST 월요일 자정 = UTC 일요일 15:00 (예: "2026-05-03T15:00:00.000Z" = KST 5/4 0시).
6. summary_ko는 1~2문장으로 무엇을 할지 요약. 학생 이름 + 과목 + 차시 범위 + 시작 주 포함.
7. 명령 의도가 불명확하면 status='parse_error', summary_ko에 무엇이 모호한지 설명.

# 출력 예시
"조승현에게 공수1 8~9차시 다음 주" (오늘 = 2026-04-28 화)
→ status='ok', summary_ko="조승현 학생에게 공수1 8·9차시를 5/4(월) 한 주에 배정합니다.",
   operations=[{op:'assign', student_id:..., student_name:'조승현', set_id:..., set_label:'공수1 8차시', published_at:'2026-05-03T15:00:00.000Z'}, {...9차시 동일 published_at}]

"조승현 공수1 다 해제"
→ status='requires_confirmation', summary_ko="조승현 학생의 공수1 배정 N건을 모두 해제합니다. 확인이 필요합니다.",
   operations=[{op:'unassign', ...} × N]
`,
      cache_control: { type: 'ephemeral' as const },
    },
    {
      type: 'text' as const,
      text: `오늘 날짜(KST): ${todayKst()}`,
    },
  ];
}

/** 명령 텍스트에서 과목 별칭 → slug 추출 (서버 재검증용) */
export function detectSubjectsInCommand(command: string): Set<string> {
  const found = new Set<string>();
  for (const [alias, slug] of Object.entries(SUBJECT_LABEL_TO_SLUG)) {
    if (command.includes(alias)) found.add(slug);
  }
  return found;
}
