-- ============================================================================
-- Rollback: Lesson Pages + Student-Page Assignments
-- ============================================================================
-- 신 모델 코드가 운영 중일 때 실행하면 학생 대시보드가 빈 화면이 됩니다.
-- 반드시 신 코드를 먼저 Vercel rollback 한 뒤 실행하세요.

BEGIN;

DROP TABLE IF EXISTS public.student_lesson_assignments;

DROP INDEX IF EXISTS curriculum_items_public_slug_uniq;
ALTER TABLE public.curriculum_items DROP CONSTRAINT IF EXISTS public_slug_format;
ALTER TABLE public.curriculum_items DROP COLUMN IF EXISTS public_slug;
ALTER TABLE public.curriculum_items DROP COLUMN IF EXISTS title;

-- NOTE: nullable 해제는 데이터에 영향이 없으므로 그대로 둡니다.
-- 만약 원상복구가 필요하면 다음 주석 해제 (단, NULL row 가 있으면 실패):
-- ALTER TABLE public.curriculum_items ALTER COLUMN curriculum_id SET NOT NULL;
-- ALTER TABLE public.curriculum_items ALTER COLUMN week_number SET NOT NULL;
-- ALTER TABLE public.curriculum_items ALTER COLUMN session_number SET NOT NULL;

COMMIT;
