-- ───────────────────────────────────────────────────────────
-- Shared Materials Migration — Phase 4
-- 학생 포탈 "기타 자료" 탭: 선생님이 업로드하는 공유 PDF
-- ───────────────────────────────────────────────────────────

-- Cleanup: 이전 실패한 시도에서 남았을 수 있는 명명된 CHECK constraint 제거
-- (IF EXISTS 가드 덕분에 없어도 안전하게 no-op)
ALTER TABLE IF EXISTS public.shared_materials
  DROP CONSTRAINT IF EXISTS shared_materials_audience_check;

-- 테이블 생성 (CHECK constraint는 익명 → 이름 충돌 원천 차단)
CREATE TABLE IF NOT EXISTS public.shared_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,                  -- 관리자가 지정한 자료 제목 (예: "중간고사 핵심 정리")
  description TEXT,                     -- 선택 설명
  original_filename TEXT NOT NULL,      -- 원본 파일명
  storage_path TEXT NOT NULL,           -- Bunny Storage 경로
  cdn_url TEXT NOT NULL,                -- Bunny CDN URL
  file_size_bytes INTEGER,

  -- 타겟 audience: 전체(all) / 특정 학생(student) / 특정 커리큘럼(curriculum)
  audience TEXT NOT NULL CHECK (audience IN ('all', 'student', 'curriculum')),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE CASCADE,

  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- 정합성 제약: audience 값에 따라 ID 필드 요구 (익명 CHECK → 이름 자동 생성)
  CHECK (
    (audience = 'all' AND profile_id IS NULL AND curriculum_id IS NULL)
    OR (audience = 'student' AND profile_id IS NOT NULL AND curriculum_id IS NULL)
    OR (audience = 'curriculum' AND curriculum_id IS NOT NULL AND profile_id IS NULL)
  )
);

-- 자주 쓰는 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_shared_materials_audience ON public.shared_materials(audience);
CREATE INDEX IF NOT EXISTS idx_shared_materials_profile ON public.shared_materials(profile_id);
CREATE INDEX IF NOT EXISTS idx_shared_materials_curriculum ON public.shared_materials(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_shared_materials_uploaded_at ON public.shared_materials(uploaded_at DESC);

ALTER TABLE public.shared_materials DISABLE ROW LEVEL SECURITY;
