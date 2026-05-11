-- ============================================================================
-- v3 Migration: 시즌 → 단원 → 차시(category) → 변형(variant_label) 구조
-- ============================================================================
-- 목적:
--   1. curriculum_items 에 unit_name / category / variant_label / sort_order / archived_at 컬럼 추가
--   2. 기존 43개 row archive (운영 데이터 보존, 새 카탈로그·SLA 펼침 대상에서 제외)
--   3. student_curriculum_links 에 enrolled_at 추가 (시즌 일괄 등록 시각 기록)
--
-- 영향: 옛 /s 운영은 student_sessions / block_assignments 기반 → 무영향.
-- 신 /st 운영은 SLA 기반 → archive=NOT NULL 시 자동 펼침 대상에서 제외.
-- ============================================================================

BEGIN;

-- 1. curriculum_items 컬럼 추가
ALTER TABLE public.curriculum_items
  ADD COLUMN IF NOT EXISTS unit_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS variant_label TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- category 값 가벼운 검증 (NULL 또는 알려진 값)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'category_known'
      AND conrelid = 'public.curriculum_items'::regclass
  ) THEN
    ALTER TABLE public.curriculum_items
      ADD CONSTRAINT category_known
      CHECK (category IS NULL OR category IN ('gichul', 'shimhwa', 'review', 'concept', 'bonus'));
  END IF;
END $$;

-- variant_label 가벼운 검증 (NULL 또는 짧은 라벨)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'variant_label_length'
      AND conrelid = 'public.curriculum_items'::regclass
  ) THEN
    ALTER TABLE public.curriculum_items
      ADD CONSTRAINT variant_label_length
      CHECK (variant_label IS NULL OR (length(variant_label) BETWEEN 1 AND 20));
  END IF;
END $$;

-- 카탈로그 조회용 인덱스
CREATE INDEX IF NOT EXISTS curriculum_items_active_idx
  ON public.curriculum_items (curriculum_id, week_number, session_number)
  WHERE archived_at IS NULL;

-- 2. 기존 43개 row archive
UPDATE public.curriculum_items
SET archived_at = NOW()
WHERE archived_at IS NULL;

-- 3. student_curriculum_links 컬럼 추가 (이미 있으면 스킵)
ALTER TABLE public.student_curriculum_links
  ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ DEFAULT NOW();

-- 4. 검증 NOTICE
DO $$
DECLARE
  v_archived INT;
  v_active INT;
BEGIN
  SELECT COUNT(*) INTO v_archived FROM public.curriculum_items WHERE archived_at IS NOT NULL;
  SELECT COUNT(*) INTO v_active FROM public.curriculum_items WHERE archived_at IS NULL;
  RAISE NOTICE 'v3 migration:';
  RAISE NOTICE '  - curriculum_items archived: %', v_archived;
  RAISE NOTICE '  - curriculum_items active: % (should be 0; 운영자가 신규 생성 예정)', v_active;
END $$;

COMMIT;
