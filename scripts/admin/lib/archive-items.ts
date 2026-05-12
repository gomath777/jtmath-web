/**
 * curriculum_items 아카이브 헬퍼
 *
 * archiveActiveItems: 특정 curriculum_id + category 의 active item(archived_at IS NULL)을
 * 일괄 archived_at = now() 처리.
 *
 * 사전 조건 확인: 배정된 학생(SLA)이 있으면 --force 없이는 중단.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { warn, info } from '../_shared.js';

export interface ArchiveResult {
  archivedCount: number;
  slugs: string[];
}

/**
 * curriculumId + category 의 active items를 아카이브.
 * dryRun=true 면 DB 변경 없이 대상 목록만 반환.
 * force=false(기본) 면 SLA 존재 시 에러 throw.
 */
export async function archiveActiveItems(
  sc: SupabaseClient,
  curriculumId: string,
  category: string,
  options: { dryRun?: boolean; force?: boolean } = {},
): Promise<ArchiveResult> {
  const { dryRun = false, force = false } = options;

  // 대상 items 조회
  const { data: items, error: fetchErr } = await sc
    .from('curriculum_items')
    .select('id, public_slug, title')
    .eq('curriculum_id', curriculumId)
    .eq('category', category)
    .is('archived_at', null);

  if (fetchErr) throw new Error(`curriculum_items 조회 실패: ${fetchErr.message}`);
  if (!items || items.length === 0) {
    info(`아카이브 대상 없음 (curriculum=${curriculumId.slice(0, 8)}, category=${category})`);
    return { archivedCount: 0, slugs: [] };
  }

  const itemIds = items.map(i => i.id);

  // SLA 배정 여부 확인
  if (!force) {
    const { count, error: slaErr } = await sc
      .from('student_lesson_assignments')
      .select('id', { count: 'exact', head: true })
      .in('curriculum_item_id', itemIds);

    if (slaErr) throw new Error(`SLA 조회 실패: ${slaErr.message}`);
    if (count && count > 0) {
      throw new Error(
        `이미 ${count}명에게 배정된 페이지가 있습니다. 아카이브하려면 --force 플래그를 사용하세요.`,
      );
    }
  }

  const slugs = items.map(i => i.public_slug).filter(Boolean);
  info(`아카이브 대상: ${items.length}개`);
  items.forEach(i => info(`  - [${i.public_slug}] ${i.title}`));

  if (dryRun) {
    warn('DRY RUN: 실제 아카이브 스킵');
    return { archivedCount: 0, slugs };
  }

  const { error: updateErr } = await sc
    .from('curriculum_items')
    .update({ archived_at: new Date().toISOString() })
    .in('id', itemIds);

  if (updateErr) throw new Error(`아카이브 실패: ${updateErr.message}`);

  return { archivedCount: items.length, slugs };
}
