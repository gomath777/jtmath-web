/**
 * session_blocks idempotent upsert 헬퍼
 *
 * 매칭 키: (curriculum_item_id, order_index)
 * - 있으면 content UPDATE
 * - 없으면 INSERT
 *
 * Phase E 재실행 정책 구현.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { info } from '../_shared.js';

export interface BlockUpsertInput {
  curriculum_item_id: string;
  block_type: 'content_group';
  order_index: number;
  content: Record<string, unknown>;
  variant?: string;
}

export interface BlockUpsertResult {
  id: string;
  action: 'inserted' | 'updated';
}

export async function upsertBlock(
  sc: SupabaseClient,
  block: BlockUpsertInput,
  dryRun = false,
): Promise<BlockUpsertResult> {
  const { data: existing } = await sc
    .from('session_blocks')
    .select('id')
    .eq('curriculum_item_id', block.curriculum_item_id)
    .eq('order_index', block.order_index)
    .eq('variant', block.variant ?? 'default')
    .maybeSingle();

  if (dryRun) {
    return {
      id: existing?.id ?? '(dry-run)',
      action: existing ? 'updated' : 'inserted',
    };
  }

  if (existing) {
    const { error } = await sc
      .from('session_blocks')
      .update({ content: block.content, block_type: block.block_type })
      .eq('id', existing.id);
    if (error) throw new Error(`블록 업데이트 실패 (order=${block.order_index}): ${error.message}`);
    return { id: existing.id, action: 'updated' };
  }

  const { data, error } = await sc
    .from('session_blocks')
    .insert({
      curriculum_item_id: block.curriculum_item_id,
      block_type: block.block_type,
      order_index: block.order_index,
      content: block.content,
      variant: block.variant ?? 'default',
    })
    .select('id')
    .single();

  if (error) throw new Error(`블록 삽입 실패 (order=${block.order_index}): ${error.message}`);
  return { id: data!.id, action: 'inserted' };
}

/**
 * curriculum_item 하나에 속한 블록 여러 개를 한 번에 upsert.
 */
export async function upsertBlocks(
  sc: SupabaseClient,
  blocks: BlockUpsertInput[],
  dryRun = false,
): Promise<BlockUpsertResult[]> {
  const results: BlockUpsertResult[] = [];
  for (const b of blocks) {
    const r = await upsertBlock(sc, b, dryRun);
    info(`  블록 order=${b.order_index} "${(b.content as { label?: string }).label ?? ''}" → ${r.action}`);
    results.push(r);
  }
  return results;
}
