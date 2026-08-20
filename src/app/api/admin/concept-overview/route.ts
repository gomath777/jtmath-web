/**
 * 개념강의 콘텐츠 현황 매트릭스 데이터.
 *
 * 4과목(gs1/gs2/ds/mj1) × 차시(1~16 또는 1~14)의 status를 한 번에 반환.
 * 메타 JSON은 정적 import (Vercel outputFileTracing 호환).
 *
 * GET /api/admin/concept-overview
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

import gs1Meta from '@/data/concept-meta/gs1.json';
import gs2Meta from '@/data/concept-meta/gs2.json';
import dsMeta from '@/data/concept-meta/ds.json';
import mj1Meta from '@/data/concept-meta/mj1.json';

interface ChapterMetaJson {
  chapter_order: number;
  title: string;
  notion_page_id: string;
  lectures: Array<{
    lecture_number: number;
    bunny_guid: string;
    pdf_attachment_name: string;
  }>;
  placeholder?: boolean;
}

const META_MAP: Record<string, { label: string; data: ChapterMetaJson[] }> = {
  gs1: { label: '공수1', data: gs1Meta as ChapterMetaJson[] },
  gs2: { label: '공수2', data: gs2Meta as ChapterMetaJson[] },
  ds: { label: '대수', data: dsMeta as ChapterMetaJson[] },
  mj1: { label: '미적1', data: mj1Meta as ChapterMetaJson[] },
};

const SUBJECT_ORDER: Array<keyof typeof META_MAP> = ['gs1', 'gs2', 'ds', 'mj1'];

type ChapterStatus =
  | 'complete'
  | 'placeholder'
  | 'missing'
  | 'pdf_only'
  | 'video_only'
  | 'out_of_scope';

interface ChapterCell {
  chapter_order: number;
  set_id: string | null;
  title: string | null;
  db_title: string | null;
  videos_count: number;
  pdfs_count: number;
  total_duration_seconds: number;
  assignment_count: number;
  placeholder: boolean;
  status: ChapterStatus;
}

interface SubjectRow {
  subject_slug: string;
  subject_label: string;
  expected_chapters: number[];
  chapters: ChapterCell[];
  summary: {
    total_chapters: number;
    db_chapters: number;
    total_videos: number;
    total_pdfs: number;
    missing_count: number;
  };
}

const MATRIX_COLUMNS = 16; // 매트릭스는 1..16 칸 그리드 (ds/mj1은 15·16 → out_of_scope)

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // 1) DB 차시 + 영상 한 번에
  const { data: sets, error: setsErr } = await sc
    .from('learning_sets')
    .select(`
      id, title, subject_slug, chapter_order, pdfs,
      learning_set_videos ( id, duration_seconds )
    `)
    .eq('kind', 'concept');
  if (setsErr) return NextResponse.json({ error: setsErr.message }, { status: 500 });

  // 2) 배정 학생 수 (set_id별)
  const { data: assigns, error: assignsErr } = await sc
    .from('assignments')
    .select('set_id')
    .not('set_id', 'is', null);
  if (assignsErr) return NextResponse.json({ error: assignsErr.message }, { status: 500 });
  const assignCount = new Map<string, number>();
  for (const a of assigns || []) {
    if (a.set_id) assignCount.set(a.set_id, (assignCount.get(a.set_id) || 0) + 1);
  }

  // 3) DB 인덱스: subject_slug + chapter_order → set
  type DbSet = {
    id: string;
    title: string;
    subject_slug: string;
    chapter_order: number;
    pdfs: Array<{ url: string; original_name?: string }> | null;
    learning_set_videos: Array<{ id: string; duration_seconds: number | null }>;
  };
  const dbBySubjOrder = new Map<string, DbSet>();
  for (const s of (sets as DbSet[] | null) || []) {
    if (!s.subject_slug || s.chapter_order == null) continue;
    dbBySubjOrder.set(`${s.subject_slug}:${s.chapter_order}`, s);
  }

  // 4) 매트릭스 빌드
  const subjects: SubjectRow[] = [];
  for (const slug of SUBJECT_ORDER) {
    const meta = META_MAP[slug];
    const expected = meta.data.map(c => c.chapter_order).sort((a, b) => a - b);
    const expectedSet = new Set(expected);
    const metaByOrder = new Map(meta.data.map(c => [c.chapter_order, c]));

    const chapters: ChapterCell[] = [];
    let dbChapters = 0;
    let totalVideos = 0;
    let totalPdfs = 0;
    let missing = 0;

    for (let order = 1; order <= MATRIX_COLUMNS; order++) {
      const inScope = expectedSet.has(order);
      const metaCh = metaByOrder.get(order);
      const dbSet = dbBySubjOrder.get(`${slug}:${order}`);
      const isPlaceholder = !!metaCh?.placeholder;

      if (!inScope) {
        chapters.push({
          chapter_order: order,
          set_id: null,
          title: null,
          db_title: null,
          videos_count: 0,
          pdfs_count: 0,
          total_duration_seconds: 0,
          assignment_count: 0,
          placeholder: false,
          status: 'out_of_scope',
        });
        continue;
      }

      const videosCount = dbSet?.learning_set_videos?.length || 0;
      const pdfsCount = Array.isArray(dbSet?.pdfs) ? dbSet!.pdfs!.length : 0;
      const duration = (dbSet?.learning_set_videos || []).reduce(
        (acc, v) => acc + (v.duration_seconds || 0),
        0,
      );
      const assignmentCount = dbSet ? assignCount.get(dbSet.id) || 0 : 0;

      let status: ChapterStatus;
      if (!dbSet) {
        status = 'missing';
        missing++;
      } else if (isPlaceholder) {
        status = 'placeholder';
      } else if (videosCount > 0 && pdfsCount > 0) {
        status = 'complete';
      } else if (pdfsCount > 0) {
        status = 'pdf_only';
      } else if (videosCount > 0) {
        status = 'video_only';
      } else {
        // DB row 있지만 둘 다 0 (placeholder 아닌 빈 상태) — placeholder로 취급
        status = 'placeholder';
      }

      if (dbSet) dbChapters++;
      totalVideos += videosCount;
      totalPdfs += pdfsCount;

      chapters.push({
        chapter_order: order,
        set_id: dbSet?.id || null,
        title: metaCh?.title || null,
        db_title: dbSet?.title || null,
        videos_count: videosCount,
        pdfs_count: pdfsCount,
        total_duration_seconds: duration,
        assignment_count: assignmentCount,
        placeholder: isPlaceholder,
        status,
      });
    }

    subjects.push({
      subject_slug: slug,
      subject_label: meta.label,
      expected_chapters: expected,
      chapters,
      summary: {
        total_chapters: expected.length,
        db_chapters: dbChapters,
        total_videos: totalVideos,
        total_pdfs: totalPdfs,
        missing_count: missing,
      },
    });
  }

  return NextResponse.json({ subjects });
}
