import 'server-only';

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import { CONCEPT_LIBRARY_ID, EXAM_LIBRARY_ID } from '@/lib/bunny-libraries';
import {
  collectContentAssets,
  DS2_CURRICULUM_TITLES,
  isReadinessListRow,
  type Ds2ReadinessRow,
  type Ds2ReadinessSnapshot,
  type HealthState,
  type ReadinessCategory,
} from './ds2-readiness';

class ReadinessDataError extends Error {
  constructor(readonly operation: string, message: string) {
    super(`${operation}: ${message}`);
    this.name = 'ReadinessDataError';
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ReadinessDataError('환경 변수 확인', `${name}이 없습니다`);
  return value;
}

function parseCategory(value: unknown): ReadinessCategory | null {
  if (value === 'concept' || value === 'gichul' || value === 'shimhwa') return value;
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function mapHealth<T>(
  values: readonly T[],
  inspect: (value: T) => Promise<HealthState>,
): Promise<ReadonlyMap<T, HealthState>> {
  const entries: Array<readonly [T, HealthState]> = [];
  const queue = [...values];
  const workers = Array.from({ length: Math.min(12, queue.length) }, async () => {
    while (queue.length > 0) {
      const value = queue.shift();
      if (value === undefined) return;
      entries.push([value, await inspect(value)] as const);
    }
  });
  await Promise.all(workers);
  return new Map(entries);
}

async function inspectPdf(url: string): Promise<HealthState> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok ? 'ok' : 'error';
  } catch (error: unknown) {
    if (error instanceof Error) return 'error';
    throw error;
  }
}

async function inspectVideo(
  id: string,
  category: ReadinessCategory,
): Promise<HealthState> {
  const concept = category === 'concept';
  const apiKey = process.env[concept ? 'BUNNY_API_KEY' : 'BUNNY_EXAM_API_KEY'];
  if (!apiKey) return 'unchecked';
  const libraryId = concept
    ? process.env.BUNNY_LIBRARY_ID || CONCEPT_LIBRARY_ID
    : process.env.BUNNY_EXAM_LIBRARY_ID || EXAM_LIBRARY_ID;

  try {
    const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${id}`, {
      headers: { AccessKey: apiKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return 'error';
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null || !('status' in body)) return 'error';
    return body.status === 4 ? 'ok' : 'error';
  } catch (error: unknown) {
    if (error instanceof Error) return 'error';
    throw error;
  }
}

async function attachHealth(rows: readonly Ds2ReadinessRow[]): Promise<readonly Ds2ReadinessRow[]> {
  const pdfUrls = Array.from(new Set(rows.flatMap((row) => [
    ...row.assets.pdfs.map((asset) => asset.url),
    ...row.assets.hintbooks.map((asset) => asset.url),
  ])));
  const videoKeys = Array.from(new Set(rows.flatMap((row) =>
    row.assets.videos.map((asset) => `${row.category}:${asset.id}`),
  )));

  const [pdfHealth, videoHealth] = await Promise.all([
    mapHealth(pdfUrls, inspectPdf),
    mapHealth(videoKeys, (key) => {
      const separator = key.indexOf(':');
      const category = parseCategory(key.slice(0, separator));
      const id = key.slice(separator + 1);
      return category ? inspectVideo(id, category) : Promise.resolve('error');
    }),
  ]);

  return rows.map((row) => ({
    ...row,
    assets: {
      pdfs: row.assets.pdfs.map((asset) => ({ ...asset, health: pdfHealth.get(asset.url) || 'unchecked' })),
      hintbooks: row.assets.hintbooks.map((asset) => ({ ...asset, health: pdfHealth.get(asset.url) || 'unchecked' })),
      videos: row.assets.videos.map((asset) => ({
        ...asset,
        health: videoHealth.get(`${row.category}:${asset.id}`) || 'unchecked',
      })),
    },
  }));
}

export async function loadDs2Readiness(checkHealth = false): Promise<Ds2ReadinessSnapshot> {
  noStore();

  const sc = createServiceClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_KEY'),
  );

  const curriculaResult = await sc
    .from('curricula')
    .select('id, title')
    .eq('subject_slug', 'ds2')
    .in('title', [...DS2_CURRICULUM_TITLES])
    .is('archived_at', null);
  if (curriculaResult.error) throw new ReadinessDataError('대수 커리큘럼 조회', curriculaResult.error.message);

  const curriculumIds = (curriculaResult.data || []).map((row) => String(row.id));
  if (curriculumIds.length === 0) return { rows: [], healthCheckedAt: null };

  const itemsResult = await sc
    .from('curriculum_items')
    .select('id, category, session_number, title, unit_name, variant_label, public_slug')
    .in('curriculum_id', curriculumIds)
    .is('archived_at', null);
  if (itemsResult.error) throw new ReadinessDataError('대수 학습 페이지 조회', itemsResult.error.message);

  const itemIds = (itemsResult.data || []).map((row) => String(row.id));
  const [blocksResult, assignmentsResult] = await Promise.all([
    sc.from('session_blocks').select('curriculum_item_id, block_type, content').in('curriculum_item_id', itemIds),
    sc.from('student_lesson_assignments').select('curriculum_item_id').in('curriculum_item_id', itemIds),
  ]);
  if (blocksResult.error) throw new ReadinessDataError('대수 콘텐츠 블록 조회', blocksResult.error.message);
  if (assignmentsResult.error) throw new ReadinessDataError('대수 배정 수 조회', assignmentsResult.error.message);

  const blockMap = new Map<string, Array<{ readonly block_type: string; readonly content: unknown }>>();
  (blocksResult.data || []).forEach((block) => {
    const id = String(block.curriculum_item_id);
    const list = blockMap.get(id) || [];
    list.push({ block_type: String(block.block_type), content: block.content });
    blockMap.set(id, list);
  });
  const assignmentMap = new Map<string, number>();
  (assignmentsResult.data || []).forEach((assignment) => {
    const id = String(assignment.curriculum_item_id);
    assignmentMap.set(id, (assignmentMap.get(id) || 0) + 1);
  });

  const categoryOrder: readonly ReadinessCategory[] = ['concept', 'gichul', 'shimhwa'];
  const rows = (itemsResult.data || []).flatMap((item): readonly Ds2ReadinessRow[] => {
    const category = parseCategory(item.category);
    if (!category) return [];
    const id = String(item.id);
    const blocks = blockMap.get(id) || [];
    return [{
      id,
      category,
      sessionNumber: numberOrNull(item.session_number),
      title: stringOrNull(item.title) || stringOrNull(item.unit_name) || '(제목 없음)',
      variantLabel: stringOrNull(item.variant_label),
      publicSlug: stringOrNull(item.public_slug),
      assignmentCount: assignmentMap.get(id) || 0,
      blockCount: blocks.length,
      assets: collectContentAssets(blocks),
    }];
  }).filter(isReadinessListRow).sort((left, right) => {
    const categoryDiff = categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category);
    if (categoryDiff !== 0) return categoryDiff;
    const sessionDiff = (left.sessionNumber || 999) - (right.sessionNumber || 999);
    if (sessionDiff !== 0) return sessionDiff;
    return (left.variantLabel || '').localeCompare(right.variantLabel || '', 'ko');
  });

  return {
    rows: checkHealth ? await attachHealth(rows) : rows,
    healthCheckedAt: checkHealth ? new Date().toISOString() : null,
  };
}
