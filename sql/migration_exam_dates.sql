-- ───────────────────────────────────────────────────────────
-- Exam Dates Migration — Phase 5
-- 학생별 중간/기말고사 시험일 컬럼 추가
-- 대시보드에 "D-N일" 카운트다운 뱃지 표시 용도
-- ───────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exam_date_midterm DATE,
  ADD COLUMN IF NOT EXISTS exam_date_final DATE;

-- 빠른 조회용 인덱스 (다가오는 시험일 검색)
CREATE INDEX IF NOT EXISTS idx_profiles_exam_midterm ON public.profiles(exam_date_midterm);
CREATE INDEX IF NOT EXISTS idx_profiles_exam_final ON public.profiles(exam_date_final);
