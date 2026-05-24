-- 교재(textbook) 카탈로그 + (교재 × 차시) 쪽수 + 학생 주교재
-- 개념강의 Step 3 "교재 복습"을 학생이 쓰는 교재별 쪽수로 표시하기 위한 스키마.

-- 1) 교재 카탈로그
CREATE TABLE IF NOT EXISTS public.textbooks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_slug TEXT NOT NULL,           -- gs1, gs2, ds2 ...
  name         TEXT NOT NULL,           -- '유형서 기본','개념서','심화유형서','개념+유형 라이트'
  order_index  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subject_slug, name)
);

-- 2) (교재 × 차시) 쪽수 매핑 — learning_set 차시에 대응
CREATE TABLE IF NOT EXISTS public.textbook_chapter_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id     UUID NOT NULL REFERENCES public.textbooks(id) ON DELETE CASCADE,
  learning_set_id UUID NOT NULL REFERENCES public.learning_sets(id) ON DELETE CASCADE,
  page_start      INTEGER,
  page_end        INTEGER,             -- '중단원 등반' 포함: 보통 다음 단원 시작쪽 − 1
  note            TEXT,                -- 예외 케이스 메모 (선택)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (textbook_id, learning_set_id)
);

CREATE INDEX IF NOT EXISTS tcp_textbook_idx ON public.textbook_chapter_pages (textbook_id);
CREATE INDEX IF NOT EXISTS tcp_set_idx      ON public.textbook_chapter_pages (learning_set_id);

-- 3) 학생 주교재 (과목별 1권)
CREATE TABLE IF NOT EXISTS public.student_textbooks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_slug TEXT NOT NULL,
  textbook_id  UUID NOT NULL REFERENCES public.textbooks(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, subject_slug)
);

CREATE INDEX IF NOT EXISTS st_profile_idx ON public.student_textbooks (profile_id);

-- 4) 차시별 교재 override (선택) — 없으면 학생 주교재 사용
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS textbook_id UUID REFERENCES public.textbooks(id) ON DELETE SET NULL;
