-- ================================================================
-- jtmath Learning Sets Migration
-- 실행: Supabase SQL Editor에 붙여넣기
-- ================================================================

-- 1. exam_videos: 기존 테이블에 누락 컬럼 추가 (이미 존재하는 테이블)
ALTER TABLE public.exam_videos
  ADD COLUMN IF NOT EXISTS is_chapter_summary BOOLEAN DEFAULT FALSE;

-- 매칭용 인덱스 추가
CREATE INDEX IF NOT EXISTS exam_videos_lookup_idx
  ON public.exam_videos (subject_slug, year, month, grade, problem)
  WHERE year IS NOT NULL;

-- 2. learning_sets: 재사용 가능한 콘텐츠 라이브러리
CREATE TABLE IF NOT EXISTS public.learning_sets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT NOT NULL,                   -- "복소수 레벨3 8문제"
  description     TEXT,
  subject_slug    TEXT,                            -- 'gs1', 'ds2' 등 (NULL이면 혼합)
  pdf_url         TEXT,                            -- Supabase Storage URL
  pdf_filename    TEXT,                            -- 원본 파일명
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.learning_sets DISABLE ROW LEVEL SECURITY;

-- 3. learning_set_videos: learning set 안의 문제별 영상 목록
CREATE TABLE IF NOT EXISTS public.learning_set_videos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id          UUID REFERENCES public.learning_sets(id) ON DELETE CASCADE,
  problem_number  INTEGER NOT NULL,                -- PDF 상의 문제 번호 (01, 02...)
  exam_video_id   UUID REFERENCES public.exam_videos(id) ON DELETE SET NULL,
  bunny_video_id  TEXT,                            -- 직접 참조용 (exam_video_id 없을 때 fallback)
  title           TEXT NOT NULL,                   -- "25년 9월 고1 15번 해설강의"
  is_matched      BOOLEAN DEFAULT FALSE,           -- 자동 매칭 성공 여부
  order_index     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS lsv_set_idx ON public.learning_set_videos (set_id);

ALTER TABLE public.learning_set_videos DISABLE ROW LEVEL SECURITY;

-- 4. assignments: learning set을 학생/과목에 배정
CREATE TABLE IF NOT EXISTS public.assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id          UUID REFERENCES public.learning_sets(id) ON DELETE CASCADE,
  -- 배정 대상 (둘 다 NULL이면 전체 공개, 아니면 OR 조건으로 해석)
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,   -- 특정 학생
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE,    -- 특정 과목 수강생 전체
  -- 표시 설정
  label           TEXT,                            -- "1주차 1차시" / "보충자료"
  published_at    TIMESTAMPTZ,                     -- NULL이면 미발행, 날짜 이후 공개
  -- 주차 정보 (정규 차시인 경우)
  week_number     INTEGER,
  session_number  INTEGER,                         -- 1차시 or 2차시
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assignments_user_idx ON public.assignments (user_id);
CREATE INDEX IF NOT EXISTS assignments_course_idx ON public.assignments (course_id);
CREATE INDEX IF NOT EXISTS assignments_set_idx ON public.assignments (set_id);

ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;

-- 5. video_watch_progress: 학생별 영상 시청 기록
CREATE TABLE IF NOT EXISTS public.video_watch_progress (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  bunny_video_id  TEXT NOT NULL,
  watch_percent   INTEGER DEFAULT 0,               -- 0~100
  completed       BOOLEAN DEFAULT FALSE,           -- 80% 이상 시청 시 TRUE
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, bunny_video_id)
);

CREATE INDEX IF NOT EXISTS vwp_user_idx ON public.video_watch_progress (user_id);

ALTER TABLE public.video_watch_progress DISABLE ROW LEVEL SECURITY;
