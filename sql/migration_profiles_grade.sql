-- ───────────────────────────────────────────────────────────
-- Profiles Grade Migration — 학년 컬럼 추가
-- ───────────────────────────────────────────────────────────
-- 배경:
--   /admin/students 학생 현황판에서 학년(고1/고2/고3) 컬럼 표시 필요.
--   기존 profiles 테이블에 학년 정보가 없어서 신규 컬럼 추가.
--
-- 운영:
--   - 기존 row 는 NULL (기존 데이터에 영향 없음)
--   - 신규 등록: `npm run admin:student add ... --grade 2`
--   - 기존 학생 채우기: 사용자가 SQL UPDATE 또는 Supabase UI 로 수동 입력
--   - 어드민 페이지에서는 NULL → "-" 표시

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grade SMALLINT;

-- 도메인 제약: 1, 2, 3 또는 NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_grade_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_grade_check
      CHECK (grade IS NULL OR grade IN (1, 2, 3));
  END IF;
END$$;

COMMENT ON COLUMN public.profiles.grade IS
  '학년: 1=고1, 2=고2, 3=고3 (NULL 허용)';
