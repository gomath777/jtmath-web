/**
 * Claude Anthropic SDK용 tool 정의.
 *
 * 자연어 명령 → operations[] 배열 추출. tool-use 강제로 hallucination 방지.
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export type PlannerStatus =
  | 'ok'
  | 'ambiguous'
  | 'unknown_student'
  | 'unknown_set'
  | 'parse_error'
  | 'requires_confirmation';

export interface PlannerOperation {
  op: 'assign' | 'unassign';
  student_id: string;       // profiles.id (UUID)
  student_name: string;
  set_id: string;            // learning_sets.id (UUID)
  set_label: string;         // 예: "공수1 8차시"
  published_at?: string;     // ISO. assign 시 필수. KST 월요일 자정 = UTC 일요일 15:00.
  label?: string;
}

export interface PlannerOutput {
  status: PlannerStatus;
  summary_ko: string;
  ambiguity_candidates?: string[];   // 학생 UUID들
  operations: PlannerOperation[];
  notes?: string;                    // 운영자에게 전달할 메모
}

export const ASSIGN_TOOL: Tool = {
  name: 'plan_assignments',
  description:
    '학원 운영자의 한국어 자연어 명령을 학생-차시 배정 계획으로 변환. ' +
    'student_id와 set_id는 시스템 프롬프트에 제공된 명단의 UUID만 사용. ' +
    '명령이 모호하거나 명단에 없는 학생/차시면 status를 적절히 설정.',
  input_schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['ok', 'ambiguous', 'unknown_student', 'unknown_set', 'parse_error', 'requires_confirmation'],
        description: 'ok=정상, ambiguous=학생 이름 모호, unknown_student/unknown_set=명단 외, parse_error=명령 의도 불명, requires_confirmation=destructive 작업이라 확인 필요',
      },
      summary_ko: {
        type: 'string',
        description: '운영자에게 보여줄 한국어 요약 (1~2문장)',
      },
      ambiguity_candidates: {
        type: 'array',
        items: { type: 'string' },
        description: 'status=ambiguous일 때 후보 학생 UUID 배열',
      },
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            op: { type: 'string', enum: ['assign', 'unassign'] },
            student_id: { type: 'string', description: 'profiles.id (UUID)' },
            student_name: { type: 'string', description: '확인용. 매칭한 학생 이름' },
            set_id: { type: 'string', description: 'learning_sets.id (UUID)' },
            set_label: { type: 'string', description: '확인용. 예: "공수1 8차시"' },
            published_at: {
              type: 'string',
              description: 'ISO 8601. KST 월요일 자정의 UTC 표현 (예: "2026-05-03T15:00:00.000Z" = KST 5/4 0시). assign 시 필수.',
            },
            label: { type: 'string', description: '선택. 운영자용 메모.' },
          },
          required: ['op', 'student_id', 'student_name', 'set_id', 'set_label'],
        },
      },
      notes: { type: 'string' },
    },
    required: ['status', 'summary_ko', 'operations'],
  },
};
