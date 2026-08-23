-- ============================================================================
-- Rollback: Web AI Tutor conversation/token persistence
-- ============================================================================
-- Drops only web Tutor owned tables. Existing Google Chat AI Tutor persistence
-- and storage objects are intentionally untouched.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.ai_tutor_web_turns;
DROP TABLE IF EXISTS public.ai_tutor_web_conversations;

COMMIT;
