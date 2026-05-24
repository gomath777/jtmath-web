-- 과목별 기본 교재 — 학생이 주교재를 명시 지정하지 않으면 이 교재로 폴백.
ALTER TABLE public.textbooks
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- 과목당 기본 교재는 1개만
CREATE UNIQUE INDEX IF NOT EXISTS textbooks_one_default_per_subject
  ON public.textbooks (subject_slug) WHERE is_default;

-- gs1 기본 교재 = 개념서
UPDATE public.textbooks SET is_default = true
  WHERE subject_slug = 'gs1' AND name = '개념서';
