-- 4개 시즌 추가 (페이지 0개 — 단원 정보 추가될 때 페이지 메타 INSERT)
BEGIN;

INSERT INTO public.curricula (title, subject_slug, start_date, description)
VALUES
  ('[공수1] 중간 전반전', 'gs1', '2026-03-30', '공수1 중간고사 대비 전반전 (3주 6차시)'),
  ('[공수2] 중간 전반전', 'gs2', '2026-03-30', '공수2 중간고사 대비 전반전 (3주 6차시)'),
  ('[공수2] 기말 전반전 (페이지 추가 예정)', 'gs2', '2026-05-04', '단원 구성 미정 — 운영자 입력 대기'),
  ('[대수]  중간 전반전', 'ds2', '2026-03-30', '대수 중간고사 대비 전반전 (3주 6차시)');

-- 검증
DO $$
DECLARE v_seasons INT;
BEGIN
  SELECT COUNT(*) INTO v_seasons FROM public.curricula WHERE archived_at IS NULL;
  RAISE NOTICE 'active seasons total: % (expected 7: 기존 3 + 신규 4)', v_seasons;
END $$;

COMMIT;
