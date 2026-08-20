/**
 * 자연어 명령 → Claude tool-use → 재검증 → diff 빌드.
 *
 * Phase plan:
 *   1. context 로드 (students, sets)
 *   2. Claude messages.create (with prompt caching)
 *   3. tool_use block 파싱 → PlannerOutput
 *   4. 재검증 (UUID 실존성, 월요일 검증, 한 주 2차시 한도, 중복 차단 등)
 *   5. 기존 assignments와 diff (added/removed/moved/unchanged)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ASSIGN_TOOL,
  type PlannerOutput,
  type PlannerOperation,
  type PlannerStatus,
} from './claude-tools';
import { buildSystemPromptBlocks, type AssignContext } from './build-prompt';
import { dowKst, isoToKstYmd } from './date-resolver';

export interface AssignmentDbRow {
  id: string;
  set_id: string;
  user_id: string;
  published_at: string;
  label: string | null;
  // join (optional)
  set_title?: string;
  set_subject_slug?: string;
  set_chapter_order?: number | null;
  user_name?: string;
}

export interface DiffEntry {
  user_id: string;
  user_name: string;
  set_id: string;
  set_label: string;
  set_subject_slug?: string;
  set_chapter_order?: number | null;
  published_at: string;
  publishYmd: string;        // KST YMD
  status: 'added' | 'removed' | 'moved' | 'unchanged';
  previous_published_at?: string;
  previous_assignment_id?: string;  // delete 대상 (moved/removed)
}

export interface BuildPlanResult {
  plannerOutput: PlannerOutput;
  diff: {
    added: DiffEntry[];
    removed: DiffEntry[];
    moved: DiffEntry[];
    unchanged: DiffEntry[];
    warnings: string[];
  };
  inserts: Array<{ set_id: string; user_id: string; published_at: string; label?: string | null }>;
  deletes: string[]; // assignments.id 배열
}

const MODEL = process.env.CONCEPT_ASSIGN_MODEL || 'claude-sonnet-4-6';

export async function callPlanner(
  ctx: AssignContext,
  command: string,
): Promise<PlannerOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 없음');

  const anthropic = new Anthropic({ apiKey });
  const systemBlocks = buildSystemPromptBlocks(ctx);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemBlocks,
    tools: [ASSIGN_TOOL],
    tool_choice: { type: 'tool', name: 'plan_assignments' },
    messages: [
      { role: 'user', content: command },
    ],
  });

  for (const block of message.content) {
    if (block.type === 'tool_use' && block.name === 'plan_assignments') {
      return block.input as PlannerOutput;
    }
  }
  throw new Error('Claude가 tool_use를 반환하지 않음');
}

interface RevalidateOptions {
  studentIds: Set<string>;
  setIds: Set<string>;
}

/** Claude 응답을 검증. UUID hallucination·월요일 위반·중복 등 잡아냄. */
export function revalidatePlanner(
  output: PlannerOutput,
  opts: RevalidateOptions,
): { operations: PlannerOperation[]; warnings: string[]; status: PlannerStatus } {
  const warnings: string[] = [];
  const valid: PlannerOperation[] = [];

  for (const op of output.operations || []) {
    if (!opts.studentIds.has(op.student_id)) {
      warnings.push(`알 수 없는 학생 UUID: ${op.student_id} (${op.student_name})`);
      continue;
    }
    if (!opts.setIds.has(op.set_id)) {
      warnings.push(`알 수 없는 차시 UUID: ${op.set_id} (${op.set_label})`);
      continue;
    }
    if (op.op === 'assign') {
      if (!op.published_at) {
        warnings.push(`assign에 published_at 없음: ${op.student_name} ${op.set_label}`);
        continue;
      }
      const ymd = isoToKstYmd(op.published_at);
      if (dowKst(ymd) !== 1) {
        warnings.push(`published_at이 월요일이 아님: ${op.set_label} → ${ymd}`);
        continue;
      }
    }
    valid.push(op);
  }

  // 한 주(같은 user_id+published_at)에 2차시 초과 검사
  const weekCount = new Map<string, number>();
  for (const op of valid) {
    if (op.op !== 'assign' || !op.published_at) continue;
    const key = `${op.user_id || op.student_id}:${op.published_at}`;
    weekCount.set(key, (weekCount.get(key) || 0) + 1);
  }
  for (const [key, count] of weekCount) {
    if (count > 2) {
      warnings.push(`한 주에 ${count}차시 배정됨 (한도 2차시) — 학생 dashboard에서 일부만 노출될 수 있음: ${key}`);
    }
  }

  let status = output.status;
  if (warnings.length > 0 && status === 'ok') {
    // 재검증으로 잡힌 문제는 운영자 확인 필요 상태로 격상
    status = 'requires_confirmation';
  }
  return { operations: valid, warnings, status };
}

