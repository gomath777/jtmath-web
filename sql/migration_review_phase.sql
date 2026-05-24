-- ───────────────────────────────────────────────────────────
-- Review Phase Migration
-- 학생별 "기말 마무리 단계"(전체 오답 반복 · 취약유형 보충 · 모의내신) 시작일.
-- 캘린더에 시작일 ~ exam_date_final(미정이면 오픈엔드) 연속 배너로 표시.
-- ───────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS review_phase_start DATE;
