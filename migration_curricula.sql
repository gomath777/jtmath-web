-- 커리큘럼 (주차별 학습 계획)
CREATE TABLE IF NOT EXISTS public.curricula (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT NOT NULL,                    -- "[공수1] 중간기말 전반전 델타1"
  description     TEXT,
  subject_slug    TEXT,                             -- gs1, gs2, ds2, ms1
  schedule_pattern TEXT DEFAULT 'sun_wed',          -- 'sun_wed' = 일/수, 'mon_thu' = 월/목
  start_date      DATE NOT NULL,                    -- 첫 차시 공개일
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 커리큘럼 차시 (주차별 learning set 연결)
CREATE TABLE IF NOT EXISTS public.curriculum_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curriculum_id   UUID REFERENCES public.curricula(id) ON DELETE CASCADE,
  set_id          UUID REFERENCES public.learning_sets(id) ON DELETE SET NULL,
  week_number     INTEGER NOT NULL,                 -- 1, 2, 3, 4
  session_number  INTEGER NOT NULL,                 -- 1=교육청기출(일), 2=심화유형(수)
  label           TEXT,                             -- "다항식 나머지정리", "복소수와 이차방정식"
  publish_date    DATE NOT NULL,                    -- 자동 계산된 공개일
  order_index     INTEGER DEFAULT 0,
  UNIQUE(curriculum_id, week_number, session_number)
);

CREATE INDEX idx_curriculum_items_curriculum ON public.curriculum_items(curriculum_id);

-- assignments에 curriculum 참조 추가
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS curriculum_item_id UUID REFERENCES public.curriculum_items(id) ON DELETE SET NULL;