/**
 * 검증된 operations + 현재 DB assignments → diff/inserts/deletes.
 *
 * 정책:
 *   - 같은 (user_id, set_id) row가 이미 있고 published_at도 같으면 → unchanged (skip).
 *   - 같은 (user_id, set_id)인데 published_at 다르면 → moved (delete 후 insert).
 *   - 같은 user_id + set_id로 들어오는 unassign → removed.
 */
export async function buildDiff(
  validOps: PlannerOperation[],
  sc: SupabaseClient,
  setMeta: Map<string, { title: string; subject_slug: string; chapter_order: number | null }>,
  studentMeta: Map<string, { name: string }>,
): Promise<{
  added: DiffEntry[];
  removed: DiffEntry[];
  moved: DiffEntry[];
  unchanged: DiffEntry[];
  inserts: Array<{ set_id: string; user_id: string; published_at: string; label?: string | null }>;
  deletes: string[];
}> {
  const userIds = [...new Set(validOps.map(op => op.student_id))];
  const setIds = [...new Set(validOps.map(op => op.set_id))];

  let existing: AssignmentDbRow[] = [];
  if (userIds.length && setIds.length) {
    const { data } = await sc
      .from('assignments')
      .select('id, set_id, user_id, published_at, label')
      .in('user_id', userIds)
      .in('set_id', setIds);
    existing = (data || []) as AssignmentDbRow[];
  }
  const existingByKey = new Map<string, AssignmentDbRow>(
    existing.map(a => [`${a.user_id}:${a.set_id}`, a]),
  );

  const added: DiffEntry[] = [];
  const removed: DiffEntry[] = [];
  const moved: DiffEntry[] = [];
  const unchanged: DiffEntry[] = [];
  const inserts: Array<{ set_id: string; user_id: string; published_at: string; label?: string | null }> = [];
  const deletes: string[] = [];

  for (const op of validOps) {
    const setM = setMeta.get(op.set_id);
    const userM = studentMeta.get(op.student_id);
    const key = `${op.student_id}:${op.set_id}`;
    const ex = existingByKey.get(key);

    if (op.op === 'unassign') {
      if (ex) {
        deletes.push(ex.id);
        removed.push({
          user_id: op.student_id,
          user_name: userM?.name || op.student_name,
          set_id: op.set_id,
          set_label: op.set_label,
          set_subject_slug: setM?.subject_slug,
          set_chapter_order: setM?.chapter_order,
          published_at: ex.published_at,
          publishYmd: ex.published_at ? isoToKstYmd(ex.published_at) : '',
          status: 'removed',
          previous_assignment_id: ex.id,
        });
      }
      continue;
    }

    // op === 'assign'
    if (!op.published_at) continue;
    if (ex) {
      if (ex.published_at === op.published_at) {
        unchanged.push({
          user_id: op.student_id,
          user_name: userM?.name || op.student_name,
          set_id: op.set_id,
          set_label: op.set_label,
          set_subject_slug: setM?.subject_slug,
          set_chapter_order: setM?.chapter_order,
          published_at: op.published_at,
          publishYmd: isoToKstYmd(op.published_at),
          status: 'unchanged',
        });
      } else {
        // moved (replace)
        deletes.push(ex.id);
        inserts.push({
          set_id: op.set_id,
          user_id: op.student_id,
          published_at: op.published_at,
          label: op.label,
        });
        moved.push({
          user_id: op.student_id,
          user_name: userM?.name || op.student_name,
          set_id: op.set_id,
          set_label: op.set_label,
          set_subject_slug: setM?.subject_slug,
          set_chapter_order: setM?.chapter_order,
          published_at: op.published_at,
          publishYmd: isoToKstYmd(op.published_at),
          status: 'moved',
          previous_published_at: ex.published_at,
          previous_assignment_id: ex.id,
        });
      }
    } else {
      inserts.push({
        set_id: op.set_id,
        user_id: op.student_id,
        published_at: op.published_at,
        label: op.label,
      });
      added.push({
        user_id: op.student_id,
        user_name: userM?.name || op.student_name,
        set_id: op.set_id,
        set_label: op.set_label,
        set_subject_slug: setM?.subject_slug,
        set_chapter_order: setM?.chapter_order,
        published_at: op.published_at,
        publishYmd: isoToKstYmd(op.published_at),
        status: 'added',
      });
    }
  }

  return { added, removed, moved, unchanged, inserts, deletes };
}
