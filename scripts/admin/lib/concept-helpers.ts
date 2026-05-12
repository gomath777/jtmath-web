/**
 * 개념강의·기출·심화 공통 헬퍼
 *
 * seed-concept-seasons.ts 에 분산되어 있던 패턴 추출:
 *   - makePdfEntry: CDN URL → content_group.pdf/pdfs 객체
 *   - slugSuffix: 짧은 랜덤 hex 생성
 *   - findOrCreateCurriculum: title+subject 기준 find-or-create
 *   - findOrCreateCurriculumItem: (curriculum_id, session, category, variant_label) 기준 upsert
 *   - resolveDrivePath: Google Drive 0lecture_vid 하위 상대 경로 → 절대 경로
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { info, warn } from '../_shared.js';
import { uploadPdfFromPath } from '../../../src/utils/bunny-storage.js';

const CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME_PDF || 'mathgo-pdfs.b-cdn.net';

// Google Drive base path (운영자 머신)
const DRIVE_BASE = path.join(
  process.env.HOME || '',
  'Library/CloudStorage/GoogleDrive-gochangeon@gmail.com/My Drive/0lecture_vid',
);

export interface PdfEntry {
  url: string;
  original_name: string;
  file_size?: string;
}

/** storage path → CDN URL + original_name 객체 */
export function makePdfEntry(storagePathOrUrl: string, originalName: string, fileSizeMB?: number): PdfEntry {
  const url = storagePathOrUrl.startsWith('https://')
    ? storagePathOrUrl
    : `https://${CDN_HOSTNAME}/${storagePathOrUrl}`;
  return {
    url,
    original_name: originalName,
    ...(fileSizeMB !== undefined ? { file_size: `${fileSizeMB.toFixed(1)}MB` } : {}),
  };
}

/** 6자리 hex random suffix */
export function slugSuffix(): string {
  return crypto.randomBytes(3).toString('hex');
}

/** Google Drive 0lecture_vid 기준 상대 경로 → 절대 경로 */
export function resolveDrivePath(relativePath: string): string {
  return path.join(DRIVE_BASE, relativePath);
}

/**
 * PDF를 Bunny Storage에 업로드하고 PdfEntry 반환.
 * dryRun=true 면 로컬 파일 존재 확인만 하고 mock URL 반환 (실제 업로드 스킵).
 */
export async function uploadAndMakePdf(
  localPath: string,
  storagePath: string,
  originalName: string,
  dryRun = false,
): Promise<PdfEntry | null> {
  if (!fs.existsSync(localPath)) {
    warn(`PDF 파일 없음 (스킵): ${localPath}`);
    return null;
  }
  if (dryRun) {
    const sizeMB = fs.statSync(localPath).size / 1024 / 1024;
    info(`  [DRY] ${originalName} (${sizeMB.toFixed(1)}MB) → ${storagePath}`);
    return makePdfEntry(storagePath, originalName, sizeMB);
  }
  try {
    const { cdnUrl, skipped } = await uploadPdfFromPath(localPath, storagePath);
    const sizeMB = fs.statSync(localPath).size / 1024 / 1024;
    info(`  ${skipped ? '⏭️  (기존)' : '✅ 업로드'} ${originalName}`);
    return makePdfEntry(cdnUrl, originalName, sizeMB);
  } catch (err) {
    warn(`업로드 실패 (스킵): ${originalName} — ${(err as Error).message}`);
    return null;
  }
}

/** curricula 테이블 find-or-create (title + subject_slug 기준) */
export async function findOrCreateCurriculum(
  sc: SupabaseClient,
  title: string,
  subject_slug: string,
  start_date = '2026-01-01',
  dryRun = false,
): Promise<{ id: string; created: boolean }> {
  const { data: existing } = await sc
    .from('curricula')
    .select('id')
    .eq('title', title)
    .eq('subject_slug', subject_slug)
    .maybeSingle();

  if (existing) return { id: existing.id, created: false };

  if (dryRun) {
    info(`[DRY RUN] 새 curriculum 생성 예정: "${title}" (${subject_slug})`);
    return { id: '(dry-run)', created: true };
  }

  const { data, error } = await sc
    .from('curricula')
    .insert({ title, subject_slug, start_date, schedule_pattern: 'flexible' })
    .select('id')
    .single();

  if (error) throw new Error(`curriculum 생성 실패: ${error.message}`);
  return { id: data!.id, created: true };
}

export interface ItemUpsertOptions {
  curriculum_id: string;
  session_number: number;
  title: string;
  unit_name?: string;
  category: string;
  variant_label?: string | null;
  sort_order?: number;
  /** slug 미지정 시 자동 생성: {subject}-{category}-{NN}-{6hex} */
  public_slug?: string;
  publish_date?: string;
}

export interface ItemUpsertResult {
  id: string;
  public_slug: string;
  action: 'found' | 'created';
}

/**
 * curriculum_items find-or-create.
 * 매칭 키: (curriculum_id, session_number, category, variant_label)
 * 존재하면 title/unit_name/sort_order UPDATE 후 반환.
 */
export async function findOrCreateCurriculumItem(
  sc: SupabaseClient,
  opts: ItemUpsertOptions,
  subjectSlug: string,
  dryRun = false,
): Promise<ItemUpsertResult> {
  let query = sc
    .from('curriculum_items')
    .select('id, public_slug')
    .eq('curriculum_id', opts.curriculum_id)
    .eq('session_number', opts.session_number)
    .eq('category', opts.category)
    .is('archived_at', null);

  if (opts.variant_label) {
    query = query.eq('variant_label', opts.variant_label);
  } else {
    query = query.is('variant_label', null);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    if (!dryRun) {
      await sc.from('curriculum_items').update({
        title: opts.title,
        ...(opts.unit_name !== undefined ? { unit_name: opts.unit_name } : {}),
        ...(opts.sort_order !== undefined ? { sort_order: opts.sort_order } : {}),
      }).eq('id', existing.id);
    }
    return { id: existing.id, public_slug: existing.public_slug, action: 'found' };
  }

  const nn = String(opts.session_number).padStart(2, '0');
  const slug = opts.public_slug || `${subjectSlug}-${opts.category}-${nn}-${slugSuffix()}`;
  const publish_date = opts.publish_date || '2026-01-01';

  if (dryRun) {
    info(`[DRY RUN] 새 item: session=${opts.session_number} "${opts.title}" slug=${slug}`);
    return { id: '(dry-run)', public_slug: slug, action: 'created' };
  }

  const { data, error } = await sc
    .from('curriculum_items')
    .insert({
      curriculum_id: opts.curriculum_id,
      session_number: opts.session_number,
      week_number: null,
      label: opts.title,
      title: opts.title,
      unit_name: opts.unit_name ?? opts.title,
      category: opts.category,
      variant_label: opts.variant_label ?? null,
      sort_order: opts.sort_order ?? opts.session_number,
      public_slug: slug,
      publish_date,
      is_released: true,
    })
    .select('id, public_slug')
    .single();

  if (error) throw new Error(`curriculum_item 생성 실패: ${error.message}`);
  return { id: data!.id, public_slug: data!.public_slug, action: 'created' };
}
