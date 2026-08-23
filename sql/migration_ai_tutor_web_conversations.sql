-- ============================================================================
-- Migration: Web AI Tutor conversation/token persistence
-- ============================================================================
-- Additive and unapplied. Creates server-only web Tutor tables keyed by portal
-- profile context plus student lesson assignment. Existing Google Chat Tutor
-- tables, functions, buckets, and repositories are intentionally untouched.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_tutor_web_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.student_lesson_assignments(id) ON DELETE CASCADE,
  context_key TEXT NOT NULL CHECK (context_key <> ''),
  active_material_key TEXT CHECK (active_material_key IS NULL OR active_material_key <> ''),
  active_problem_key TEXT CHECK (active_problem_key IS NULL OR active_problem_key <> ''),
  active_stage TEXT CHECK (active_stage IS NULL OR active_stage <> ''),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_content_deleted_at TIMESTAMPTZ,
  metadata_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, assignment_id),
  UNIQUE (id, profile_id, assignment_id)
);

CREATE TABLE IF NOT EXISTS public.ai_tutor_web_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_tutor_web_conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.student_lesson_assignments(id) ON DELETE CASCADE,
  CONSTRAINT ai_tutor_web_turns_conversation_scope_fkey
    FOREIGN KEY (conversation_id, profile_id, assignment_id)
    REFERENCES public.ai_tutor_web_conversations(id, profile_id, assignment_id)
    ON DELETE CASCADE,
  request_id TEXT NOT NULL CHECK (request_id <> ''),
  target_material_key TEXT NOT NULL CHECK (target_material_key <> ''),
  target_problem_key TEXT CHECK (target_problem_key IS NULL OR target_problem_key <> ''),
  target_stage TEXT CHECK (target_stage IS NULL OR target_stage <> ''),
  mode TEXT NOT NULL
    CHECK (mode IN ('hint', 'start', 'decisive', 'solution', 'followup', 'alternate')),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  question_text TEXT,
  answer_text TEXT,
  provider TEXT CHECK (provider IS NULL OR provider <> ''),
  model_alias TEXT CHECK (model_alias IS NULL OR model_alias <> ''),
  prompt_version TEXT CHECK (prompt_version IS NULL OR prompt_version <> ''),
  input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
  total_tokens INTEGER CHECK (total_tokens IS NULL OR total_tokens >= 0),
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count >= 1 AND attempt_count <= 3),
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  needs_teacher_review BOOLEAN NOT NULL DEFAULT FALSE,
  error_category TEXT CHECK (error_category IS NULL OR error_category <> ''),
  raw_content_deleted_at TIMESTAMPTZ,
  metadata_deleted_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (question_text IS NULL OR length(question_text) <= 4000),
  CHECK (answer_text IS NULL OR length(answer_text) <= 4000),
  CHECK (
    total_tokens IS NULL
    OR input_tokens IS NULL
    OR output_tokens IS NULL
    OR total_tokens = input_tokens + output_tokens
  ),
  UNIQUE (profile_id, assignment_id, request_id)
);

ALTER TABLE public.ai_tutor_web_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_web_turns ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ai_tutor_web_conversations_profile_assignment_idx
  ON public.ai_tutor_web_conversations (profile_id, assignment_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS ai_tutor_web_turns_conversation_recent_idx
  ON public.ai_tutor_web_turns (conversation_id, received_at DESC);

CREATE INDEX IF NOT EXISTS ai_tutor_web_turns_profile_assignment_recent_idx
  ON public.ai_tutor_web_turns (profile_id, assignment_id, received_at DESC);

CREATE INDEX IF NOT EXISTS ai_tutor_web_turns_review_queue_idx
  ON public.ai_tutor_web_turns (needs_teacher_review, received_at DESC)
  WHERE needs_teacher_review = TRUE;

CREATE INDEX IF NOT EXISTS ai_tutor_web_turns_retention_idx
  ON public.ai_tutor_web_turns (
    raw_content_deleted_at,
    metadata_deleted_at,
    received_at
  );

COMMENT ON TABLE public.ai_tutor_web_conversations IS
  'Server-only web AI Tutor conversations attributed to portal profile context and assignment.';

COMMENT ON TABLE public.ai_tutor_web_turns IS
  'Server-only web AI Tutor turns with bounded raw content, usage metadata, review/error state, and retention markers.';

COMMIT;
