-- ============================================================================
-- Rollback: Google Chat AI Tutor MVP private persistence
-- ============================================================================
-- Drops only tutor-owned function/tables. The private bucket is removed only
-- when it is empty; storage objects are never deleted here.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.ai_tutor_claim_inbound_turn(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TIMESTAMPTZ
);

DROP TABLE IF EXISTS public.ai_tutor_attachments;
DROP TABLE IF EXISTS public.ai_tutor_turns;
DROP TABLE IF EXISTS public.ai_tutor_conversations;
DROP TABLE IF EXISTS public.ai_tutor_identities;

DELETE FROM storage.buckets
WHERE id = 'ai-tutor-private'
  AND NOT EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE bucket_id = 'ai-tutor-private'
  );

COMMIT;
