-- ═══════════════════════════════════════════════════════════════
-- lesson_progress 테이블: 학생별 영상 시청 위치 저장
-- Supabase SQL Editor → 새 탭 → 붙여넣기 → Run
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id     UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  position_secs INTEGER DEFAULT 0,      -- 마지막 시청 위치 (초)
  duration_secs INTEGER DEFAULT 0,      -- 영상 전체 길이 (초)
  completed     BOOLEAN DEFAULT FALSE,  -- 90% 이상 시청 시 완료 처리
  last_watched  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_progress DISABLE ROW LEVEL SECURITY;

-- 확인 쿼리
SELECT 'lesson_progress table created!' AS status;
