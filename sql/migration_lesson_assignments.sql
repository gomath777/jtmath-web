-- ============================================================================
-- Migration: Lesson Pages + Student-Page Assignments (v2)
-- ============================================================================
-- 목적:
--   1) curriculum_items 를 자유로운 "학습 페이지(lesson)" 단위로 재해석
--      - public_slug 컬럼 추가 → /lesson/{slug} 단일 공개 URL
--      - title 컬럼 추가 → label과 별개로 페이지 표시명
--      - curriculum_id / week_number / session_number 를 nullable 로 (자유 페이지 허용)
--   2) student_lesson_assignments 테이블 신설 → 학생×페이지×날짜 단순 매트릭스
--   3) 기존 3모델 (student_curriculum_links, student_sessions, block_assignments) 데이터
--      를 SLA 한 테이블로 통합 백필
--
-- 무중단 전환: 이 마이그레이션은 신 테이블·컬럼만 추가하고 기존 데이터는 건드리지 않음.
-- 신 코드 배포 시점부터 SLA 가 단일 소스. 1주 관찰 후 PR-7 에서 옛 모델 deprecate.
--
-- 실행:
--   psql 또는 Supabase Management API 또는 SQL Editor 에서 실행.
--   트랜잭션 안에서 동작하므로 중간 실패 시 자동 롤백.
-- ============================================================================

BEGIN;

-- ─── 공용 트리거 함수 (이미 있으면 그대로 둠) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. curriculum_items 확장 ────────────────────────────────────────────────
ALTER TABLE public.curriculum_items
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT;

