-- ============================================================================
-- v3 시즌 리셋: 옛 시즌 archive + 새 시즌 3개 + 페이지 메타 신규 생성
-- ============================================================================
-- 운영 학생 영향:
--   - 옛 student_session route fallback은 student_curriculum_links 통해 옛 시즌만 매칭
--   - 모든 SS 보유 학생은 SCL≥1 (옛 시즌만 등록) → 새 시즌 페이지로 fallback 매칭 안 됨
--   - archive 처리는 curricula.archived_at NOT NULL → 옛 코드는 이 컬럼 안 봄 → 무영향
-- ============================================================================

BEGIN;

-- 0. curriculum_items UNIQUE 제약 제거 (v3는 같은 차시에 unit/category/variant 다중 row 허용)
ALTER TABLE public.curriculum_items
  DROP CONSTRAINT IF EXISTS curriculum_items_curriculum_id_week_number_session_number_key;

-- 1. curricula.archived_at 컬럼 추가
ALTER TABLE public.curricula
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. 옛 시즌 전부 archive
UPDATE public.curricula
SET archived_at = NOW()
WHERE archived_at IS NULL;

-- 3. 새 시즌 3개 생성
INSERT INTO public.curricula (title, subject_slug, start_date, description)
VALUES
  ('[공수1] 기말 전반전', 'gs1', '2026-05-04', '공수1 기말고사 대비 전반전 (3주 6차시)'),
  ('[공수2] 기말 전반전', 'gs2', '2026-05-04', '공수2 기말고사 대비 전반전 (3주 6차시)'),
  ('[대수] 기말 전반전', 'ds2', '2026-05-04', '대수 기말고사 대비 전반전 (3주 6차시)');

-- 4. 새 시즌의 페이지 메타 INSERT (콘텐츠는 추후 CLI로 업로드)
WITH new_seasons AS (
  SELECT id, title, subject_slug, start_date FROM public.curricula
  WHERE subject_slug IN ('gs1', 'gs2', 'ds2')
    AND archived_at IS NULL
    AND title LIKE '%[%기말 전반전%'
)

-- 공수1 페이지 8개 (publish_date는 시즌 시작일로 채움. 운영자가 나중에 정확히 수정)
INSERT INTO public.curriculum_items
  (curriculum_id, week_number, session_number, unit_name, category, variant_label, label, sort_order, publish_date, is_released)
SELECT s.id, v.week_number, v.session_number, v.unit_name, v.category, v.variant_label, v.label, v.sort_order, s.start_date, FALSE
FROM new_seasons s
CROSS JOIN (VALUES
  (1, 1, '여러가지 방정식·부등식', 'gichul',  'A',  '1주 1차시 · A버전',       1),
  (1, 1, '여러가지 방정식·부등식', 'gichul',  'B',  '1주 1차시 · B버전',       2),
  (1, 2, '여러가지 방정식·부등식', 'shimhwa', 'A',  '1주 2차시 심화 · A버전',  1),
  (1, 2, '여러가지 방정식·부등식', 'shimhwa', 'B',  '1주 2차시 심화 · B버전',  2),
  (2, 3, '경우의 수',             'gichul',  NULL, '2주 3차시',              1),
  (2, 4, '경우의 수',             'shimhwa', NULL, '2주 4차시 심화 (미생성)', 1),
  (3, 5, '행렬',                  'gichul',  NULL, '3주 5차시',              1),
  (3, 6, '행렬',                  'shimhwa', NULL, '3주 6차시 심화',          1)
) AS v(week_number, session_number, unit_name, category, variant_label, label, sort_order)
WHERE s.subject_slug = 'gs1';

-- 대수 페이지 10개
WITH ds2_season AS (
  SELECT id, start_date FROM public.curricula
  WHERE subject_slug = 'ds2' AND archived_at IS NULL AND title LIKE '%기말 전반전%'
  LIMIT 1
)
INSERT INTO public.curriculum_items
  (curriculum_id, week_number, session_number, unit_name, category, variant_label, label, sort_order, publish_date, is_released)
SELECT s.id, v.week_number, v.session_number, v.unit_name, v.category, v.variant_label, v.label, v.sort_order, s.start_date, FALSE
FROM ds2_season s
CROSS JOIN (VALUES
  (1, 1, '삼각함수 활용',  'gichul',  NULL, '1주 1차시',              1),
  (1, 2, '삼각함수 활용',  'shimhwa', NULL, '1주 2차시 심화',         1),
  (2, 3, '등차수열',       'gichul',  NULL, '2주 3차시 등차수열',     1),
  (2, 3, '등비수열',       'gichul',  NULL, '2주 3차시 등비수열',     2),
  (2, 4, '등차수열',       'shimhwa', NULL, '2주 4차시 등차수열 심화', 1),
  (2, 4, '등비수열',       'shimhwa', NULL, '2주 4차시 등비수열 심화', 2),
  (3, 5, '수학적귀납법',   'gichul',  NULL, '3주 5차시',              1),
  (3, 6, '수열의 합',       'gichul',  NULL, '3주 6차시 수열의 합',    1),
  (3, 6, '수학적귀납법',   'shimhwa', NULL, '3주 6차시 귀납법 심화',  2),
  (3, 6, '수열의 합',       'shimhwa', NULL, '3주 6차시 수열의합 심화', 3)
) AS v(week_number, session_number, unit_name, category, variant_label, label, sort_order);

-- 5. public_slug 자동 채움 (이미 v2 마이그레이션에서 매겨졌음. 신 row만 폴백)
UPDATE public.curriculum_items ci
SET public_slug = lower(c.subject_slug)
                  || '-finale-w' || ci.week_number
                  || '-s' || ci.session_number
                  || CASE WHEN ci.variant_label IS NOT NULL THEN '-' || lower(ci.variant_label) ELSE '' END
                  || '-' || substring(ci.id::text, 1, 6)
FROM public.curricula c
WHERE c.id = ci.curriculum_id
  AND ci.public_slug IS NULL
  AND ci.archived_at IS NULL;

-- 6. 검증
DO $$
DECLARE
  v_arch_seasons INT;
  v_active_seasons INT;
  v_active_items INT;
BEGIN
  SELECT COUNT(*) INTO v_arch_seasons FROM public.curricula WHERE archived_at IS NOT NULL;
  SELECT COUNT(*) INTO v_active_seasons FROM public.curricula WHERE archived_at IS NULL;
  SELECT COUNT(*) INTO v_active_items FROM public.curriculum_items WHERE archived_at IS NULL;
  RAISE NOTICE 'v3 seasons reset:';
  RAISE NOTICE '  - archived seasons: %', v_arch_seasons;
  RAISE NOTICE '  - active seasons (new): % (expected 3)', v_active_seasons;
  RAISE NOTICE '  - active curriculum_items (new): % (expected 18: gs1=8, ds2=10, gs2=0)', v_active_items;
END $$;

COMMIT;
