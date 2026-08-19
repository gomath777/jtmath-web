-- ============================================================================
-- Migration: Google Chat AI Tutor MVP private persistence
-- ============================================================================
-- Additive only. This creates server-only tutor tables plus one private Supabase
-- Storage bucket. No existing Mathgo tables are altered.
-- ============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-tutor-private',
  'ai-tutor-private',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[],
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS public.ai_tutor_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_user_name TEXT NOT NULL UNIQUE CHECK (chat_user_name ~ '^users/[A-Za-z0-9_.-]+$'),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked')),
  pairing_code_hash TEXT CHECK (pairing_code_hash IS NULL OR pairing_code_hash <> ''),
  pairing_code_expires_at TIMESTAMPTZ,
  paired_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'pending' AND profile_id IS NULL)
    OR (status IN ('active', 'revoked') AND profile_id IS NOT NULL)
  ),
  CHECK (
    (status = 'pending' AND pairing_code_hash IS NOT NULL AND pairing_code_expires_at IS NOT NULL)
    OR status IN ('active', 'revoked')
  )
);

CREATE TABLE IF NOT EXISTS public.ai_tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES public.ai_tutor_identities(id) ON DELETE SET NULL,
  chat_space_name TEXT NOT NULL CHECK (chat_space_name <> ''),
  chat_thread_name TEXT,
  channel_type TEXT NOT NULL
    CHECK (channel_type IN ('dm', 'named_space', 'group_space', 'unknown')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (chat_thread_name IS NULL OR chat_thread_name <> '')
);

CREATE TABLE IF NOT EXISTS public.ai_tutor_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.ai_tutor_conversations(id) ON DELETE CASCADE,
  inbound_message_name TEXT NOT NULL UNIQUE CHECK (inbound_message_name <> ''),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed', 'expired', 'unsupported')),
  question_text TEXT,
  answer_text TEXT,
  provider TEXT,
  model_alias TEXT,
  prompt_version TEXT,
  subject_slug TEXT,
  concept_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  error_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  confidence NUMERIC CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  needs_teacher_review BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_reason TEXT,
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
  raw_content_deleted_at TIMESTAMPTZ,
  image_deleted_at TIMESTAMPTZ,
  metadata_deleted_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (question_text IS NULL OR length(question_text) <= 12000),
  CHECK (answer_text IS NULL OR length(answer_text) <= 12000),
  CHECK (prompt_version IS NULL OR prompt_version <> ''),
  CHECK (provider IS NULL OR provider <> ''),
  CHECK (model_alias IS NULL OR model_alias <> '')
);

CREATE TABLE IF NOT EXISTS public.ai_tutor_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id UUID NOT NULL REFERENCES public.ai_tutor_turns(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attachment_resource_name TEXT NOT NULL CHECK (attachment_resource_name <> ''),
  declared_mime_type TEXT NOT NULL
    CHECK (declared_mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  normalized_mime_type TEXT NOT NULL DEFAULT 'image/jpeg'
    CHECK (normalized_mime_type = 'image/jpeg'),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 8388608),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  private_storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'stored'
    CHECK (status IN ('pending', 'stored', 'rejected', 'deleted')),
  rejection_reason TEXT,
  image_deleted_at TIMESTAMPTZ,
  metadata_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (private_storage_path IS NULL OR private_storage_path LIKE 'ai-tutor-private/%')
);

ALTER TABLE public.ai_tutor_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ai_tutor_identities_profile_idx
  ON public.ai_tutor_identities (profile_id)
  WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_tutor_identities_pairing_code_hash_idx
  ON public.ai_tutor_identities (pairing_code_hash, pairing_code_expires_at)
  WHERE status = 'pending' AND pairing_code_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_tutor_conversations_profile_recent_idx
  ON public.ai_tutor_conversations (profile_id, last_seen_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ai_tutor_conversations_profile_channel_key
  ON public.ai_tutor_conversations (
    profile_id,
    chat_space_name,
    COALESCE(chat_thread_name, ''),
    channel_type
  );

CREATE INDEX IF NOT EXISTS ai_tutor_turns_profile_recent_idx
  ON public.ai_tutor_turns (profile_id, received_at DESC);
CREATE INDEX IF NOT EXISTS ai_tutor_turns_review_queue_idx
  ON public.ai_tutor_turns (needs_teacher_review, received_at DESC)
  WHERE needs_teacher_review = TRUE;
CREATE INDEX IF NOT EXISTS ai_tutor_turns_retention_idx
  ON public.ai_tutor_turns (
    raw_content_deleted_at,
    image_deleted_at,
    metadata_deleted_at,
    received_at
  );
CREATE INDEX IF NOT EXISTS ai_tutor_turns_conversation_recent_idx
  ON public.ai_tutor_turns (conversation_id, received_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ai_tutor_attachments_turn_resource_key
  ON public.ai_tutor_attachments (turn_id, attachment_resource_name);
CREATE INDEX IF NOT EXISTS ai_tutor_attachments_profile_retention_idx
  ON public.ai_tutor_attachments (profile_id, image_deleted_at, metadata_deleted_at, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ai_tutor_attachments_private_path_idx
  ON public.ai_tutor_attachments (private_storage_path)
  WHERE private_storage_path IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ai_tutor_claim_inbound_turn(
  p_profile_id UUID,
  p_conversation_id UUID,
  p_inbound_message_name TEXT,
  p_question_text TEXT DEFAULT NULL,
  p_received_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS public.ai_tutor_turns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turn public.ai_tutor_turns;
BEGIN
  INSERT INTO public.ai_tutor_turns (
    profile_id,
    conversation_id,
    inbound_message_name,
    status,
    question_text,
    received_at
  )
  VALUES (
    p_profile_id,
    p_conversation_id,
    p_inbound_message_name,
    'processing',
    p_question_text,
    p_received_at
  )
  ON CONFLICT (inbound_message_name) DO NOTHING
  RETURNING * INTO v_turn;

  IF v_turn.id IS NOT NULL THEN
    RETURN v_turn;
  END IF;

  SELECT *
  INTO v_turn
  FROM public.ai_tutor_turns
  WHERE inbound_message_name = p_inbound_message_name
  FOR UPDATE;

  IF v_turn.profile_id <> p_profile_id THEN
    RAISE EXCEPTION 'ai_tutor_claim_profile_mismatch'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_turn
  FROM public.ai_tutor_turns
  WHERE inbound_message_name = p_inbound_message_name
    AND profile_id = p_profile_id
  FOR UPDATE;

  IF v_turn.id IS NULL THEN
    RAISE EXCEPTION 'ai_tutor_claim_missing_turn'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_turn;
END;
$$;

COMMIT;