DO $$
BEGIN
  -- curriculum_id NOT NULL 해제 (자유 페이지 허용)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_items'
      AND column_name = 'curriculum_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.curriculum_items ALTER COLUMN curriculum_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_items'
      AND column_name = 'week_number'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.curriculum_items ALTER COLUMN week_number DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_items'
      AND column_name = 'session_number'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.curriculum_items ALTER COLUMN session_number DROP NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_items_public_slug_uniq
  ON public.curriculum_items (public_slug)
  WHERE public_slug IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'public_slug_format'
      AND conrelid = 'public.curriculum_items'::regclass
  ) THEN
    ALTER TABLE public.curriculum_items
      ADD CONSTRAINT public_slug_format
      CHECK (public_slug IS NULL OR public_slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$');
  END IF;
END $$;

-- ─── 2. student_lesson_assignments 신설 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_lesson_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  curriculum_item_id UUID NOT NULL REFERENCES public.curriculum_items(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  released_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'released', 'completed')),
  variant TEXT NOT NULL DEFAULT 'default',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, curriculum_item_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS sla_profile_date_idx
  ON public.student_lesson_assignments (profile_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS sla_date_profile_idx
  ON public.student_lesson_assignments (scheduled_date, profile_id);
CREATE INDEX IF NOT EXISTS sla_item_idx
  ON public.student_lesson_assignments (curriculum_item_id);

ALTER TABLE public.student_lesson_assignments DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS sla_updated_at ON public.student_lesson_assignments;
CREATE TRIGGER sla_updated_at BEFORE UPDATE ON public.student_lesson_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. 데이터 백필 ──────────────────────────────────────────────────────────

-- 3-1. student_curriculum_links 펼침 (가장 큰 케이스)
INSERT INTO public.student_lesson_assignments
  (profile_id, curriculum_item_id, scheduled_date, released_at, status, variant)
SELECT
  scl.profile_id,
  ci.id,
  ci.publish_date,
  CASE WHEN COALESCE(ci.is_released, FALSE)
       THEN ci.publish_date::timestamptz + INTERVAL '12 hours'
       ELSE NULL END,
  CASE WHEN COALESCE(ci.is_released, FALSE) THEN 'released' ELSE 'pending' END,
  'default'
FROM public.student_curriculum_links scl
JOIN public.curriculum_items ci ON ci.curriculum_id = scl.curriculum_id
WHERE ci.publish_date IS NOT NULL
ON CONFLICT (profile_id, curriculum_item_id, scheduled_date) DO NOTHING;

-- 3-2. student_sessions 보완 (직배정된 케이스)
INSERT INTO public.student_lesson_assignments
  (profile_id, curriculum_item_id, scheduled_date, released_at, status, variant)
SELECT
  ss.profile_id,
  ci.id,
  COALESCE(ss.publish_date, ci.publish_date),
  CASE WHEN COALESCE(ss.is_released, FALSE)
       THEN COALESCE(ss.publish_date, ci.publish_date)::timestamptz + INTERVAL '12 hours'
       ELSE NULL END,
  CASE WHEN COALESCE(ss.is_released, FALSE) THEN 'released' ELSE 'pending' END,
  COALESCE(ss.variant, 'default')
FROM public.student_sessions ss
JOIN public.curricula c ON c.subject_slug = ss.subject_slug
JOIN public.curriculum_items ci
  ON ci.curriculum_id = c.id
  AND ci.week_number = ss.week_number
  AND ci.session_number = ss.session_number
WHERE COALESCE(ss.publish_date, ci.publish_date) IS NOT NULL
ON CONFLICT (profile_id, curriculum_item_id, scheduled_date) DO NOTHING;

-- 3-3. block_assignments 보완 (3세대 모델에서만 배정된 케이스)
-- block_assignments.content_block_id → content_blocks.subject_slug + ba.slot_label 파싱 → curriculum_items 매칭
INSERT INTO public.student_lesson_assignments
  (profile_id, curriculum_item_id, scheduled_date, released_at, status, variant)
SELECT
  ba.profile_id,
  ci.id,
  ba.scheduled_date,
  CASE WHEN COALESCE(ba.is_released, FALSE)
       THEN ba.scheduled_date::timestamptz + INTERVAL '12 hours'
       ELSE NULL END,
  CASE WHEN COALESCE(ba.is_released, FALSE) THEN 'released' ELSE 'pending' END,
  COALESCE(ba.variant, 'default')
FROM public.block_assignments ba
JOIN public.content_blocks cb ON cb.id = ba.content_block_id
CROSS JOIN LATERAL (
  SELECT
    NULLIF(substring(ba.slot_label FROM '^(\d+)주'), '')::INT AS w,
    NULLIF(substring(ba.slot_label FROM '(\d+)차시'), '')::INT AS s
) p
JOIN public.curricula c ON c.subject_slug = cb.subject_slug
JOIN public.curriculum_items ci
  ON ci.curriculum_id = c.id
  AND ci.week_number = p.w
  AND ci.session_number = p.s
WHERE p.w IS NOT NULL AND p.s IS NOT NULL AND ba.scheduled_date IS NOT NULL
ON CONFLICT (profile_id, curriculum_item_id, scheduled_date) DO NOTHING;

-- ─── 4. public_slug 폴백 채움 (CLI 명시 슬러그가 우선, 미지정만 자동) ─────────
UPDATE public.curriculum_items ci
SET public_slug = lower(c.subject_slug)
                  || '-w' || ci.week_number
                  || '-s' || ci.session_number
                  || '-' || substring(ci.id::text, 1, 6)
FROM public.curricula c
WHERE c.id = ci.curriculum_id
  AND ci.public_slug IS NULL
  AND ci.week_number IS NOT NULL
  AND ci.session_number IS NOT NULL;

-- ─── 5. 검증 (참고용 - 결과만 메시지) ───────────────────────────────────────
DO $$
DECLARE
  v_sla_students INT;
  v_scl_students INT;
  v_dup_slugs INT;
  v_null_slugs INT;
BEGIN
  SELECT COUNT(DISTINCT profile_id) INTO v_sla_students FROM public.student_lesson_assignments;
  SELECT COUNT(DISTINCT profile_id) INTO v_scl_students FROM public.student_curriculum_links;
  SELECT COUNT(*) INTO v_dup_slugs FROM (
    SELECT public_slug FROM public.curriculum_items
    WHERE public_slug IS NOT NULL
    GROUP BY public_slug HAVING COUNT(*) > 1
  ) d;
  SELECT COUNT(*) INTO v_null_slugs FROM public.curriculum_items
    WHERE public_slug IS NULL
      AND week_number IS NOT NULL
      AND session_number IS NOT NULL;

  RAISE NOTICE 'Migration check:';
  RAISE NOTICE '  - SLA distinct students: %', v_sla_students;
  RAISE NOTICE '  - SCL distinct students: % (SLA should be >= SCL)', v_scl_students;
  RAISE NOTICE '  - Duplicate public_slugs: % (should be 0)', v_dup_slugs;
  RAISE NOTICE '  - NULL public_slugs on week/session pages: % (should be 0)', v_null_slugs;

  IF v_dup_slugs > 0 THEN
    RAISE EXCEPTION 'Duplicate public_slugs detected - aborting';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- 검증 쿼리 (실행 후 수동으로 돌려보세요)
-- ============================================================================
-- -- 학생 수 보존 확인
-- SELECT COUNT(DISTINCT profile_id) AS sla_students FROM student_lesson_assignments;
-- SELECT COUNT(DISTINCT profile_id) AS scl_students FROM student_curriculum_links;
--
-- -- 학생 샘플 비교 (이름 바꿔서 실행)
-- SELECT ci.week_number, ci.session_number, ci.label, sla.scheduled_date, sla.status
-- FROM student_lesson_assignments sla
-- JOIN curriculum_items ci ON ci.id = sla.curriculum_item_id
-- WHERE sla.profile_id = (SELECT id FROM profiles WHERE name='송승원' LIMIT 1)
-- ORDER BY sla.scheduled_date;
--
-- -- 슬러그 패턴 확인
-- SELECT subject_slug, public_slug FROM curriculum_items ci
-- JOIN curricula c ON c.id = ci.curriculum_id
-- WHERE public_slug IS NOT NULL
-- ORDER BY subject_slug, week_number, session_number
-- LIMIT 30;
