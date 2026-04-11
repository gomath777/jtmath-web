-- Student Portal Migration
-- 학생 포탈: 토큰 기반 접근, 커리큘럼 배정, 오답지 관리

-- 1. student_tokens: 학생 고유 URL 토큰
CREATE TABLE IF NOT EXISTS public.student_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  birth_pin TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_tokens_slug ON public.student_tokens(slug);
CREATE INDEX IF NOT EXISTS idx_student_tokens_profile ON public.student_tokens(profile_id);
ALTER TABLE public.student_tokens DISABLE ROW LEVEL SECURITY;

-- 2. student_curriculum_links: 학생-커리큘럼 배정
CREATE TABLE IF NOT EXISTS public.student_curriculum_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES public.curricula(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, curriculum_id)
);

CREATE INDEX IF NOT EXISTS idx_scl_profile ON public.student_curriculum_links(profile_id);
CREATE INDEX IF NOT EXISTS idx_scl_curriculum ON public.student_curriculum_links(curriculum_id);
ALTER TABLE public.student_curriculum_links DISABLE ROW LEVEL SECURITY;

-- 3. odapji_files: 오답지 파일 추적
CREATE TABLE IF NOT EXISTS public.odapji_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  cdn_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odapji_profile ON public.odapji_files(profile_id);
ALTER TABLE public.odapji_files DISABLE ROW LEVEL SECURITY;

-- 4. curriculum_items에 is_released 컬럼 추가
ALTER TABLE public.curriculum_items ADD COLUMN IF NOT EXISTS is_released BOOLEAN DEFAULT FALSE;
